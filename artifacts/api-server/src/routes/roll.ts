import { getAuth } from "@clerk/express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import {
  activitiesTable,
  assetsTable,
  budgetsTable,
  cashFlowEntriesTable,
  contractsTable,
  decisionsTable,
  db,
  expensesTable,
  financialHealthHistoryTable,
  paymentRequestsTable,
  paymentsTable,
  projectsTable,
  usersTable,
  type ContractPaymentRecord,
} from "@workspace/db";
import {
  ApproveDecisionParams,
  CreateAssetBody,
  CreateAssetParams,
  CreateBudgetBody,
  CreateBudgetParams,
  CreateContractBody,
  CreateContractParams,
  CreateExpenseBody,
  CreateExpenseParams,
  CreatePaymentBody,
  CreatePaymentParams,
  CreatePaymentRequestBody,
  CreatePaymentRequestParams,
  CreateProjectBody,
  DeleteProjectParams,
  GetCashFlowParams,
  GetFinancialHealthParams,
  GetProjectDashboardParams,
  GetProjectParams,
  ListActivitiesParams,
  ListAssetsParams,
  ListBudgetsParams,
  ListContractsParams,
  ListExpensesParams,
  ListPaymentRequestsParams,
  ListPaymentsParams,
  ProcessPaymentParams,
  RejectDecisionParams,
  SimulateDecisionBody,
  SimulateDecisionParams,
  UpdateBudgetBody,
  UpdateBudgetParams,
  UpdateContractBody,
  UpdateContractParams,
  UpdateExpenseBody,
  UpdateExpenseParams,
  UpdatePaymentRequestBody,
  UpdatePaymentRequestParams,
  UpdateProjectBody,
  UpdateProjectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function authUserId(req: Request): string | null {
  const auth = getAuth(req);
  return (auth.sessionClaims?.userId as string | undefined) ?? auth.userId ?? null;
}

router.use((req, res, next) => {
  const userId = authUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.locals.userId = userId;
  next();
});

async function ownedProject(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return project;
}

async function addActivity(
  projectId: string,
  action: string,
  detail: string,
  actor = "Producer",
) {
  await db.insert(activitiesTable).values({ projectId, action, detail, actor });
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function calendar(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10);
}

function statusOf(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", " ");
}

async function financeFor(projectId: string) {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) return null;

  const [budgetRows, expenseRows, contractRows, paymentRows] = await Promise.all([
    db.select().from(budgetsTable).where(eq(budgetsTable.projectId, projectId)),
    db.select().from(expensesTable).where(eq(expensesTable.projectId, projectId)),
    db.select().from(contractsTable).where(eq(contractsTable.projectId, projectId)),
    db.select().from(paymentsTable).where(eq(paymentsTable.projectId, projectId)),
  ]);

  const paidExpenseIds = new Set(
    paymentRows
      .filter((payment) => statusOf(payment.status) === "paid" && payment.relatedExpenseId)
      .map((payment) => payment.relatedExpenseId),
  );
  const paidExpenses = expenseRows.filter(
    (expense) => statusOf(expense.status) === "paid" || paidExpenseIds.has(expense.id),
  );
  const approvedExpenses = expenseRows.filter(
    (expense) => statusOf(expense.status) === "approved" && !paidExpenseIds.has(expense.id),
  );
  const paidContractAmounts = new Map<string, number>();
  for (const payment of paymentRows) {
    if (statusOf(payment.status) === "paid" && payment.relatedContractId) {
      paidContractAmounts.set(
        payment.relatedContractId,
        (paidContractAmounts.get(payment.relatedContractId) ?? 0) + payment.amount,
      );
    }
  }
  const activeContracts = contractRows.filter((contract) => statusOf(contract.status) === "active");
  const contractCommitted = sum(
    activeContracts.map((contract) =>
      Math.max(0, contract.value - (paidContractAmounts.get(contract.id) ?? 0)),
    ),
  );
  const approvedCommitted = sum(approvedExpenses.map((expense) => expense.amount));
  const paidDirectly = sum(
    paymentRows
      .filter(
        (payment) =>
          statusOf(payment.status) === "paid" &&
          !payment.relatedExpenseId,
      )
      .map((payment) => payment.amount),
  );
  const spent = sum(paidExpenses.map((expense) => expense.amount)) + paidDirectly;
  const committed = contractCommitted + approvedCommitted;
  const actuallyAvailable = project.totalBudget - spent - committed;
  const budgets = budgetRows.map((budget) => {
    const paid = sum(
      paidExpenses
        .filter((expense) => expense.department === budget.department)
        .map((expense) => expense.amount),
    );
    const departmentContracts = activeContracts.filter(
      (contract) => contract.department === budget.department,
    );
    const contractRemaining = sum(
      departmentContracts.map((contract) =>
        Math.max(0, contract.value - (paidContractAmounts.get(contract.id) ?? 0)),
      ),
    );
    const decisionCommitted = sum(
      approvedExpenses
        .filter((expense) => expense.department === budget.department)
        .map((expense) => expense.amount),
    );
    const departmentCommitted = contractRemaining + decisionCommitted;
    const obligated = paid + departmentCommitted;
    return {
      id: budget.id,
      department: budget.department,
      allocated: budget.allocated,
      paid,
      committed: departmentCommitted,
      remaining: budget.allocated - paid - departmentCommitted,
      forecast: Math.max(obligated, budget.allocated * 0.96),
    };
  });
  const totalAllocated = sum(budgetRows.map((budget) => budget.allocated));
  const forecastFinalCost = Math.max(spent + committed, totalAllocated * 0.96);

  return {
    project,
    budgets,
    totals: {
      totalBudget: project.totalBudget,
      spent,
      committed,
      actuallyAvailable,
      forecastFinalCost,
    },
    contracts: contractRows.map((contract) => {
      const paidAmount = paidContractAmounts.get(contract.id) ?? 0;
      return {
        ...contract,
        paidAmount,
        remainingAmount: Math.max(0, contract.value - paidAmount),
      };
    }),
  };
}

