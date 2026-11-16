import { Navigate, Route, Routes } from 'react-router-dom';
import { BackupPage } from '@/features/backup/BackupPage';
import { BarberDetailPage } from '@/features/barbers/BarberDetailPage';
import { BarbersPage } from '@/features/barbers/BarbersPage';
import { CustomerDetailPage } from '@/features/customers/CustomerDetailPage';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { PosPage } from '@/features/pos/PosPage';
import { PosSuccessPage } from '@/features/pos/PosSuccessPage';
import { TransactionDetailPage } from '@/features/pos/TransactionDetailPage';
import { TransactionsPage } from '@/features/pos/TransactionsPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { ServicesPage } from '@/features/services/ServicesPage';
import { MorePage } from '@/features/settings/MorePage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { useSettingsStore } from '@/stores/settingsStore';

export function AppRoutes() {
  const onboardingCompleted = useSettingsStore((s) => s.settings.onboarding_completed);

  if (!onboardingCompleted) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="/pos" element={<PosPage />} />
      <Route path="/pos/success/:id" element={<PosSuccessPage />} />
      <Route path="/transactions" element={<TransactionsPage />} />
      <Route path="/transactions/:id" element={<TransactionDetailPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/customers/:id" element={<CustomerDetailPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/barbers" element={<BarbersPage />} />
      <Route path="/barbers/:id" element={<BarberDetailPage />} />
      <Route path="/backup" element={<BackupPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/more" element={<MorePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

