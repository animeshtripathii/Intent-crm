import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { API_BASE } from '../config.js';

// ── Helpers ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  delivered: '#10b981', // emerald-500
  failed:     '#f43f5e', // rose-500
  opened:     '#8b5cf6', // violet-500
  read:       '#14b8a6', // teal-500
  clicked:    '#f97316', // orange-500
  sent:       '#3b82f6', // blue-500
};

const STAT_CARD_CONFIG = [
  { key: 'sent',      label: 'Sent',      icon: '📤', gradient: 'from-blue-400 to-blue-600' },
  { key: 'delivered', label: 'Delivered', icon: '✅', gradient: 'from-green-400 to-emerald-600' },
  { key: 'failed',    label: 'Failed',    icon: '❌', gradient: 'from-red-400 to-rose-600' },
  { key: 'opened',    label: 'Opened',    icon: '👁️', gradient: 'from-purple-400 to-violet-600' },
  { key: 'read',      label: 'Read',      icon: '📖', gradient: 'from-teal-400 to-cyan-600' },
  { key: 'clicked',   label: 'Clicked',   icon: '👆', gradient: 'from-orange-400 to-amber-600' },
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
  const isCompleted = status === 'completed';
  const gradient = isCompleted 
    ? 'from-green-400 to-emerald-500' 
    : 'from-blue-400 to-blue-500';
    
  return (
    <span className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize text-white bg-gradient-to-r ${gradient} shadow-md`}>
      {status}
    </span>
  );
};

const StatCard = ({ label, value, icon, gradient, index }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.1 }}
    whileHover={{ scale: 1.03, y: -2 }}
    className={`rounded-2xl p-5 flex flex-col relative overflow-hidden bg-gradient-to-br ${gradient} text-white shadow-lg`}
  >
    <div className="absolute top-4 right-4 text-2xl opacity-80">{icon}</div>
    <span className="text-4xl font-bold mb-1">{value ?? 0}</span>
    <span className="text-sm opacity-80 font-medium">{label}</span>
  </motion.div>
);

const StatusDot = ({ status }) => (
  <span
    className="inline-block w-3 h-3 rounded-full flex-shrink-0 mt-1 shadow-sm"
    style={{ backgroundColor: STATUS_COLORS[status] || '#94a3b8' }}
  />
);

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-gray-700 capitalize mb-1">{label}</p>
        <p className="text-sm font-bold" style={{ color: payload[0].payload.fill }}>
          {payload[0].value} customers
        </p>
      </div>
    );
  }
  return null;
};

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
      <div className="max-w-5xl mx-auto py-20 text-center text-gray-400">
        <div className="text-5xl mb-6 float-animation">📊</div>
        <p className="text-lg font-medium">Loading campaign analytics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-gray-400">
        <p className="text-lg">Campaign not found.</p>
        <Link to="/" className="text-purple-600 font-semibold underline mt-4 inline-block hover:text-purple-700">← Back to Dashboard</Link>
      </div>
    );
  }

  const { campaign, breakdown = [], recentActivity = [], insight } = stats;
  const isCompleted = campaign?.status === 'completed';

  // Transform breakdown for Recharts
  const chartData = breakdown
    .filter((b) => b._id !== 'sent')
    .map((b) => ({ 
      name: b._id, 
      value: b.count,
      fill: STATUS_COLORS[b._id] || '#94a3b8'
    }))
    .sort((a, b) => ['delivered', 'failed', 'opened', 'read', 'clicked'].indexOf(a.name) -
                    ['delivered', 'failed', 'opened', 'read', 'clicked'].indexOf(b.name));

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">

      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
            {campaign.name}
          </h1>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <p className="text-sm text-gray-500 font-medium">
                Last updated {timeAgo(lastUpdated)}
              </p>
            )}
            {!isCompleted && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CARD_CONFIG.map(({ key, label, icon, gradient }, index) => (
          <StatCard
            key={key}
            label={label}
            value={campaign.stats?.[key]}
            icon={icon}
            gradient={gradient}
            index={index}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Bar chart ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Delivery Breakdown</h2>
            <p className="text-sm text-gray-500 mt-1">Funnel view of your campaign performance</p>
          </div>
          {chartData.length > 0 ? (
            <div className="glass-card rounded-2xl p-6 h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#6b7280', textTransform: 'capitalize' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 13, fill: '#6b7280' }} allowDecimals={false} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6 h-[340px] flex items-center justify-center text-gray-400">
              No delivery data yet.
            </div>
          )}
          
          {/* ── AI Insight ───────────────────────────────────────────────────── */}
          {insight && (
            <div 
              className="rounded-2xl p-6 relative mt-6 bg-white"
              style={{
                background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #667eea, #764ba2) border-box',
                border: '2px solid transparent'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl float-animation">💡</span>
                <h2 className="text-lg font-bold gradient-text">AI Insight</h2>
              </div>
              <p className="text-base text-gray-700 leading-relaxed">{insight}</p>
            </div>
          )}
        </div>

        {/* ── Live Activity Feed ───────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Live Activity</h2>
            {!isCompleted && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
            )}
          </div>
          
          <div className="glass-card rounded-2xl p-5 h-[500px] flex flex-col">
            {recentActivity.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400 text-center">
                No activity yet.<br/>Messages are being dispatched...
              </div>
            ) : (
              <div className="space-y-1 overflow-y-auto pr-2 flex-1 scrollbar-thin">
                <AnimatePresence>
                  {recentActivity.map((item) => (
                    <motion.div 
                      key={item._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
                    >
                      <StatusDot status={item.status} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">
                          <span className="text-sm font-bold text-gray-900">
                            {item.customerId?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">
                            {item.customerId?.city ? `(${item.customerId.city})` : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span
                            className="text-xs font-bold capitalize px-2 py-0.5 rounded-md"
                            style={{ 
                              color: STATUS_COLORS[item.status] || '#94a3b8',
                              backgroundColor: `${STATUS_COLORS[item.status] || '#94a3b8'}15`
                            }}
                          >
                            {item.status}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            {formatTime(item.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Back button ──────────────────────────────────────────────────── */}
      <div className="pt-4 pb-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