function healthFromFinance(finance: NonNullable<Awaited<ReturnType<typeof financeFor>>>) {
  const { totals, budgets } = finance;
  const usage = totals.totalBudget > 0 ? totals.forecastFinalCost / totals.totalBudget : 1;
  const overruns = budgets.filter((budget) => budget.forecast > budget.allocated).length;
  const availableRatio =
    totals.totalBudget > 0 ? totals.actuallyAvailable / totals.totalBudget : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(100 - Math.max(0, usage - 0.7) * 85 - overruns * 6 + availableRatio * 12),
    ),
  );
  const status =
    score >= 88 ? "HEALTHY" : score >= 72 ? "STABLE" : score >= 52 ? "WATCH" : "HIGH RISK";
  const factors = [
    `${Math.round(usage * 100)}% forecast budget usage`,
    `${overruns} departments forecast over allocation`,
    `${Math.round(availableRatio * 100)}% of budget actually available`,
  ];
  return { score, status, factors };
}

async function ensureDemo(userId: string) {
  await db
    .insert(usersTable)
    .values({ clerkUserId: userId, displayName: "Producer" })
    .onConflictDoNothing();

  const existing = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .limit(1);
  if (existing.length) return;

  const [project] = await db
    .insert(projectsTable)
    .values({
      userId,
      name: "THE LAST FRAME",
      type: "Feature Film",
      location: "Kuwait City, Kuwait",
      currency: "KWD",
      startDate: "2026-09-21",
      endDate: "2026-11-18",
      totalBudget: 250000,
      status: "Shooting",
      productionDays: 24,
      imageUrl: null,
    })
    .returning();

  await db.insert(budgetsTable).values([
    { projectId: project.id, department: "Cast", allocated: 48000 },
    { projectId: project.id, department: "Crew", allocated: 52000 },
    { projectId: project.id, department: "Camera", allocated: 28500 },
    { projectId: project.id, department: "Lighting", allocated: 18000 },
    { projectId: project.id, department: "Locations", allocated: 24500 },
    { projectId: project.id, department: "Art", allocated: 21000 },
    { projectId: project.id, department: "Transport", allocated: 12000 },
    { projectId: project.id, department: "Post-production", allocated: 30000 },
    { projectId: project.id, department: "Other", allocated: 16000 },
  ]);

  const [cameraExpense, locationExpense] = await db
    .insert(expensesTable)
    .values([
      {
        projectId: project.id,
        title: "ARRI ALEXA 35 camera package",
        department: "Camera",
        vendor: "CineRent Kuwait",
        amount: 1850,
        date: "2026-09-24",
        category: "Equipment rental",
        notes: "Six-day principal photography package",
        status: "Paid",
      },
      {
        projectId: project.id,
        title: "Old Port location permit",
        department: "Locations",
        vendor: "Kuwait Film Commission",
        amount: 3200,
        date: "2026-09-28",
        category: "Permit",
        notes: "Night shoot access and security",
        status: "Approved",
      },
    ])
    .returning();

  const schedule: ContractPaymentRecord[] = [
    { id: crypto.randomUUID(), label: "Payment 1", amount: 5000, dueDate: "2026-09-25", status: "Paid" },
    { id: crypto.randomUUID(), label: "Payment 2", amount: 7500, dueDate: "2026-10-15", status: "Due" },
    { id: crypto.randomUUID(), label: "Payment 3", amount: 7500, dueDate: "2026-11-01", status: "Scheduled" },
  ];
  const [contract] = await db
    .insert(contractsTable)
    .values({
      projectId: project.id,
      title: "Lead Actor Agreement",
      party: "Noura Al-Sabah",
      role: "Lead Actor",
      department: "Cast",
      value: 20000,
      currency: "KWD",
      startDate: "2026-09-20",
      endDate: "2026-11-02",
      status: "Active",
      notes: "Three-installment production agreement",
      paymentSchedule: schedule,
    })
    .returning();

  await db.insert(paymentRequestsTable).values({
    projectId: project.id,
    recipient: "Noura Al-Sabah",
    contractId: contract.id,
    description: "Second lead actor installment",
    amount: 7500,
    dueDate: "2026-10-15",
    department: "Cast",
    notes: "Due after completion of principal photography week two",
    status: "Under Review",
  });
  await db.insert(paymentsTable).values({
    projectId: project.id,
    recipient: "CineRent Kuwait",
    reason: "ARRI ALEXA 35 camera package",
    amount: 1850,
    relatedExpenseId: cameraExpense.id,
    status: "Paid",
    transactionReference: "ROLL-TEST-1048",
    date: "2026-09-24",
    mode: "TEST",
  });
  await db.insert(assetsTable).values([
    {
      projectId: project.id,
      name: "ARRI ALEXA 35",
      category: "Camera package",
      vendor: "CineRent Kuwait",
      cost: 1850,
      rentalStart: "2026-09-22",
      rentalEnd: "2026-09-28",
      department: "Camera",
      paymentStatus: "Paid",
    },
    {
      projectId: project.id,
      name: "ARRI SkyPanel lighting package",
      category: "Lighting package",
      vendor: "Luma Gulf",
      cost: 950,
      rentalStart: "2026-10-02",
      rentalEnd: "2026-10-05",
      department: "Lighting",
      paymentStatus: "Approved",
    },
  ]);
  await db.insert(cashFlowEntriesTable).values([
    { projectId: project.id, date: "2026-09-20", label: "Production funding", type: "Money In", amount: 100000, projectedBalance: 100000, phase: "PRE-PRODUCTION" },
    { projectId: project.id, date: "2026-09-24", label: "Camera package", type: "Paid expense", amount: -1850, projectedBalance: 98150, phase: "SHOOTING" },
    { projectId: project.id, date: "2026-10-15", label: "Lead actor installment", type: "Contract payment", amount: -7500, projectedBalance: 90650, phase: "SHOOTING" },
    { projectId: project.id, date: "2026-11-12", label: "Color grade", type: "Upcoming payment", amount: -4200, projectedBalance: 86450, phase: "POST-PRODUCTION" },
  ]);
  await db.insert(activitiesTable).values([
    { projectId: project.id, action: "Contract created", detail: "Lead Actor Agreement activated", actor: "Demo Producer" },
    { projectId: project.id, action: "Payment completed", detail: "KWD 1,850 paid to CineRent Kuwait in test mode", actor: "Demo Producer" },
    { projectId: project.id, action: "Expense approved", detail: `${locationExpense.title} approved`, actor: "Demo Producer" },
  ]);
}

