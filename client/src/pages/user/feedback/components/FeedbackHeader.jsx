export default function FeedbackHeader({ onNewTicket, showForm }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 w-full">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight leading-tight break-words">
          Feedback &amp; Communication Center
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          Send feedback, concerns, reports, or inquiries to your barangay or
          the MDRRMO. This communication center helps residents track message
          submissions and future support responses.
        </p>
      </div>

      <button
        type="button"
        onClick={onNewTicket}
        className={`w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 min-h-[42px] text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] shadow-xs cursor-pointer select-none ${
          showForm
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-gray-200/80 dark:border-slate-700"
            : "bg-red-600 hover:bg-red-700 text-white"
        }`}
      >
        {showForm ? (
          <>
            <span className="text-base leading-none">&larr;</span>
            <span>Back</span>
          </>
        ) : (
          <>
            <span className="text-base leading-none">+</span>
            <span>New Ticket</span>
          </>
        )}
      </button>
    </div>
  );
}
