import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewCampaign from './pages/NewCampaign';
import CampaignAnalytics from './pages/CampaignAnalytics';

function App() {
  return (
    <BrowserRouter>
      {/* ── Fixed Nav Bar ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Left — brand */}
          <Link to="/" className="flex flex-col leading-tight">
            <span className="text-base font-bold text-gray-900 tracking-tight">
              ⚡ Xeno CRM
            </span>
            <span className="text-xs text-gray-400 font-normal">
              AI-Native Campaign Manager
            </span>
          </Link>

          {/* Right — nav links */}
          <div className="flex items-center gap-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`
              }
            >
              Dashboard
            </NavLink>

            <Link
              to="/campaign/new"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm"
            >
              + New Campaign
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Page content — offset for fixed nav ───────────────────────── */}
      <main className="pt-16 min-h-screen bg-gray-50">
        <Routes>
          <Route path="/"                element={<Dashboard />} />
          <Route path="/campaign/new"    element={<NewCampaign />} />
          <Route path="/analytics/:id"   element={<CampaignAnalytics />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