async function ensureCompleteDemo(userId: string) {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), eq(projectsTable.name, "THE LAST FRAME")))
    .limit(1);
  if (!project) return;

  const initialized = await db
    .select({ id: activitiesTable.id })
    .from(activitiesTable)
    .where(
      and(
        eq(activitiesTable.projectId, project.id),
        eq(activitiesTable.action, "Demo dataset initialized"),
      ),
    )
    .limit(1);
  if (initialized.length) return;

  await db
    .update(projectsTable)
    .set({
      type: "Feature Film",
      location: "Kuwait",
      currency: "KWD",
      startDate: "2026-08-22",
      endDate: "2026-10-05",
      totalBudget: 250000,
      status: "IN PRODUCTION",
      productionDays: 45,
      imageUrl:
        "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1800&auto=format&fit=crop",
    })
    .where(eq(projectsTable.id, project.id));

  await Promise.all([
    db.delete(budgetsTable).where(eq(budgetsTable.projectId, project.id)),
    db.delete(expensesTable).where(eq(expensesTable.projectId, project.id)),
    db.delete(contractsTable).where(eq(contractsTable.projectId, project.id)),
    db.delete(paymentRequestsTable).where(eq(paymentRequestsTable.projectId, project.id)),
    db.delete(paymentsTable).where(eq(paymentsTable.projectId, project.id)),
    db.delete(assetsTable).where(eq(assetsTable.projectId, project.id)),
    db.delete(cashFlowEntriesTable).where(eq(cashFlowEntriesTable.projectId, project.id)),
    db.delete(decisionsTable).where(eq(decisionsTable.projectId, project.id)),
    db.delete(financialHealthHistoryTable).where(eq(financialHealthHistoryTable.projectId, project.id)),
    db.delete(activitiesTable).where(eq(activitiesTable.projectId, project.id)),
  ]);

  await db.insert(budgetsTable).values([
    { projectId: project.id, department: "Cast", allocated: 48000 },
    { projectId: project.id, department: "Crew", allocated: 42000 },
    { projectId: project.id, department: "Camera", allocated: 22000 },
    { projectId: project.id, department: "Lighting", allocated: 12000 },
    { projectId: project.id, department: "Locations", allocated: 20000 },
    { projectId: project.id, department: "Art Department", allocated: 18000 },
    { projectId: project.id, department: "Wardrobe", allocated: 9000 },
    { projectId: project.id, department: "Transport", allocated: 10000 },
    { projectId: project.id, department: "Equipment", allocated: 14000 },
    { projectId: project.id, department: "Post-production", allocated: 32000 },
    { projectId: project.id, department: "Marketing", allocated: 10000 },
    { projectId: project.id, department: "Contingency / Other", allocated: 13000 },
  ]);

  const paidExpenses = await db
    .insert(expensesTable)
    .values([
      { projectId: project.id, title: "Unit catering", department: "Crew", vendor: "Table Seven", amount: 6500, date: "2026-08-26", category: "Catering", notes: "Principal unit meals", status: "PAID" },
      { projectId: project.id, title: "Production transport", department: "Transport", vendor: "Gulf Fleet", amount: 7200, date: "2026-08-28", category: "Transport", notes: "Crew buses and picture vehicles", status: "PAID" },
      { projectId: project.id, title: "Filming permits", department: "Locations", vendor: "Kuwait Film Commission", amount: 4800, date: "2026-08-24", category: "Permits", notes: "City and shoreline permits", status: "PAID" },
      { projectId: project.id, title: "Hero wardrobe purchase", department: "Wardrobe", vendor: "Atelier 26", amount: 6600, date: "2026-08-29", category: "Wardrobe", notes: "Principal cast wardrobe", status: "PAID" },
      { projectId: project.id, title: "Practical props", department: "Art Department", vendor: "Frame Props", amount: 3800, date: "2026-09-01", category: "Props", notes: "Hero and background props", status: "PAID" },
      { projectId: project.id, title: "Generator and vehicle fuel", department: "Equipment", vendor: "Kuwait Fuel Co.", amount: 2750, date: "2026-09-03", category: "Fuel", notes: "Week two production fuel", status: "PAID" },
      { projectId: project.id, title: "Crew overtime", department: "Crew", vendor: "Production Payroll", amount: 4100, date: "2026-09-06", category: "Overtime", notes: "Night exterior turnaround", status: "PAID" },
      { projectId: project.id, title: "Location preparation", department: "Locations", vendor: "Set Ready Kuwait", amount: 4000, date: "2026-08-23", category: "Preparation", notes: "Access, rigging and restoration", status: "PAID" },
    ])
    .returning();

  const contractSeeds = [
    { title: "Lead Actor Contract", party: "Omar Al Salem", role: "Lead Actor", department: "Cast", value: 20000, paid: 5000 },
    { title: "Director Contract", party: "Layla Al Rashid", role: "Director", department: "Crew", value: 18000, paid: 9000 },
    { title: "ARRI Camera Package", party: "Cinema Equipment Co.", role: "Camera Rental", department: "Camera", value: 8500, paid: 4250 },
    { title: "Main Location Agreement", party: "Kuwait Waterfront Authority", role: "Location", department: "Locations", value: 12000, paid: 12000 },
    { title: "Post-production Agreement", party: "Desert Frame Post", role: "Post-production", department: "Post-production", value: 24000, paid: 6000 },
    { title: "Crew Service Agreement", party: "Kuwait Film Crew", role: "Crew Services", department: "Crew", value: 22000, paid: 11000 },
    { title: "Lighting Package", party: "Luma Gulf", role: "Lighting Rental", department: "Lighting", value: 9500, paid: 0 },
    { title: "Wardrobe Services", party: "Atelier 26", role: "Wardrobe", department: "Wardrobe", value: 8000, paid: 0 },
    { title: "Picture Vehicle Agreement", party: "Gulf Fleet", role: "Transport", department: "Transport", value: 10000, paid: 0 },
    { title: "Production Catering Agreement", party: "Table Seven", role: "Catering", department: "Crew", value: 11000, paid: 0 },
  ];

  const contracts = [];
  for (const seed of contractSeeds) {
    const remaining = seed.value - seed.paid;
    const schedule: ContractPaymentRecord[] = [
      { id: crypto.randomUUID(), label: "INSTALLMENT 01", amount: seed.paid || Math.round(seed.value * 0.25), dueDate: "2026-08-28", status: seed.paid ? "PAID" : "UPCOMING" },
      { id: crypto.randomUUID(), label: "INSTALLMENT 02", amount: remaining / 2, dueDate: "2026-09-25", status: "UPCOMING" },
      { id: crypto.randomUUID(), label: "INSTALLMENT 03", amount: remaining / 2, dueDate: "2026-10-15", status: "UPCOMING" },
    ];
    const [created] = await db
      .insert(contractsTable)
      .values({
        projectId: project.id,
        title: seed.title,
        party: seed.party,
        role: seed.role,
        department: seed.department,
        value: seed.value,
        currency: "KWD",
        startDate: "2026-08-22",
        endDate: "2026-10-15",
        status: seed.title === "Main Location Agreement" ? "COMPLETED" : "ACTIVE",
        notes: "Demo production agreement",
        paymentSchedule: schedule,
      })
      .returning();
    contracts.push({ ...created, paid: seed.paid });
  }

  const paidContracts = contracts.filter((contract) => contract.paid > 0);
  await db.insert(paymentsTable).values([
    ...paidExpenses.map((expense, index) => ({
      projectId: project.id,
      recipient: expense.vendor,
      reason: expense.title,
      amount: expense.amount,
      relatedExpenseId: expense.id,
      status: "PAID",
      transactionReference: `ROLL-DEMO-E${String(index + 1).padStart(3, "0")}`,
      date: expense.date,
      mode: "TEST",
    })),
    ...paidContracts.map((contract, index) => ({
      projectId: project.id,
      recipient: contract.party,
      reason: `${contract.title} — INSTALLMENT 01`,
      amount: contract.paid,
      relatedContractId: contract.id,
      status: "PAID",
      transactionReference: `ROLL-DEMO-C${String(index + 1).padStart(3, "0")}`,
      date: "2026-08-28",
      mode: "TEST",
    })),
  ]);

  await db.insert(paymentRequestsTable).values([
    { projectId: project.id, recipient: "Cinema Equipment Co.", contractId: contracts[2].id, description: "Camera rental extension", amount: 1850, dueDate: "2026-09-18", department: "Camera", notes: "Three additional shooting days", status: "UNDER REVIEW" },
    { projectId: project.id, recipient: "Production Payroll", contractId: contracts[5].id, description: "Crew overtime", amount: 1200, dueDate: "2026-09-16", department: "Crew", notes: "Night shoot overtime", status: "REQUESTED" },
    { projectId: project.id, recipient: "Desert Frame Post", contractId: contracts[4].id, description: "Editorial milestone", amount: 6000, dueDate: "2026-09-25", department: "Post-production", notes: "Assembly cut delivery", status: "APPROVED" },
  ]);

  await db.insert(assetsTable).values([
    { projectId: project.id, name: "ARRI ALEXA 35", category: "Camera", vendor: "Cinema Equipment Co.", cost: 1850, rentalStart: "2026-09-12", rentalEnd: "2026-09-18", department: "Camera", paymentStatus: "PAID" },
    { projectId: project.id, name: "ANGENIEUX ZOOM LENS PACKAGE", category: "Camera", vendor: "Cinema Equipment Co.", cost: 950, rentalStart: "2026-09-12", rentalEnd: "2026-09-18", department: "Camera", paymentStatus: "APPROVED" },
    { projectId: project.id, name: "LIGHTING PACKAGE", category: "Lighting", vendor: "Luma Gulf", cost: 1400, rentalStart: "2026-09-13", rentalEnd: "2026-09-19", department: "Lighting", paymentStatus: "APPROVED" },
    { projectId: project.id, name: "WIRELESS SOUND KIT", category: "Sound", vendor: "Kuwait Sound", cost: 650, rentalStart: "2026-09-12", rentalEnd: "2026-09-18", department: "Crew", paymentStatus: "PAID" },
  ]);

  await db.insert(cashFlowEntriesTable).values([
    { projectId: project.id, date: "2026-08-15", label: "Initial production funding", type: "MONEY IN", amount: 150000, projectedBalance: 150000, phase: "PRE-PRODUCTION" },
    { projectId: project.id, date: "2026-08-22", label: "Pre-production costs", type: "MONEY OUT", amount: -42500, projectedBalance: 107500, phase: "PRE-PRODUCTION" },
    { projectId: project.id, date: "2026-09-01", label: "Shooting costs paid", type: "PAID EXPENSES", amount: -44500, projectedBalance: 63000, phase: "SHOOTING" },
    { projectId: project.id, date: "2026-09-18", label: "Camera rental extension", type: "PAYMENT REQUEST", amount: -1850, projectedBalance: 61150, phase: "SHOOTING" },
    { projectId: project.id, date: "2026-09-25", label: "Contract installments", type: "UPCOMING CONTRACT PAYMENTS", amount: -18500, projectedBalance: 42650, phase: "SHOOTING" },
    { projectId: project.id, date: "2026-10-01", label: "Final production funding", type: "MONEY IN", amount: 100000, projectedBalance: 142650, phase: "POST-PRODUCTION" },
    { projectId: project.id, date: "2026-10-15", label: "Post-production milestones", type: "UPCOMING CONTRACT PAYMENTS", amount: -32000, projectedBalance: 110650, phase: "POST-PRODUCTION" },
    { projectId: project.id, date: "2026-11-01", label: "Delivery reserve", type: "PROJECTED BALANCE", amount: -8000, projectedBalance: 102650, phase: "DELIVERY" },
  ]);

  await db.insert(activitiesTable).values([
    { projectId: project.id, action: "Demo dataset initialized", detail: "Complete connected production finance demo created", actor: "ROLL" },
    { projectId: project.id, action: "Actor contract created", detail: "Lead Actor Contract activated", actor: "Demo Producer" },
    { projectId: project.id, action: "Camera contract approved", detail: "ARRI Camera Package approved", actor: "Demo Producer" },
    { projectId: project.id, action: "Location payment completed", detail: "Main location agreement paid in test mode", actor: "Demo Producer" },
    { projectId: project.id, action: "Crew expense added", detail: "Crew overtime recorded", actor: "Demo Producer" },
    { projectId: project.id, action: "Payment approved", detail: "Post-production milestone approved", actor: "Demo Producer" },
    { projectId: project.id, action: "Budget updated", detail: "Camera forecast reviewed", actor: "Demo Producer" },
    { projectId: project.id, action: "Upcoming payment warning generated", detail: "Contract payments due before next cash inflow", actor: "ROLL AI" },
  ]);
}

