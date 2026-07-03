import { 
  DashboardSquare01Icon, 
  Settings01Icon, 
  UserGroupIcon,
  FolderAddIcon,
  Note01Icon,
  Task01Icon,
  Database01Icon,
  Notification01Icon,
} from "@hugeicons/core-free-icons";

export const ROLE_BASED_LINKS = {
  system_admin: [
    {
      category: "System Administration",
      items: [
        { name: "Dashboard", path: "/admin/system/dashboard", icon: DashboardSquare01Icon },
        { name: "User Management", path: "/admin/system/users", icon: UserGroupIcon },
        { name: "Activity Log", path: "/admin/system/logs", icon: Note01Icon },
        { name: "System Settings", path: "/admin/system/settings", icon: Settings01Icon },
      ]
    }
  ],
  mdrrmo_admin: [
    {
      category: "Dashboard & Monitoring",
      items: [
        { name: "Main Overview", path: "/admin/mdrrmo/dashboard", icon: DashboardSquare01Icon },
        { name: "Audited Sector Data", path: "/admin/mdrrmo/barangay-management", icon: Database01Icon },
      ]
    },
    {
      category: "Curriculum & Content",
      items: [
        { name: "Training Modules", path: "/admin/mdrrmo/modules", icon: FolderAddIcon },
      ]
    },
    {
      category: "Administrative Operations",
      items: [
        { name: "Personnel Directory", path: "/admin/mdrrmo/users", icon: UserGroupIcon },
        { name: "Disaster Reports", path: "/admin/mdrrmo/reports", icon: Note01Icon },
        { name: "System Announcements", path: "/admin/mdrrmo/alerts", icon: Notification01Icon },
      ]
    }
  ],
  barangay_admin: [
    {
      category: "Dashboard & Monitoring",
      items: [
        { name: "Dashboard", path: "/admin/barangay/dashboard", icon: DashboardSquare01Icon },
      ]
    },
    {
      category: "Community Oversight",
      items: [
        { name: "Full Registry Log", path: "/admin/barangay/registry", icon: Database01Icon },
        { name: "Resident Management", path: "/admin/barangay/residents", icon: UserGroupIcon },
      ]
    },
    {
      category: "Content & Syllabus",
      items: [
        { name: "Category Content", path: "/admin/barangay/categories", icon: Settings01Icon },
        { name: "Program Syllabus", path: "/admin/barangay/syllabus", icon: Task01Icon },
      ]
    },
    {
      category: "Governance",
      items: [
        { name: "Audit Web Trail", path: "/admin/barangay/logs", icon: Note01Icon },
      ]
    }
  ]
};
