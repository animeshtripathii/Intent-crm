import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config.js';

// ── Helpers ─────────────────────────────────────────────────────────────
const formatRs = (n) => `Rs ${Number(n).toLocaleString('en-IN')}`;

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 mr-2 inline" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

// ── Main Component ───────────────────────────────────────────────────────
export default function NewCampaign() {
  const [intent, setIntent]         = useState('');
  const [channel, setChannel]       = useState('whatsapp');
  const [step, setStep]             = useState('input');       // input | preview | sending | sent
  const [campaignData, setCampaign] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // ── Step 1 — Analyse ──────────────────────────────────────────────────
  const handleAnalyse = async () => {
    if (!intent.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_BASE}/api/campaign`, {
        naturalLanguageIntent: intent,
        channel,
      });
      setCampaign(data);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 — Approve & Send ───────────────────────────────────────────
  const handleSend = async () => {
    setStep('sending');
    setError(null);
    try {
      await axios.post(`${API_BASE}/api/campaign/${campaignData.campaignId}/send`);
      setStep('sent');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send campaign.');
      setStep('preview');
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    setIntent('');
    setChannel('whatsapp');
    setStep('input');
    setCampaign(null);
    setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">

      {/* ── Section 1: Chat Input (always visible) ─────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">New Campaign</h1>
        <p className="text-gray-500 text-sm mb-4">Describe your campaign goal in plain English</p>

        <textarea
          rows={4}
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          disabled={step === 'sending' || step === 'sent'}
          placeholder='e.g. Win back customers who haven&apos;t bought in 60 days with 15% off'
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        />

        <div className="flex items-center justify-between mt-3">
          {/* Channel selector */}
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            disabled={step === 'sending' || step === 'sent'}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-50"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="rcs">RCS</option>
          </select>

          {/* Analyse button */}
          <button
            onClick={handleAnalyse}
            disabled={!intent.trim() || loading || step !== 'input'}
            className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center"
          >
            {loading && <Spinner />}
            {loading ? 'Analysing...' : 'Analyse Segment'}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* ── Section 2: Segment Preview ─────────────────────────────────── */}
      {step === 'preview' && campaignData && (
        <div className="space-y-6">

          {/* Matched count */}
          {campaignData.segmentCount > 0 ? (
            <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm font-medium">
              ✓ {campaignData.segmentCount} customers matched
            </div>
          ) : (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">
              ✗ No customers matched — try a different campaign goal
            </div>
          )}

          {/* Warning (if filters were empty) */}
          {campaignData.warning && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 text-sm">
              ⚠️ {campaignData.warning}
            </div>
          )}

          {/* Filters badges */}
          {campaignData.filters && Object.keys(campaignData.filters).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(campaignData.filters).map(([k, v]) => (
                <span key={k} className="rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-xs font-mono">
                  {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              ))}
            </div>
          )}

          {/* Sample customer cards */}
          {campaignData.sampleCustomers?.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Sample Customers
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {campaignData.sampleCustomers.map((c) => (
                  <div key={c._id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{c.city}</p>
                    <p className="text-xs text-gray-700 mt-1 font-medium">{formatRs(c.totalSpend)}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(c.tags || []).map((t) => (
                        <span key={t} className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample messages */}
          {campaignData.sampleMessages?.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Sample Messages
              </h2>
              <div className="space-y-2">
                {campaignData.sampleMessages.map((msg, i) => (
                  <div key={i} className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-900">
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              ← Start over
            </button>
            <button
              onClick={handleSend}
              className="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow"
            >
              Approve & Send Campaign
            </button>
          </div>
        </div>
      )}

      {/* ── Section 3: Sending State ────────────────────────────────────── */}
      {step === 'sending' && (
        <div className="text-center py-12">
          <p className="text-gray-700 text-base font-medium mb-6">
            🚀 Sending campaign to {campaignData?.segmentCount} customers...
          </p>
          {/* Animated progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="h-2 bg-black rounded-full animate-progress" />
          </div>
          <style>{`
            @keyframes progress {
              0%   { width: 0%; margin-left: 0%; }
              50%  { width: 70%; margin-left: 15%; }
              100% { width: 0%; margin-left: 100%; }
            }
            .animate-progress {
              animation: progress 1.8s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}

      {/* ── Section 4: Sent Confirmation ────────────────────────────────── */}
      {step === 'sent' && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Campaign sent successfully!</h2>
          <p className="text-gray-500 text-sm mb-8">
            Dispatched to {campaignData?.segmentCount} customers
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={`/analytics/${campaignData?.campaignId}`}
              className="inline-block rounded-lg bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              View Analytics →
            </Link>
            <Link
              to="/"
              className="inline-block rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