router.get("/projects", async (req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  await ensureDemo(userId);
  await ensureCompleteDemo(userId);
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .orderBy(desc(projectsTable.createdAt));
  res.json(projects);
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .insert(projectsTable)
    .values({
      ...parsed.data,
      startDate: calendar(parsed.data.startDate),
      endDate: calendar(parsed.data.endDate),
      userId: res.locals.userId as string,
    })
    .returning();
  await addActivity(project.id, "Project created", `${project.name} created`);
  res.status(201).json(project);
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await ownedProject(params.data.projectId, res.locals.userId as string);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid project update" });
    return;
  }
  const project = await ownedProject(params.data.projectId, res.locals.userId as string);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const { startDate, endDate, ...projectChanges } = body.data;
  const [updated] = await db
    .update(projectsTable)
    .set({
      ...projectChanges,
      ...(startDate ? { startDate: calendar(startDate) } : {}),
      ...(endDate ? { endDate: calendar(endDate) } : {}),
    })
    .where(eq(projectsTable.id, project.id))
    .returning();
  await addActivity(project.id, "Project updated", `${project.name} settings updated`);
  res.json(updated);
});

router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await ownedProject(params.data.projectId, res.locals.userId as string);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db.delete(projectsTable).where(eq(projectsTable.id, project.id));
  res.sendStatus(204);
});

