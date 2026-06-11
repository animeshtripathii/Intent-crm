function NewCampaign() {
  return (
    <div className="max-w-xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">New Campaign</h1>

      <input
        type="text"
        placeholder="Describe your campaign goal..."
        className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
      />

      <button
        disabled
        className="mt-4 w-full rounded-md bg-gray-300 px-4 py-3 text-sm font-medium text-gray-500 cursor-not-allowed"
      >
        Analyse Segment
      </button>

      <p className="mt-4 text-xs text-gray-400 text-center">
        AI integration coming in Day 2
      </p>
    </div>
  );
}

export default NewCampaign;
