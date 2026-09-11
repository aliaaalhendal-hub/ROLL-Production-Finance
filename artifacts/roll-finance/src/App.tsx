import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { dark } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import AppLayout from '@/components/layout/app-layout';

import Dashboard from '@/pages/app/dashboard';
import Budgets from '@/pages/app/budgets';
import Expenses from '@/pages/app/expenses';
import Contracts from '@/pages/app/contracts';
import PaymentRequests from '@/pages/app/payment-requests';
import Payments from '@/pages/app/payments';
import CashFlow from '@/pages/app/cash-flow';
import Assets from '@/pages/app/assets';
import AiSimulation from '@/pages/app/ai-simulation';
import History from '@/pages/app/history';
import Settings from '@/pages/app/settings';

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(43 74% 49%)",
    colorBackground: "hsl(0 0% 6%)",
    colorInput: "hsl(0 0% 15%)",
    colorNeutral: "hsl(0 0% 15%)",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "0rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-none border border-border w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-serif text-2xl text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground uppercase text-xs tracking-wider",
    footerActionLink: "text-primary hover:text-primary/80",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-sm font-semibold rounded-none",
    formFieldInput: "bg-input border-border text-foreground rounded-none",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 cinematic-glow">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 cinematic-glow">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function AppRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/app" component={Dashboard} />
        <Route path="/app/budget" component={Budgets} />
        <Route path="/app/expenses" component={Expenses} />
        <Route path="/app/contracts" component={Contracts} />
        <Route path="/app/requests" component={PaymentRequests} />
        <Route path="/app/payments" component={Payments} />
        <Route path="/app/cash-flow" component={CashFlow} />
        <Route path="/app/assets" component={Assets} />
        <Route path="/app/ai" component={AiSimulation} />
        <Route path="/app/history" component={History} />
        <Route path="/app/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function ProtectedApp() {
  return (
    <>
      <Show when="signed-in">
        <AppRoutes />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  
  // Enforce dark mode on the whole app for cinematic feel
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  if (!clerkPubKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-destructive">Clerk Key Missing</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please configure VITE_CLERK_PUBLISHABLE_KEY</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/app/*" component={ProtectedApp} />
            <Route path="/app" component={ProtectedApp} />
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
