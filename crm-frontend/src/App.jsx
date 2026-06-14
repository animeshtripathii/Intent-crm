import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import NewCampaign from './pages/NewCampaign';
import CampaignAnalytics from './pages/CampaignAnalytics';

function App() {
  return (
    <BrowserRouter>
      {/* ── Fixed Nav Bar ─────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm"
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Left — brand */}
          <Link to="/" className="flex flex-col leading-tight">
            <div className="flex items-center gap-2">
              <span className="float-animation text-lg">⚡</span>
              <span className="text-base font-bold text-gray-900 tracking-tight">
                Xeno CRM
              </span>
              <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                AI-Powered
              </span>
            </div>
            <span className="text-xs text-gray-400 font-normal pl-7">
              AI-Native Campaign Manager
            </span>
          </Link>

          {/* Right — nav links */}
          <div className="flex items-center gap-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-sm transition-colors ${
                  isActive ? 'text-purple-600 font-semibold' : 'text-gray-500 hover:text-gray-900'
                }`
              }
            >
              Dashboard
            </NavLink>

            <span className="text-gray-300">·</span>

            <Link
              to="/campaign/new"
              className="text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-all duration-200 shadow-md shadow-purple-200"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              + New Campaign
            </Link>
          </div>
        </div>
      </motion.nav>

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
