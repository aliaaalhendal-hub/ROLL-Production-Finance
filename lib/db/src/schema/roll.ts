import {
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  displayName: text("display_name").notNull().default("Producer"),
  ...timestamps,
});

export const projectsTable = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  location: text("location").notNull(),
  currency: text("currency").notNull().default("KWD"),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  totalBudget: doublePrecision("total_budget").notNull(),
  status: text("status").notNull(),
  productionDays: integer("production_days").notNull(),
  imageUrl: text("image_url"),
  ...timestamps,
});

export const budgetsTable = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  department: text("department").notNull(),
  allocated: doublePrecision("allocated").notNull(),
  ...timestamps,
});

export const expensesTable = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  vendor: text("vendor").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  category: text("category").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull(),
  ...timestamps,
});

export type ContractPaymentRecord = {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  status: string;
};

export const contractsTable = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  title: text("title").notNull(),
  party: text("party").notNull(),
  role: text("role").notNull(),
  department: text("department").notNull(),
  value: doublePrecision("value").notNull(),
  currency: text("currency").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  status: text("status").notNull(),
  notes: text("notes").notNull().default(""),
  documentPath: text("document_path"),
  paymentSchedule: jsonb("payment_schedule")
    .$type<ContractPaymentRecord[]>()
    .notNull()
    .default([]),
  ...timestamps,
});

export const paymentRequestsTable = pgTable("payment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  recipient: text("recipient").notNull(),
  contractId: uuid("contract_id"),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  department: text("department").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull(),
  ...timestamps,
});

export const paymentsTable = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  recipient: text("recipient").notNull(),
  reason: text("reason").notNull(),
  amount: doublePrecision("amount").notNull(),
  relatedContractId: uuid("related_contract_id"),
  relatedExpenseId: uuid("related_expense_id"),
  status: text("status").notNull(),
  transactionReference: text("transaction_reference"),
  date: date("date", { mode: "string" }),
  mode: text("mode").notNull().default("TEST"),
  ...timestamps,
});

export const assetsTable = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  vendor: text("vendor").notNull(),
  cost: doublePrecision("cost").notNull(),
  rentalStart: date("rental_start", { mode: "string" }).notNull(),
  rentalEnd: date("rental_end", { mode: "string" }).notNull(),
  department: text("department").notNull(),
  paymentStatus: text("payment_status").notNull(),
  ...timestamps,
});

export const decisionsTable = pgTable("decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  description: text("description").notNull(),
  currentAvailable: doublePrecision("current_available").notNull(),
  estimatedCost: doublePrecision("estimated_cost").notNull(),
  newAvailable: doublePrecision("new_available").notNull(),
  newForecast: doublePrecision("new_forecast").notNull(),
  riskLevel: text("risk_level").notNull(),
  affectedDepartments: text("affected_departments").array().notNull(),
  cashFlowImpact: doublePrecision("cash_flow_impact").notNull(),
  status: text("status").notNull().default("SIMULATED"),
  ...timestamps,
});

export const activitiesTable = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  action: text("action").notNull(),
  detail: text("detail").notNull(),
  actor: text("actor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashFlowEntriesTable = pgTable("cash_flow_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  label: text("label").notNull(),
  type: text("type").notNull(),
  amount: doublePrecision("amount").notNull(),
  projectedBalance: doublePrecision("projected_balance").notNull(),
  phase: text("phase").notNull(),
  ...timestamps,
});

export const financialHealthHistoryTable = pgTable("financial_health_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  score: integer("score").notNull(),
  status: text("status").notNull(),
  factors: text("factors").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertBudgetSchema = createInsertSchema(budgetsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertExpenseSchema = createInsertSchema(expensesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectRow = typeof projectsTable.$inferSelect;