router.get("/projects/:projectId/dashboard", async (req, res): Promise<void> => {
  const params = GetProjectDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await ownedProject(params.data.projectId, res.locals.userId as string);
  const finance = project ? await financeFor(project.id) : null;
  if (!project || !finance) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const paymentRequests = await db
    .select()
    .from(paymentRequestsTable)
    .where(eq(paymentRequestsTable.projectId, project.id))
    .orderBy(asc(paymentRequestsTable.dueDate));
  const health = healthFromFinance(finance);
  const insights = [
    ...finance.budgets
      .filter((budget) => budget.forecast > budget.allocated)
      .slice(0, 2)
      .map((budget) => ({
        id: `budget-${budget.id}`,
        type: "DEPARTMENT RISK",
        title: budget.department.toUpperCase(),
        message: `Forecast to exceed allocation by KWD ${Math.round(budget.forecast - budget.allocated).toLocaleString()}.`,
        severity: "Watch",
      })),
    {
      id: "contract-risk",
      type: "CONTRACT RISK",
      title: "UPCOMING OBLIGATIONS",
      message: `KWD ${Math.round(finance.totals.committed).toLocaleString()} remains committed across active obligations.`,
      severity: health.score < 60 ? "High" : "Moderate",
    },
  ];
  res.json({
    project,
    totals: finance.totals,
    budgets: finance.budgets,
    insights,
    upcomingPayments: paymentRequests.slice(0, 4).map((request) => ({
      id: request.id,
      label: request.description,
      recipient: request.recipient,
      amount: request.amount,
      dueDate: request.dueDate,
      daysUntilDue: Math.ceil(
        (new Date(request.dueDate).getTime() - Date.now()) / 86400000,
      ),
    })),
    productionProgress: {
      phase: project.status.toUpperCase(),
      percent:
        project.name === "THE LAST FRAME"
          ? 47
          : Math.min(100, Math.round((Date.now() - new Date(project.startDate).getTime()) / 86400000 / project.productionDays * 100)),
      daysCompleted:
        project.name === "THE LAST FRAME"
          ? 21
          : Math.max(0, Math.min(project.productionDays, Math.ceil((Date.now() - new Date(project.startDate).getTime()) / 86400000))),
      totalDays: project.productionDays,
    },
  });
});

