import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { RequireAuth } from "./components/RequireAuth";
import { JobsProvider } from "./context/JobsContext";
import { MarketingLayout } from "./pages/marketing/MarketingLayout";
import MarketingAbout from "./pages/marketing/MarketingAbout";
import MarketingContact from "./pages/marketing/MarketingContact";
import MarketingHome from "./pages/marketing/MarketingHome";
import CustomerInvoicingPage from "./pages/CustomerInvoicingPage";
import CustomersPage from "./pages/CustomersPage";
import DashboardPage from "./pages/DashboardPage";
import DriversVehiclesPage from "./pages/DriversVehiclesPage";
import FinanceCalculatorPage from "./pages/FinanceCalculatorPage";
import FinancialTrackingPage from "./pages/FinancialTrackingPage";
import JobBoardPage from "./pages/JobBoardPage";
import JobCreatePage from "./pages/JobCreatePage";
import JobDetailPage from "./pages/JobDetailPage";
import JobsPage from "./pages/JobsPage";
import LiveTrackingPage from "./pages/LiveTrackingPage";
import LoginPage from "./pages/LoginPage";
import MonthlyReportPage from "./pages/MonthlyReportPage";
import QuotePage from "./pages/QuotePage";
import SettingsPage from "./pages/SettingsPage";
import StatisticsPage from "./pages/StatisticsPage";
import DriverAppPage from "./pages/driver/DriverAppPage";
import { DriverAreaLayout } from "./pages/driver/DriverAreaLayout";
import DriverLoginPage from "./pages/driver/DriverLoginPage";

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<DriverAreaLayout />}>
        <Route path="/driver" element={<DriverLoginPage />} />
        <Route path="/driver/app" element={<DriverAppPage />} />
      </Route>
      <Route path="/quote" element={<QuotePage />} />

      <Route path="/" element={<MarketingLayout />}>
        <Route index element={<MarketingHome />} />
        <Route path="about" element={<MarketingAbout />} />
        <Route path="contact" element={<MarketingContact />} />
      </Route>

      <Route
        path="/platform"
        element={
          <RequireAuth>
            <RouteErrorBoundary>
              <JobsProvider>
                <Layout />
              </JobsProvider>
            </RouteErrorBoundary>
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="job-board" element={<JobBoardPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/create" element={<JobCreatePage />} />
        <Route path="jobs/:jobId" element={<JobDetailPage />} />
        <Route path="live-tracking" element={<LiveTrackingPage />} />
        <Route path="finance-calculator" element={<FinanceCalculatorPage />} />
        <Route path="financial-tracking" element={<FinancialTrackingPage />} />
        <Route path="customer-invoicing" element={<CustomerInvoicingPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="drivers-vehicles" element={<DriversVehiclesPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="monthly-report" element={<MonthlyReportPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
