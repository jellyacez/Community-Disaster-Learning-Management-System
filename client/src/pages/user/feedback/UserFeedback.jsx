import { useState } from "react";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import { authClient } from "../../../lib/auth-client";

import FeedbackHeader from "./components/FeedbackHeader";
import FeedbackForm from "./components/FeedbackForm";
import FeedbackHistory from "./components/FeedbackHistory";

export default function UserFeedback() {
  useDocumentTitle("Feedback | Bacolor LMS");

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="w-full max-w-full min-w-0 pb-6 sm:pb-10 animate-in fade-in duration-200">
      <div className="flex flex-col space-y-4 sm:space-y-6 w-full">
        <div className="w-full min-w-0">
          <FeedbackHeader
            onNewTicket={() => setShowForm((v) => !v)}
            showForm={showForm}
          />
        </div>

        {showForm && (
          <div className="w-full min-w-0 animate-in fade-in slide-in-from-top-2 duration-200">
            <FeedbackForm
              userId={userId}
              setActiveTab={setActiveTab}
              onDone={() => setShowForm(false)}
            />
          </div>
        )}

        <div className="w-full min-w-0">
          <FeedbackHistory
            userId={userId}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
}