router.get("/projects/:projectId/budgets", async (req, res): Promise<void> => {
  const params = ListBudgetsParams.safeParse(req.params);
  const project = params.success
    ? await ownedProject(params.data.projectId, res.locals.userId as string)
    : null;
  const finance = project ? await financeFor(project.id) : null;
  if (!finance) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(finance.budgets);
});

router.post("/projects/:projectId/budgets", async (req, res): Promise<void> => {
  const params = CreateBudgetParams.safeParse(req.params);
  const body = CreateBudgetBody.safeParse(req.body);
  const project = params.success
    ? await ownedProject(params.data.projectId, res.locals.userId as string)
    : null;
  if (!project || !body.success) {
    res.status(400).json({ error: "Invalid budget" });
    return;
  }
  const [budget] = await db
    .insert(budgetsTable)
    .values({ projectId: project.id, ...body.data })
    .returning();
  await addActivity(project.id, "Budget updated", `${body.data.department} allocation added`);
  res.status(201).json({ ...budget, paid: 0, committed: 0, remaining: budget.allocated, forecast: budget.allocated });
});

router.patch("/projects/:projectId/budgets/:budgetId", async (req, res): Promise<void> => {
  const params = UpdateBudgetParams.safeParse(req.params);
  const body = UpdateBudgetBody.safeParse(req.body);
  const project = params.success
    ? await ownedProject(params.data.projectId, res.locals.userId as string)
    : null;
  if (!project || !params.success || !body.success) {
    res.status(400).json({ error: "Invalid budget update" });
    return;
  }
  await db.update(budgetsTable).set(body.data).where(and(eq(budgetsTable.id, params.data.budgetId), eq(budgetsTable.projectId, project.id)));
  await addActivity(project.id, "Budget updated", "Department allocation updated");
  const finance = await financeFor(project.id);
  const budget = finance?.budgets.find((item) => item.id === params.data.budgetId);
  if (!budget) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }
  res.json(budget);
});

router.get("/projects/:projectId/expenses", async (req, res): Promise<void> => {
  const params = ListExpensesParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await db.select().from(expensesTable).where(eq(expensesTable.projectId, project.id)).orderBy(desc(expensesTable.date)));
});

router.post("/projects/:projectId/expenses", async (req, res): Promise<void> => {
  const params = CreateExpenseParams.safeParse(req.params);
  const body = CreateExpenseBody.safeParse(req.body);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !body.success) {
    res.status(400).json({ error: "Invalid expense" });
    return;
  }
  const [expense] = await db
    .insert(expensesTable)
    .values({
      projectId: project.id,
      ...body.data,
      date: calendar(body.data.date),
    })
    .returning();
  await addActivity(project.id, "Expense added", `${expense.title} — KWD ${expense.amount.toLocaleString()}`);
  res.status(201).json(expense);
});

router.patch("/projects/:projectId/expenses/:expenseId", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  const body = UpdateExpenseBody.safeParse(req.body);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !params.success || !body.success) {
    res.status(400).json({ error: "Invalid expense update" });
    return;
  }
  const { date, ...expenseChanges } = body.data;
  const [expense] = await db
    .update(expensesTable)
    .set({
      ...expenseChanges,
      ...(date ? { date: calendar(date) } : {}),
    })
    .where(and(eq(expensesTable.id, params.data.expenseId), eq(expensesTable.projectId, project.id)))
    .returning();
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  await addActivity(project.id, "Expense updated", `${expense.title} marked ${expense.status}`);
  res.json(expense);
});

router.get("/projects/:projectId/contracts", async (req, res): Promise<void> => {
  const params = ListContractsParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  const finance = project ? await financeFor(project.id) : null;
  if (!finance) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(finance.contracts);
});

router.post("/projects/:projectId/contracts", async (req, res): Promise<void> => {
  const params = CreateContractParams.safeParse(req.params);
  const body = CreateContractBody.safeParse(req.body);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !body.success) {
    res.status(400).json({ error: "Invalid contract" });
    return;
  }
  const paymentSchedule = body.data.paymentSchedule.map((payment) => ({
    ...payment,
    dueDate: calendar(payment.dueDate),
    id: crypto.randomUUID(),
  }));
  const [contract] = await db
    .insert(contractsTable)
    .values({
      projectId: project.id,
      ...body.data,
      startDate: calendar(body.data.startDate),
      endDate: calendar(body.data.endDate),
      paymentSchedule,
    })
    .returning();
  await addActivity(project.id, "Contract created", `${contract.title} activated at KWD ${contract.value.toLocaleString()}`);
  res.status(201).json({ ...contract, paidAmount: 0, remainingAmount: contract.value });
});

router.patch("/projects/:projectId/contracts/:contractId", async (req, res): Promise<void> => {
  const params = UpdateContractParams.safeParse(req.params);
  const body = UpdateContractBody.safeParse(req.body);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !params.success || !body.success) {
    res.status(400).json({ error: "Invalid contract update" });
    return;
  }
  const {
    startDate,
    endDate,
    paymentSchedule: scheduleChanges,
    ...contractChanges
  } = body.data;
  const values = {
    ...contractChanges,
    ...(startDate ? { startDate: calendar(startDate) } : {}),
    ...(endDate ? { endDate: calendar(endDate) } : {}),
    ...(scheduleChanges
      ? {
          paymentSchedule: scheduleChanges.map((payment) => ({
            ...payment,
            dueDate: calendar(payment.dueDate),
            id: crypto.randomUUID(),
          })),
        }
      : {}),
  };
  await db.update(contractsTable).set(values).where(and(eq(contractsTable.id, params.data.contractId), eq(contractsTable.projectId, project.id)));
  await addActivity(project.id, "Contract updated", "Contract terms updated");
  const finance = await financeFor(project.id);
  const contract = finance?.contracts.find((item) => item.id === params.data.contractId);
  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }
  res.json(contract);
});

