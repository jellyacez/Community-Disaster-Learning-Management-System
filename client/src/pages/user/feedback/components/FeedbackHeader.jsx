export default function FeedbackHeader({ onNewTicket, showForm }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Feedback &amp; Communication Center
        </h1>
        <p className="mt-1 text-sm text-gray-600 max-w-2xl">
          Send feedback, concerns, reports, or inquiries to your barangay or
          the MDRRMO. This communication center helps residents track message
          submissions and future support responses.
        </p>
      </div>
      <button
        type="button"
        onClick={onNewTicket}
        className={`shrink-0 ml-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-2xl transition-colors shadow-sm ${
          showForm
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
            : "bg-red-600 hover:bg-red-700 text-white"
        }`}
      >
        {showForm ? (
          <>
            <span className="text-base leading-none">←</span>
            Back
          </>
        ) : (
          <>
            <span className="text-base leading-none">+</span>
            New Ticket
          </>
        )}
      </button>
    </div>
  );
}
