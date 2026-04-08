import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OnboardingRedirect } from "./components/OnboardingRedirect";
import { RequireAuth } from "./components/RequireAuth";
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
import WelcomePage from "./pages/WelcomePage";

export default function App() {
  return (
    <>
      <OnboardingRedirect />
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/quote" element={<QuotePage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
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
    </>
  );
}
