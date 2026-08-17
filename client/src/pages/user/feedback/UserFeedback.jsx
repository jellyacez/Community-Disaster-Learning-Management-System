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
    <div className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <FeedbackHeader onNewTicket={() => setShowForm((v) => !v)} showForm={showForm} />

        {showForm && (
          <FeedbackForm
            userId={userId}
            setActiveTab={setActiveTab}
            onDone={() => setShowForm(false)}
          />
        )}
        
        <FeedbackHistory 
          userId={userId} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
      </div>
    </div>
  );
}
