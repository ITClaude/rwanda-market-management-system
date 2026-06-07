import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import MarketsPage from "@/pages/markets";
import MarketDetailPage from "@/pages/markets/detail";
import SlotsPage from "@/pages/slots";
import VendorsPage from "@/pages/vendors";
import VendorDetailPage from "@/pages/vendors/detail";
import PaymentsPage from "@/pages/payments";
import ExpensesPage from "@/pages/expenses";
import NotificationsPage from "@/pages/notifications";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/markets" component={MarketsPage} />
      <Route path="/markets/:id" component={MarketDetailPage} />
      <Route path="/slots" component={SlotsPage} />
      <Route path="/vendors" component={VendorsPage} />
      <Route path="/vendors/:id" component={VendorDetailPage} />
      <Route path="/payments" component={PaymentsPage} />
      <Route path="/expenses" component={ExpensesPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
