export const initialModules = [
  { 
    id: 1, 
    title: "Flood Evacuation Protocol", 
    description: "Standard step-by-step procedures for severe flood handling.", 
    riskLevel: "High",
    status: "Public",
    flows: [
      { type: "text", title: "Introduction", textContent: "Basic guidelines for local evacuation areas." },
      { type: "video", title: "Boat Guide", videoUrl: "https://www.youtube.com/watch?v=example" }
    ]
  },
  { 
    id: 2, 
    title: "Typhoon Basic Setup", 
    description: "How to allocate standard barangay supplies ahead of heavy rain.", 
    riskLevel: "Medium",
    status: "Private",
    flows: [
      { type: "text", title: "Supply Checklist", textContent: "Check list details for life vests and food kits." }
    ]
  }
];

export const initialUsers = [
  { id: 1, name: "Juan Dela Cruz", email: "juan@mdrrmo.gov.ph", role: "MDRRM Officer" },
  { id: 2, name: "Maria Santos", email: "maria@mdrrmo.gov.ph", role: "Field Responder" }
];

export const initialResidents = [
  { id: 101, name: "Carlos Pineda", barangay: "Balas", modulesCompleted: 2, quizScore: 92, status: "Ready", lastActive: "2 hours ago", contact: "0917-123-4567" },
  { id: 102, name: "Elena Santos", barangay: "Balas", modulesCompleted: 1, quizScore: 85, status: "Pending Assessment", lastActive: "1 day ago", contact: "0918-765-4321" },
  { id: 103, name: "Roberto Ocampo", barangay: "San Vicente", modulesCompleted: 0, quizScore: 0, status: "Not Started", lastActive: "3 days ago", contact: "0922-987-6543" },
  { id: 104, name: "Grace Mercado", barangay: "Cabalantian", modulesCompleted: 2, quizScore: 100, status: "Ready", lastActive: "Just now", contact: "0915-444-5555" },
  { id: 105, name: "Antonio Henson", barangay: "San Vicente", modulesCompleted: 2, quizScore: 78, status: "Needs Review", lastActive: "5 hours ago", contact: "0906-111-2222" }
];