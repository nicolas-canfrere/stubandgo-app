import { lazy, Suspense } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { RequireLogin } from './auth/RequireLogin';
import { AccountMenu } from './components/AccountMenu';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { EventPage } from './pages/EventPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrganizationPage } from './pages/OrganizationPage';
import { PaymentPage } from './pages/PaymentPage';

// The scan page carries the QR code decoder: loaded only when the page is opened.
const ScanPage = lazy(() =>
  import('./pages/ScanPage').then((module) => ({ default: module.ScanPage })),
);

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-semibold text-indigo-700' : 'text-slate-600 hover:text-slate-900';

export function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <span className="text-lg font-bold tracking-tight">stubandgo</span>
          <NavLink to="/" end className={linkClass}>
            Événements
          </NavLink>
          <NavLink to="/scan" className={linkClass}>
            Contrôle d'accès
          </NavLink>
          <AccountMenu />
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Suspense fallback={<p className="text-slate-600">Chargement…</p>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/events/:eventId" element={<EventPage />} />
            <Route path="/orders/:orderId/payment" element={<PaymentPage />} />
            <Route path="/orders/:orderId" element={<ConfirmationPage />} />
            <Route path="/o/:slug" element={<OrganizationPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/scan"
              element={
                <RequireLogin>
                  <ScanPage />
                </RequireLogin>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
