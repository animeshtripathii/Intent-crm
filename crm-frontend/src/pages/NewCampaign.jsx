// the core chat-to-campaign flow. users type intent, preview the segment, and dispatch.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../config.js';
const formatRs = (n) => `Rs ${Number(n).toLocaleString('en-IN')}`;

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 mr-2 inline" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const EXAMPLE_PROMPTS = [
  "Win back lapsed customers with 15% off",
  "Reward VIP customers in Delhi",
  "Re-engage new customers who haven't bought yet"
];


export default function NewCampaign() {
  const [intent, setIntent]         = useState('');
  const [channel, setChannel]       = useState('whatsapp');
  const [step, setStep]             = useState('input');       // input | preview | sending | sent
  const [campaignData, setCampaign] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // hit the backend to parse natural language into segment filters and get preview samples
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

  // lock it in and fire off the dispatch
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

  // clear everything to start fresh
  const handleReset = () => {
    setIntent('');
    setChannel('whatsapp');
    setStep('input');
    setCampaign(null);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">


        {(step === 'input' || step === 'preview') && (
          <div className="mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">What's your campaign goal?</h1>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-500 mb-6"
            >
              Describe it in plain English — AI handles the rest
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <textarea
                rows={4}
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                disabled={loading || step === 'preview'}
                placeholder="e.g. Win back customers who haven't bought in 60 days with a 15% discount..."
                className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-lg resize-none min-h-32 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-50 disabled:text-gray-400 transition-all shadow-sm"
              />

              {/* quick start suggestions for the empty state */}
              {step === 'input' && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {EXAMPLE_PROMPTS.map((prompt, i) => (
                    <motion.button
                      key={prompt}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + (i * 0.1) }}
                      onClick={() => setIntent(prompt)}
                      className="rounded-full border border-purple-200 text-purple-600 px-4 py-1.5 text-sm hover:bg-purple-50 transition-colors bg-white shadow-sm"
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  disabled={loading || step === 'preview'}
                  className="rounded-lg border-2 border-gray-200 px-4 py-3 text-base focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50 shadow-sm"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="rcs">RCS</option>
                </select>

                {step === 'input' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAnalyse}
                    disabled={!intent.trim() || loading}
                    className="rounded-xl px-8 py-3 text-base font-semibold text-white shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full sm:w-auto"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  >
                    {loading && <Spinner />}
                    {loading ? 'Analysing with AI...' : 'Analyse Segment'}
                  </motion.button>
                )}
              </div>
            </motion.div>


            {error && step === 'input' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl bg-red-50 border border-red-200 text-red-700 px-5 py-4 text-sm font-medium shadow-sm"
              >
                {error}
              </motion.div>
            )}
          </div>
        )}


        <AnimatePresence>
          {step === 'preview' && campaignData && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >

              {campaignData.segmentCount > 0 ? (
                <div className="rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white px-6 py-6 text-center shadow-lg shadow-green-200">
                  <div className="text-4xl font-bold mb-1">
                    ✓ {campaignData.segmentCount}
                  </div>
                  <div className="text-lg opacity-90 font-medium">customers matched</div>
                </div>
              ) : (
                <div className="rounded-xl bg-gradient-to-r from-red-400 to-rose-500 text-white px-6 py-6 text-center shadow-lg shadow-red-200">
                  <div className="text-4xl font-bold mb-1">✗ 0</div>
                  <div className="text-lg opacity-90 font-medium">No customers matched — try a different campaign goal</div>
                </div>
              )}

              {/* show a yellow flag if the AI couldn't parse any filters so the user knows they're blasting the whole db */}
              {campaignData.warning && (
                <div className="rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 px-5 py-4 text-sm font-medium shadow-sm">
                  ⚠️ {campaignData.warning}
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-5 py-4 text-sm font-medium shadow-sm">
                  {error}
                </div>
              )}

              {/* debug view of what the AI actually parsed */}
              {campaignData.filters && Object.keys(campaignData.filters).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(campaignData.filters).map(([k, v]) => (
                    <span key={k} className="rounded-full bg-purple-600 text-white px-4 py-1.5 text-sm font-medium shadow-md flex items-center gap-1.5">
                      <span className="opacity-75">✦</span>
                      {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  ))}
                </div>
              )}


              {campaignData.sampleCustomers?.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 pl-1">
                    Sample Customers
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {campaignData.sampleCustomers.map((c) => (
                      <motion.div 
                        key={c._id} 
                        whileHover={{ scale: 1.02 }}
                        className="glass-card rounded-xl p-5"
                      >
                        <p className="font-bold text-gray-900 text-base truncate">{c.name}</p>
                        <p className="text-sm text-gray-500 mb-3">{c.city}</p>
                        <p className="text-lg text-green-600 font-semibold mb-3">{formatRs(c.totalSpend)}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(c.tags || []).map((t) => (
                            <span key={t} className="rounded-full bg-purple-100 text-purple-700 px-2.5 py-1 text-xs font-semibold">
                              {t}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}


              {campaignData.sampleMessages?.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 pl-1">
                    Sample Messages
                  </h2>
                  <div className="space-y-3">
                    {campaignData.sampleMessages.map((msg, i) => (
                      <div 
                        key={i} 
                        className="rounded-xl bg-purple-50 p-5 text-base text-gray-800 italic shadow-sm"
                        style={{ borderLeft: '3px solid', borderImage: 'linear-gradient(to bottom, #a855f7, #3b82f6) 1' }}
                      >
                        "{msg}"
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {campaignData.segmentCount > 0 && (
                <div className="pt-4 pb-10">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleSend}
                    className="w-full rounded-xl py-4 text-lg font-bold text-white shadow-xl shadow-purple-200 flex items-center justify-center gap-3"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  >
                    <span className="text-2xl">🚀</span> Approve & Send Campaign
                  </motion.button>
                  <div className="text-center mt-6">
                    <button
                      onClick={handleReset}
                      className="text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      ← Start over with a different goal
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>


        {step === 'sending' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">
              🚀 Sending to {campaignData?.segmentCount} customers...
            </h2>
            {/* fake 8-second progress bar to make the 'sending' state feel responsive */}
            <div className="w-full bg-white rounded-full h-3 shadow-inner overflow-hidden border border-gray-100">
              <motion.div 
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #a855f7, #3b82f6)' }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 8, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}


        {step === 'sent' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="text-7xl mb-6 float-animation">✅</div>
            <h2 className="text-3xl font-bold gradient-text mb-3">Campaign Sent!</h2>
            <p className="text-gray-500 text-lg mb-10">
              Dispatched to {campaignData?.segmentCount} customers
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={`/analytics/${campaignData?.campaignId}`}
                className="rounded-xl px-8 py-3 text-base font-semibold text-white hover:opacity-90 transition-all shadow-lg shadow-purple-200"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                View Analytics →
              </Link>
              <button
                onClick={handleReset}
                className="rounded-xl px-8 py-3 text-base font-semibold text-gray-700 bg-white border-2 border-gray-100 hover:bg-gray-50 transition-all shadow-sm"
              >
                Create another
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