router.get("/projects/:projectId/payment-requests", async (req, res): Promise<void> => {
  const params = ListPaymentRequestsParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await db.select().from(paymentRequestsTable).where(eq(paymentRequestsTable.projectId, project.id)).orderBy(asc(paymentRequestsTable.dueDate)));
});

router.post("/projects/:projectId/payment-requests", async (req, res): Promise<void> => {
  const params = CreatePaymentRequestParams.safeParse(req.params);
  const body = CreatePaymentRequestBody.safeParse(req.body);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !body.success) {
    res.status(400).json({ error: "Invalid payment request" });
    return;
  }
  const [request] = await db
    .insert(paymentRequestsTable)
    .values({
      projectId: project.id,
      ...body.data,
      dueDate: calendar(body.data.dueDate),
    })
    .returning();
  await addActivity(project.id, "Payment requested", `${request.recipient} requested KWD ${request.amount.toLocaleString()}`);
  res.status(201).json(request);
});

router.patch("/projects/:projectId/payment-requests/:requestId", async (req, res): Promise<void> => {
  const params = UpdatePaymentRequestParams.safeParse(req.params);
  const body = UpdatePaymentRequestBody.safeParse(req.body);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !params.success || !body.success) {
    res.status(400).json({ error: "Invalid payment request update" });
    return;
  }
  const { dueDate, ...requestChanges } = body.data;
  const [request] = await db
    .update(paymentRequestsTable)
    .set({
      ...requestChanges,
      ...(dueDate ? { dueDate: calendar(dueDate) } : {}),
    })
    .where(and(eq(paymentRequestsTable.id, params.data.requestId), eq(paymentRequestsTable.projectId, project.id)))
    .returning();
  if (!request) {
    res.status(404).json({ error: "Payment request not found" });
    return;
  }
  await addActivity(project.id, "Payment request updated", `${request.description} marked ${request.status}`);
  res.json(request);
});

router.get("/projects/:projectId/payments", async (req, res): Promise<void> => {
  const params = ListPaymentsParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await db.select().from(paymentsTable).where(eq(paymentsTable.projectId, project.id)).orderBy(desc(paymentsTable.createdAt)));
});

router.post("/projects/:projectId/payments", async (req, res): Promise<void> => {
  const params = CreatePaymentParams.safeParse(req.params);
  const body = CreatePaymentBody.safeParse(req.body);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !body.success) {
    res.status(400).json({ error: "Invalid payment" });
    return;
  }
  const [payment] = await db.insert(paymentsTable).values({ projectId: project.id, ...body.data, mode: "TEST" }).returning();
  await addActivity(project.id, "Payment created", `Test payment prepared for ${payment.recipient}`);
  res.status(201).json(payment);
});

router.post("/projects/:projectId/payments/:paymentId/process", async (req, res): Promise<void> => {
  const params = ProcessPaymentParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !params.success) {
    res.status(400).json({ error: "Invalid payment" });
    return;
  }
  const [existing] = await db.select().from(paymentsTable).where(and(eq(paymentsTable.id, params.data.paymentId), eq(paymentsTable.projectId, project.id)));
  if (!existing) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const [payment] = await db.update(paymentsTable).set({ status: "Paid", transactionReference: `ROLL-TEST-${Date.now().toString().slice(-6)}`, date: today }).where(eq(paymentsTable.id, existing.id)).returning();
  if (payment.relatedExpenseId) {
    await db.update(expensesTable).set({ status: "Paid" }).where(eq(expensesTable.id, payment.relatedExpenseId));
  }
  if (payment.relatedContractId) {
    const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, payment.relatedContractId));
    if (contract) {
      let remaining = payment.amount;
      const paymentSchedule = contract.paymentSchedule.map((item) => {
        if (remaining > 0 && statusOf(item.status) !== "paid" && Math.abs(item.amount - remaining) < 0.01) {
          remaining = 0;
          return { ...item, status: "Paid" };
        }
        return item;
      });
      await db.update(contractsTable).set({ paymentSchedule }).where(eq(contractsTable.id, contract.id));
    }
  }
  await addActivity(project.id, "Payment completed", `KWD ${payment.amount.toLocaleString()} paid to ${payment.recipient} in test mode`);
  const updatedFinance = await financeFor(project.id);
  if (updatedFinance) {
    await db.insert(cashFlowEntriesTable).values({
      projectId: project.id,
      date: today,
      label: `${payment.recipient} — ${payment.reason}`,
      type: "PAID EXPENSE",
      amount: -payment.amount,
      projectedBalance: updatedFinance.totals.actuallyAvailable,
      phase: project.status,
    });
    await db.insert(financialHealthHistoryTable).values({
      projectId: project.id,
      ...healthFromFinance(updatedFinance),
    });
  }
  res.json(payment);
});

router.get("/projects/:projectId/assets", async (req, res): Promise<void> => {
  const params = ListAssetsParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await db.select().from(assetsTable).where(eq(assetsTable.projectId, project.id)).orderBy(asc(assetsTable.rentalStart)));
});

router.post("/projects/:projectId/assets", async (req, res): Promise<void> => {
  const params = CreateAssetParams.safeParse(req.params);
  const body = CreateAssetBody.safeParse(req.body);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !body.success) {
    res.status(400).json({ error: "Invalid asset" });
    return;
  }
  const [asset] = await db
    .insert(assetsTable)
    .values({
      projectId: project.id,
      ...body.data,
      rentalStart: calendar(body.data.rentalStart),
      rentalEnd: calendar(body.data.rentalEnd),
    })
    .returning();
  await addActivity(project.id, "Asset added", `${asset.name} added to ${asset.department}`);
  res.status(201).json(asset);
});

