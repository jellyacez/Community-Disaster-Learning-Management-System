import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { useFeedbackSubmit } from "../hooks/useFeedbackSubmit";

export default function FeedbackForm({ userId, setActiveTab }) {
  const { formData, handleChange, handleSubmit, submitMutation } = useFeedbackSubmit(userId, setActiveTab);

  const recipientInfo = useMemo(() => {
    if (formData.recipient === "mdrrmo") {
      return {
        title: "MDRRMO",
        description:
          "For municipal-level concerns, disaster coordination, larger system issues, or reports needing higher-level review.",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-100",
      };
    }

    return {
      title: "Barangay",
      description:
        "For local community concerns, localized reports, barangay-level follow-ups, and resident assistance.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    };
  }, [formData.recipient]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <HugeiconsIcon icon={Message01Icon} className="w-5 h-5 text-red-600" />
        <h2 className="text-xl font-black text-gray-900">Send a Message</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Complete the form below to send your message to the selected office.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Recipient
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label
              className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                formData.recipient === "barangay"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="recipient"
                value="barangay"
                checked={formData.recipient === "barangay"}
                onChange={handleChange}
                className="hidden"
              />
              <p className="font-bold text-gray-900">Barangay</p>
              <p className="text-sm text-gray-500 mt-1">
                Local-level support and concerns
              </p>
            </label>

            <label
              className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                formData.recipient === "mdrrmo"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="recipient"
                value="mdrrmo"
                checked={formData.recipient === "mdrrmo"}
                onChange={handleChange}
                className="hidden"
              />
              <p className="font-bold text-gray-900">MDRRMO</p>
              <p className="text-sm text-gray-500 mt-1">
                Municipal-level communication and escalation
              </p>
            </label>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 ${recipientInfo.bg} ${recipientInfo.border}`}
        >
          <p className={`font-bold ${recipientInfo.color}`}>
            Sending to {recipientInfo.title}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {recipientInfo.description}
          </p>
        </div>

        <div>
          <label
            htmlFor="type"
            className="block text-sm font-bold text-gray-700 mb-2"
          >
            Message Type
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="feedback">Feedback</option>
            <option value="inquiry">Inquiry</option>
            <option value="concern">Concern</option>
            <option value="report">Report</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-bold text-gray-700 mb-2"
          >
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Enter subject"
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-bold text-gray-700 mb-2"
          >
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={7}
            value={formData.message}
            onChange={handleChange}
            placeholder="Write your feedback, concern, inquiry, or report here..."
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-2xl transition-all duration-300"
          >
            <HugeiconsIcon icon={SentIcon} className="w-4 h-4" />
            {submitMutation.isPending ? "Submitting..." : "Submit Message"}
          </button>
        </div>
      </form>
    </div>
  );
}
