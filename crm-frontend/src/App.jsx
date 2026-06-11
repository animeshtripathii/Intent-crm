import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewCampaign from './pages/NewCampaign';

function App() {
  return (
    <BrowserRouter>
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <Link to="/" className="text-xl font-bold text-gray-900">
          Xeno CRM
        </Link>
        <Link
          to="/campaign/new"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          New Campaign
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaign/new" element={<NewCampaign />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