router.post("/projects/:projectId/decisions/simulate", async (req, res): Promise<void> => {
  const params = SimulateDecisionParams.safeParse(req.params);
  const body = SimulateDecisionBody.safeParse(req.body);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  const finance = project ? await financeFor(project.id) : null;
  if (!project || !finance || !body.success) {
    res.status(400).json({ error: "Invalid decision" });
    return;
  }
  const text = body.data.description.toLowerCase();
  const number = Number(text.match(/\d+(?:\.\d+)?/)?.[0] ?? 1);
  let estimatedCost = Math.round(project.totalBudget * 0.018);
  let affectedDepartments = ["Crew", "Transport"];
  if (text.includes("day")) {
    estimatedCost = Math.round((project.totalBudget / project.productionDays) * 0.42 * number);
    affectedDepartments = ["Crew", "Camera", "Lighting", "Locations"];
  } else if (text.includes("camera") || text.includes("rental")) {
    estimatedCost = Math.round(650 * number);
    affectedDepartments = ["Camera"];
  } else if (text.includes("location") || text.includes("move")) {
    estimatedCost = Math.round(project.totalBudget * 0.04);
    affectedDepartments = ["Locations", "Transport", "Crew"];
  } else if (text.includes("night") || text.includes("overtime")) {
    estimatedCost = Math.round(project.totalBudget * 0.025);
    affectedDepartments = ["Crew", "Lighting", "Transport"];
  }
  const newAvailable = finance.totals.actuallyAvailable - estimatedCost;
  const riskLevel =
    newAvailable < project.totalBudget * 0.08 ? "HIGH" : newAvailable < project.totalBudget * 0.2 ? "MODERATE" : "LOW";
  const [decision] = await db.insert(decisionsTable).values({
    projectId: project.id,
    description: body.data.description,
    currentAvailable: finance.totals.actuallyAvailable,
    estimatedCost,
    newAvailable,
    newForecast: finance.totals.forecastFinalCost + estimatedCost,
    riskLevel,
    affectedDepartments,
    cashFlowImpact: -estimatedCost,
    status: "SIMULATED",
  }).returning();
  res.json(decision);
});

router.post("/projects/:projectId/decisions/:decisionId/approve", async (req, res): Promise<void> => {
  const params = ApproveDecisionParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !params.success) {
    res.status(400).json({ error: "Invalid decision" });
    return;
  }
  const [decision] = await db.update(decisionsTable).set({ status: "APPROVED" }).where(and(eq(decisionsTable.id, params.data.decisionId), eq(decisionsTable.projectId, project.id), eq(decisionsTable.status, "SIMULATED"))).returning();
  if (!decision) {
    res.status(404).json({ error: "Decision not found" });
    return;
  }
  await db.insert(expensesTable).values({
    projectId: project.id,
    title: `Decision impact: ${decision.description}`,
    department: decision.affectedDepartments[0] ?? "Other",
    vendor: "Production contingency",
    amount: decision.estimatedCost,
    date: new Date().toISOString().slice(0, 10),
    category: "Approved decision",
    notes: "Created by ROLL AI Decision Impact Engine",
    status: "Approved",
  });
  await addActivity(project.id, "Decision approved", `${decision.description} — KWD ${decision.estimatedCost.toLocaleString()} committed`);
  const updatedFinance = await financeFor(project.id);
  if (updatedFinance) {
    await db.insert(cashFlowEntriesTable).values({
      projectId: project.id,
      date: new Date().toISOString().slice(0, 10),
      label: `Approved decision — ${decision.description}`,
      type: "APPROVED DECISION",
      amount: -decision.estimatedCost,
      projectedBalance: updatedFinance.totals.actuallyAvailable,
      phase: project.status,
    });
    await db.insert(financialHealthHistoryTable).values({
      projectId: project.id,
      ...healthFromFinance(updatedFinance),
    });
  }
  res.json(decision);
});

router.post("/projects/:projectId/decisions/:decisionId/reject", async (req, res): Promise<void> => {
  const params = RejectDecisionParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project || !params.success) {
    res.status(400).json({ error: "Invalid decision" });
    return;
  }
  const [decision] = await db.update(decisionsTable).set({ status: "REJECTED" }).where(and(eq(decisionsTable.id, params.data.decisionId), eq(decisionsTable.projectId, project.id), eq(decisionsTable.status, "SIMULATED"))).returning();
  if (!decision) {
    res.status(404).json({ error: "Decision not found" });
    return;
  }
  await addActivity(project.id, "Decision rejected", `${decision.description} rejected with no financial change`);
  res.json(decision);
});

router.get("/projects/:projectId/cash-flow", async (req, res): Promise<void> => {
  const params = GetCashFlowParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await db.select().from(cashFlowEntriesTable).where(eq(cashFlowEntriesTable.projectId, project.id)).orderBy(asc(cashFlowEntriesTable.date)));
});

router.get("/projects/:projectId/activities", async (req, res): Promise<void> => {
  const params = ListActivitiesParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await db.select().from(activitiesTable).where(eq(activitiesTable.projectId, project.id)).orderBy(desc(activitiesTable.createdAt)).limit(50));
});

router.get("/projects/:projectId/health", async (req, res): Promise<void> => {
  const params = GetFinancialHealthParams.safeParse(req.params);
  const project = params.success ? await ownedProject(params.data.projectId, res.locals.userId as string) : null;
  const finance = project ? await financeFor(project.id) : null;
  if (!finance) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const health = healthFromFinance(finance);
  await db.insert(financialHealthHistoryTable).values({ projectId: finance.project.id, ...health });
  res.json(health);
});

export default router;