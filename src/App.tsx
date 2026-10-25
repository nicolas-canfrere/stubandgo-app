import { NavLink } from 'react-router-dom';

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
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6" />
    </div>
  );
}
