import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { API_BASE } from '../config.js';

// ── Helpers ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  delivered: '#22c55e',
  failed:    '#ef4444',
  opened:    '#a855f7',
  read:      '#14b8a6',
  clicked:   '#f97316',
  sent:      '#94a3b8',
};

const STAT_CARD_CONFIG = [
  { key: 'sent',      label: 'Sent',      color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { key: 'delivered', label: 'Delivered', color: 'text-green-600',  bg: 'bg-green-50'  },
  { key: 'failed',    label: 'Failed',    color: 'text-red-600',    bg: 'bg-red-50'    },
  { key: 'opened',    label: 'Opened',    color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'read',      label: 'Read',      color: 'text-teal-600',   bg: 'bg-teal-50'   },
  { key: 'clicked',   label: 'Clicked',   color: 'text-orange-600', bg: 'bg-orange-50' },
];

const timeAgo = (date) => {
  if (!date) return '';
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 5)  return 'just now';
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
};

const formatTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

// ── Sub-components ────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    draft:     'bg-gray-100 text-gray-600',
    sending:   'bg-yellow-100 text-yellow-700',
    sent:      'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const StatCard = ({ label, value, color, bg }) => (
  <div className={`rounded-xl ${bg} p-4 flex flex-col items-center flex-1 min-w-0`}>
    <span className={`text-3xl font-bold ${color}`}>{value ?? 0}</span>
    <span className="text-xs text-gray-500 mt-1 font-medium">{label}</span>
  </div>
);

const StatusDot = ({ status }) => (
  <span
    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
    style={{ backgroundColor: STATUS_COLORS[status] || '#94a3b8' }}
  />
);

// ── Main Component ────────────────────────────────────────────────────────
export default function CampaignAnalytics() {
  const { id } = useParams();
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [lastUpdated, setLastUpdated]   = useState(null);
  const intervalRef                     = useRef(null);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/stats/${id}`);
      setStats(data);
      setLastUpdated(new Date());

      // Stop polling when completed
      if (data.campaign?.status === 'completed' && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 3000);
    return () => clearInterval(intervalRef.current);
  }, [id]);

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-gray-400">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-sm">Loading campaign analytics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-gray-400">
        <p className="text-sm">Campaign not found.</p>
        <Link to="/" className="text-black underline text-sm mt-4 inline-block">← Back to Dashboard</Link>
      </div>
    );
  }

  const { campaign, breakdown = [], recentActivity = [], insight } = stats;
  const isCompleted = campaign?.status === 'completed';

  // Transform breakdown for Recharts
  const chartData = breakdown
    .filter((b) => b._id !== 'sent')
    .map((b) => ({ name: b._id, value: b.count }))
    .sort((a, b) => ['delivered', 'failed', 'opened', 'read', 'clicked'].indexOf(a.name) -
                    ['delivered', 'failed', 'opened', 'read', 'clicked'].indexOf(b.name));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">

      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {campaign.name}
          </h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {timeAgo(lastUpdated)}
            </p>
          )}
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        {STAT_CARD_CONFIG.map(({ key, label, color, bg }) => (
          <StatCard
            key={key}
            label={label}
            value={campaign.stats?.[key]}
            color={color}
            bg={bg}
          />
        ))}
      </div>

      {/* ── Bar chart ───────────────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Delivery Breakdown</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, textTransform: 'capitalize' }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(val, name) => [val, name.charAt(0).toUpperCase() + name.slice(1)]}
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] || '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Live Activity Feed ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Live Activity</h2>
          {!isCompleted && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          )}
          {isCompleted && <span className="text-xs text-gray-400">(completed)</span>}
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet. Messages are being dispatched...</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recentActivity.map((item) => (
              <div key={item._id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <StatusDot status={item.status} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-800 font-medium">
                    {item.customerId?.name || 'Unknown'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {' '}from {item.customerId?.city || '—'}
                  </span>
                  <span className="text-gray-400 mx-1">→</span>
                  <span
                    className="text-sm font-semibold capitalize"
                    style={{ color: STATUS_COLORS[item.status] || '#94a3b8' }}
                  >
                    {item.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatTime(item.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AI Insight ───────────────────────────────────────────────────── */}
      {insight && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💡</span>
            <h2 className="text-sm font-semibold text-yellow-900">AI Insight</h2>
          </div>
          <p className="text-sm text-yellow-800 leading-relaxed">{insight}</p>
        </div>
      )}

      {/* ── Back button ──────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/"
          className="inline-block text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
