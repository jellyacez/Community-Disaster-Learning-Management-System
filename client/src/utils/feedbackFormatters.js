import {
  CancelCircleIcon,
  MailReply01Icon,
  Clock01Icon,
  AlertCircleIcon,
  RefreshIcon
} from "@hugeicons/core-free-icons";

export const getTypeBadgeClasses = (type) => {
  switch (type) {
    case "report":
      return "bg-red-100 text-red-800 border border-transparent dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60";
    case "concern":
      return "bg-amber-100 text-amber-800 border border-transparent dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60";
    case "inquiry":
      return "bg-blue-100 text-blue-800 border border-transparent dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60";
    case "feedback":
    default:
      return "bg-emerald-100 text-emerald-800 border border-transparent dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60";
  }
};

export const getStatusBadgeClasses = (status) => {
  switch (status) {
    case "Closed":
      return "bg-gray-200 text-gray-800 border border-transparent dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    case "Replied":
      return "bg-emerald-100 text-emerald-800 border border-transparent dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60";
    case "Sync Failed":
      return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60";
    case "Syncing":
    case "Queued Offline":
      return "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60";
    case "Pending":
    default:
      return "bg-amber-100 text-amber-800 border border-transparent dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60";
  }
};

export const getStatusIcon = (status) => {
  switch (status) {
    case "Closed":
      return CancelCircleIcon;
    case "Replied":
      return MailReply01Icon;
    case "Sync Failed":
      return AlertCircleIcon;
    case "Syncing":
    case "Queued Offline":
      return RefreshIcon;
    case "Pending":
    default:
      return Clock01Icon;
  }
};

export const formatMessageTimestamp = (currentDateString, previousDateString, index) => {
  const current = new Date(currentDateString);
  const timeString = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (index === 0 || !previousDateString) {
    return `${current.toLocaleDateString()} at ${timeString}`;
  }
  
  const prev = new Date(previousDateString);
  if (current.toDateString() === prev.toDateString()) {
    return timeString; // Same day, just time
  }
  return `${current.toLocaleDateString()} at ${timeString}`; // Crossed a day boundary
};
