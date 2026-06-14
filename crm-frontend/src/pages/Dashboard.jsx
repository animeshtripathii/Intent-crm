// main landing page. shows aggregate stats and recent campaign history.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../config.js';
const STATUS_CONFIG = {
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600',   border: 'border-l-4 border-gray-300' },
  sending:   { label: 'Sending',   cls: 'bg-blue-100 text-blue-700',   border: 'border-l-4 border-blue-400' },
  sent:      { label: 'Sent',      cls: 'bg-blue-100 text-blue-700',   border: 'border-l-4 border-blue-400' },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700', border: 'border-l-4 border-green-400' },
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) : '—';

const truncate = (str, n) =>
  str && str.length > n ? str.slice(0, n) + '…' : str;

// glimmering placeholder card to prevent layout shift while fetching
const SkeletonCard = () => (
  <motion.div
    className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm pulse-dot glass-card"
  >
    <div className="flex justify-between gap-4">
      <div className="flex-1 space-y-3">
        <div className="h-4 w-2/3 rounded shimmer" />
        <div className="h-3 w-full rounded mt-2 shimmer" />
        <div className="h-3 w-1/3 rounded mt-4 shimmer" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
        <div className="h-3 w-40 bg-gray-100 rounded" />
      </div>
    </div>
  </motion.div>
);


const StatusBadge = ({ status }) => {
  const { label, cls } = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};


const CampaignCard = ({ campaign, index }) => {
  const { _id, name, naturalLanguageIntent, createdAt, status, stats } = campaign;
  const borderClass = STATUS_CONFIG[status]?.border || 'border-l-4 border-gray-300';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, scale: 1.01 }}
    >
      <Link
        to={`/analytics/${_id}`}
        className={`glass-card group block rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-all ${borderClass}`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">


          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm group-hover:text-black truncate">
              {truncate(name, 60)}
            </p>
            {naturalLanguageIntent && (
              <p className="text-xs text-gray-400 italic mt-1 truncate">
                "{truncate(naturalLanguageIntent, 80)}"
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">{formatDate(createdAt)}</p>
          </div>


          <div className="flex flex-col items-end gap-2 flex-shrink-0 mt-2 sm:mt-0">
            <StatusBadge status={status} />

            <p className="text-xs whitespace-nowrap">
              <span className="text-gray-500">Sent {stats?.sent ?? 0}</span> <span className="text-gray-300">&middot;</span>{' '}
              <span className="text-green-600">Delivered {stats?.delivered ?? 0}</span> <span className="text-gray-300">&middot;</span>{' '}
              <span className="text-purple-600">Opened {stats?.opened ?? 0}</span> <span className="text-gray-300">&middot;</span>{' '}
              <span className="text-teal-600">Read {stats?.read ?? 0}</span> <span className="text-gray-300">&middot;</span>{' '}
              <span className="text-orange-600">Clicked {stats?.clicked ?? 0}</span> <span className="text-gray-300">&middot;</span>{' '}
              <span className="text-red-600">Failed {stats?.failed ?? 0}</span>
            </p>

            <span className="text-xs font-medium text-purple-600 group-hover:text-purple-800 hover:underline transition-colors mt-1">
              View Analytics →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// what users see on day zero
const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-20"
  >
    <div className="text-6xl mb-5 float-animation">🚀</div>
    <h2 className="text-xl font-semibold text-gray-700 mb-1">No campaigns yet</h2>
    <p className="text-sm text-gray-400 mb-8">Type your first campaign goal in plain English</p>
    <Link
      to="/campaign/new"
      className="text-white rounded-lg px-6 py-3 text-sm font-semibold hover:opacity-90 transition-all duration-200 shadow-md shadow-purple-200 inline-block"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      Create Campaign
    </Link>
  </motion.div>
);


export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE}/api/campaign`);
      setCampaigns(data.slice(0, 20));
    } catch (err) {
      setError('Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // aggregate totals across all campaigns for the top metric cards
  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
  const totalDelivered = campaigns.reduce((sum, c) => sum + (c.stats?.delivered || 0), 0);
  const avgDeliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">


      <motion.div
        className="flex items-center justify-between mb-8 slide-up"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered campaigns for your customers</p>
        </div>
        <Link
          to="/campaign/new"
          className="text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-all duration-200 shadow-md shadow-purple-200"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          + New Campaign
        </Link>
      </motion.div>


      {!loading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div
            className="glass-card p-4 rounded-xl border-l-4 border-purple-500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-2xl font-bold text-gray-900">{totalCampaigns}</div>
            <div className="text-xs text-gray-500 mt-1">Total Campaigns</div>
          </motion.div>

          <motion.div
            className="glass-card p-4 rounded-xl border-l-4 border-green-500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-2xl font-bold text-gray-900">{totalSent}</div>
            <div className="text-xs text-gray-500 mt-1">Total Sent</div>
          </motion.div>

          <motion.div
            className="glass-card p-4 rounded-xl border-l-4 border-blue-500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-2xl font-bold text-gray-900">{avgDeliveryRate}%</div>
            <div className="text-xs text-gray-500 mt-1">Avg Delivery Rate</div>
          </motion.div>
        </div>
      )}


      {loading && (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}


      {!loading && error && (
        <div className="text-center py-16">
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchCampaigns}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}


      {!loading && !error && campaigns.length === 0 && <EmptyState />}


      {!loading && !error && campaigns.length > 0 && (
        <div className="space-y-4">
          <AnimatePresence>
            {campaigns.map((c, index) => (
              <CampaignCard key={c._id} campaign={c} index={index} />
            ))}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
