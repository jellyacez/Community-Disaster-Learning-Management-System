import {
  CancelCircleIcon,
  MailReply01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";

export const getTypeBadgeClasses = (type) => {
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

export const getStatusBadgeClasses = (status) => {
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

export const getStatusIcon = (status) => {
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
