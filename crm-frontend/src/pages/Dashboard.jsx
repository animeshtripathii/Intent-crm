import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config.js';

// ── Helpers ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600'   },
  sending:   { label: 'Sending',   cls: 'bg-blue-100 text-blue-700'   },
  sent:      { label: 'Sent',      cls: 'bg-blue-100 text-blue-700'   },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) : '—';

const truncate = (str, n) =>
  str && str.length > n ? str.slice(0, n) + '…' : str;

// ── Skeleton card ─────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
    <div className="flex justify-between gap-4">
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/5" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
        <div className="h-3 w-40 bg-gray-100 rounded" />
      </div>
    </div>
  </div>
);

// ── Status badge ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const { label, cls } = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

// ── Campaign card ─────────────────────────────────────────────────────────
const CampaignCard = ({ campaign }) => {
  const { _id, name, naturalLanguageIntent, createdAt, status, stats } = campaign;

  return (
    <Link
      to={`/analytics/${_id}`}
      className="group block rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">

        {/* Left — name, intent, date */}
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

        {/* Right — badge, stats, link */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <StatusBadge status={status} />

          <p className="text-xs text-gray-500 whitespace-nowrap">
            Sent {stats?.sent ?? 0} &middot; Delivered {stats?.delivered ?? 0} &middot; Opened {stats?.opened ?? 0} &middot; Clicked {stats?.clicked ?? 0}
          </p>

          <span className="text-xs font-medium text-indigo-600 group-hover:text-indigo-800 transition-colors">
            View Analytics →
          </span>
        </div>
      </div>
    </Link>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="text-center py-20">
    <div className="text-6xl mb-5">📭</div>
    <h2 className="text-lg font-semibold text-gray-800 mb-1">No campaigns yet</h2>
    <p className="text-sm text-gray-400 mb-8">Create your first AI-powered campaign</p>
    <Link
      to="/campaign/new"
      className="inline-block rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow"
    >
      Create Campaign
    </Link>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Link
          to="/campaign/new"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm"
        >
          + New Campaign
        </Link>
      </div>

      {/* ── Loading skeleton ───────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────── */}
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

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!loading && !error && campaigns.length === 0 && <EmptyState />}

      {/* ── Campaign list ─────────────────────────────────────────────── */}
      {!loading && !error && campaigns.length > 0 && (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <CampaignCard key={c._id} campaign={c} />
          ))}
        </div>
      )}

    </div>
  );
}
