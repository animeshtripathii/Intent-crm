import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="text-center py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Campaign Dashboard</h1>
      <p className="text-gray-500 mb-8">No campaigns yet. Create your first campaign.</p>
      <Link
        to="/campaign/new"
        className="inline-block rounded-md bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
      >
        Create Campaign
      </Link>
    </div>
  );
}

export default Dashboard;
