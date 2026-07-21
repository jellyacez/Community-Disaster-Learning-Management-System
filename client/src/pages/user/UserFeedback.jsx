import { useMemo, useState } from "react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message01Icon,
  SentIcon,
  Building01Icon,
  Alert01Icon,
  Call02Icon,
  Search01Icon,
  Clock01Icon,
  MailReply01Icon,
  CancelCircleIcon,
} from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";

export default function UserFeedback() {
  useDocumentTitle("Feedback | Bacolor LMS");

  const [formData, setFormData] = useState({
    recipient: "barangay",
    type: "feedback",
    subject: "",
    message: "",
  });

  const [activeTab, setActiveTab] = useState("all");
  const [submissions, setSubmissions] = useState([]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      toast.error("Please enter a subject.");
      return;
    }

    if (!formData.message.trim()) {
      toast.error("Please enter your message.");
      return;
    }

    const newSubmission = {
      id: Date.now(),
      recipient: formData.recipient,
      type: formData.type,
      subject: formData.subject,
      message: formData.message,
      status: "Pending",
      createdAt: new Date().toLocaleString(),
      reply: null,
    };

    setSubmissions((prev) => [newSubmission, ...prev]);
    setActiveTab("all");

    toast.success("Your message has been submitted.");

    setFormData({
      recipient: "barangay",
      type: "feedback",
      subject: "",
      message: "",
    });
  };

  const getTypeBadgeClasses = (type) => {
    switch (type) {
      case "report":
        return "bg-red-100 text-red-700";
      case "concern":
        return "bg-amber-100 text-amber-700";
      case "inquiry":
        return "bg-blue-100 text-blue-700";
      case "feedback":
      default:
        return "bg-emerald-100 text-emerald-700";
    }
  };

  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case "Closed":
        return "bg-gray-200 text-gray-700";
      case "Replied":
        return "bg-blue-100 text-blue-700";
      case "Pending":
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Closed":
        return CancelCircleIcon;
      case "Replied":
        return MailReply01Icon;
      case "Pending":
      default:
        return Clock01Icon;
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (activeTab === "all") return submissions;
    return submissions.filter(
      (item) => item.status.toLowerCase() === activeTab.toLowerCase()
    );
  }, [activeTab, submissions]);

  const tabs = [
    { key: "all", label: "All", count: submissions.length },
    {
      key: "pending",
      label: "Pending",
      count: submissions.filter((item) => item.status === "Pending").length,
    },
    {
      key: "replied",
      label: "Replied",
      count: submissions.filter((item) => item.status === "Replied").length,
    },
    {
      key: "closed",
      label: "Closed",
      count: submissions.filter((item) => item.status === "Closed").length,
    },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Feedback & Communication Center
          </h1>
          <p className="mt-1 text-sm text-gray-600 max-w-2xl">
            Send feedback, concerns, reports, or inquiries to your barangay or
            the MDRRMO. This communication center helps residents track message
            submissions and future support responses.
          </p>
        </div>

        {/* Top info cards */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <HugeiconsIcon
                icon={Building01Icon}
                className="w-5 h-5 text-red-600"
              />
              <h2 className="font-black text-gray-900">Communication Target</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Choose whether your message should go to your local barangay or to
              the MDRRMO for broader municipal concerns.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <HugeiconsIcon
                icon={Alert01Icon}
                className="w-5 h-5 text-amber-500"
              />
              <h2 className="font-black text-gray-900">Types of Messages</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              You can submit feedback, inquiries, concerns, or local incident
              reports as part of your learner support and communication flow.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <HugeiconsIcon
                icon={Call02Icon}
                className="w-5 h-5 text-emerald-600"
              />
              <h2 className="font-black text-gray-900">Support Reminder</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              For urgent emergencies, contact the proper hotline or local
              response team directly. This form is intended for platform
              communication and non-emergency concerns.
            </p>
          </div>
        </div>

        {/* Main area */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Form */}
          <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <HugeiconsIcon
                icon={Message01Icon}
                className="w-5 h-5 text-red-600"
              />
              <h2 className="text-xl font-black text-gray-900">
                Send a Message
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Complete the form below to send your message to the selected
              office.
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all duration-300"
                >
                  <HugeiconsIcon icon={SentIcon} className="w-4 h-4" />
                  Submit Message
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-black text-gray-900 mb-2">
                Communication Notes
              </h2>
              <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                  <span>
                    Use <strong>Barangay</strong> for local concerns and nearby
                    community issues.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                  <span>
                    Use <strong>MDRRMO</strong> for larger disaster management
                    concerns or municipal-level questions.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                  <span>
                    This communication center is currently a frontend
                    placeholder and can later be connected to live backend
                    records.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-2">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="w-5 h-5 text-gray-500"
                />
                <h2 className="text-xl font-black text-gray-900">
                  Submission Summary
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 mt-4">
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Total Messages
                  </p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    {submissions.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Pending
                  </p>
                  <p className="text-2xl font-black text-amber-600 mt-1">
                    {
                      submissions.filter((item) => item.status === "Pending")
                        .length
                    }
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Replied
                  </p>
                  <p className="text-2xl font-black text-blue-600 mt-1">
                    {
                      submissions.filter((item) => item.status === "Replied")
                        .length
                    }
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Closed
                  </p>
                  <p className="text-2xl font-black text-gray-700 mt-1">
                    {
                      submissions.filter((item) => item.status === "Closed")
                        .length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message history */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                Communication History
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Track your submitted concerns, inquiries, feedback, and reports.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    activeTab === tab.key
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
              <HugeiconsIcon
                icon={Message01Icon}
                className="w-12 h-12 text-gray-300 mx-auto mb-4"
              />
              <h3 className="text-2xl font-black text-gray-900 mb-2">
                No communication history yet
              </h3>
              <p className="text-gray-500 max-w-xl mx-auto mb-2">
                You haven&apos;t submitted any feedback, reports, concerns, or
                inquiries yet.
              </p>
              <p className="text-sm text-gray-400">
                Your submitted messages will appear here once you send your
                first communication.
              </p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
              <p className="text-lg font-bold text-gray-800 mb-2">
                No messages in this category
              </p>
              <p className="text-sm text-gray-500">
                Try switching tabs or submit a new message to populate this
                communication history.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredSubmissions.map((item) => {
                const StatusIcon = getStatusIcon(item.status);

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${getTypeBadgeClasses(
                              item.type
                            )}`}
                          >
                            {item.type}
                          </span>

                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
                            {item.recipient === "mdrrmo" ? "MDRRMO" : "Barangay"}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadgeClasses(
                              item.status
                            )}`}
                          >
                            <HugeiconsIcon
                              icon={StatusIcon}
                              className="w-3.5 h-3.5"
                            />
                            {item.status}
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-gray-900">
                          {item.subject}
                        </h3>

                        <p className="text-xs text-gray-400 mt-1 mb-3">
                          Submitted: {item.createdAt}
                        </p>

                        <div className="rounded-2xl bg-white border border-gray-100 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                            Your Message
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                            {item.message}
                          </p>
                        </div>

                        {item.reply && (
                          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 mt-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-2">
                              Office Response
                            </p>
                            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                              {item.reply}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}