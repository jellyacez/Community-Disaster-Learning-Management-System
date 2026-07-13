export default function QuizStateMessage({ type, onBypass, onRestart }) {
  if (type === "loading") {
    return (
      <div className="p-12 text-center text-gray-500 bg-white border border-gray-100 rounded-3xl shadow-sm">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="animate-pulse font-bold">Loading assessment securely...</p>
      </div>
    );
  }

  if (type === "locked") {
    return (
      <div className="bg-red-50 text-red-700 p-8 rounded-3xl border border-red-200 text-center shadow-sm">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h3 className="text-2xl font-bold mb-2">Assessment Locked</h3>
        <p className="text-red-600 mb-6">Multiple unauthorized navigation events were detected, violating academic integrity protocols.</p>
        <button onClick={onRestart} className="px-8 py-3 bg-red-600 hover:bg-red-700 transition text-white rounded-xl font-bold shadow-md shadow-red-600/20">Restart Assessment</button>
      </div>
    );
  }

  if (type === "empty") {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 border border-gray-200 rounded-3xl">
        <h3 className="text-lg font-bold mb-2">No Questions Found</h3>
        <p className="text-sm">This assessment currently has no questions assigned to it.</p>
        <button onClick={onBypass} className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition">Bypass Assessment</button>
      </div>
    );
  }

  return null;
}
