// A dummy
export const FAQ_ITEMS = [
  {
    id: "offline-sync",
    category: "Offline & Resilience",
    question: "How do learning modules and progress work during network outages or typhoons?",
    answer:
      "The LMS operates offline via client-side IndexedDB local caching. You can read previously downloaded lessons and complete module quizzes even without an active internet connection. As soon as connectivity is restored, our background sync engine automatically transmits your completed progress to the server securely using your authenticated session.",
  },
  {
    id: "cert-validity",
    category: "Certifications",
    question: "How long is my disaster preparedness certification valid, and how do I renew it?",
    answer:
      "Disaster preparedness certificates remain valid for one (1) full year from the date of issuance. 30 days prior to expiration, our automated system sends proactive email notifications to remind you to recertify. You can retake the module assessment anytime during this renewal window to extend your credential for an additional year.",
  },
  {
    id: "qr-verification",
    category: "Verification & Credentialing",
    question: "How can Barangay officials, employers, or relief coordinators verify my credential?",
    answer:
      "Every certificate issued by the platform features a secure, tamper-proof cryptographic token and embedded QR code. Officials or relief coordinators can scan the QR code using any smartphone camera or visit our public verification portal to immediately validate authenticity against the municipal DRRM registry.",
  },
  {
    id: "privacy-rights",
    category: "Data Privacy & Compliance",
    question: "How is my personal information protected, and what happens if I delete my account?",
    answer:
      "We strictly adhere to Republic Act No. 10173 (Philippine Data Privacy Act of 2012). If you exercise your Right to Be Forgotten and delete your account, your personal identifying records (name, email, credentials) are purged from the active system. Historical certificate records are anonymized to 'Archived Resident' so that issued qualifications remain authentic without compromising your privacy.",
  },
  {
    id: "dialects-localization",
    category: "Language & Accessibility",
    question: "Are disaster training modules available in Kapampangan or Tagalog?",
    answer:
      "The platform currently operates in English by default. Dialect localizations for Kapampangan (pam) and Tagalog (tl) are actively being developed for core disaster risk reduction modules to ensure lifelines and safety manuals are easily accessible across all local communities.",
  },
];