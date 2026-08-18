import {
  DashboardSquare01Icon,
  Settings01Icon,
  UserGroupIcon,
  FolderAddIcon,
  Note01Icon,
  Task01Icon,
  Database01Icon,
  Notification01Icon,
  Shield01Icon,
  Activity01Icon,
  Message01Icon
} from "@hugeicons/core-free-icons";

export const ROLE_BASED_LINKS = {
  system_admin: [
    {
      category: "System Administration",
      items: [
        { name: "Dashboard", path: "/admin/system/dashboard", icon: DashboardSquare01Icon },
        { name: "User Management", path: "/admin/system/users", icon: UserGroupIcon },
        { name: "Activity Log", path: "/admin/system/logs", icon: Note01Icon },
      ]
    },
    {
      category: "Infrastructure",
      items: [
        { name: "System Settings", path: "/admin/system/settings", icon: Settings01Icon },
        { name: "System Health", path: "/admin/system/health", icon: Activity01Icon },
        { name: "Security", path: "/admin/system/security", icon: Shield01Icon },
      ]
    }
  ],
  mdrrmo_admin: [
    {
      category: "Dashboard & Monitoring",
      items: [
        {
          name: "Main Overview", path: "/admin/mdrrmo/dashboard",
          icon: DashboardSquare01Icon
        },
        {
          name: "Audited Sector Data",
          icon: Database01Icon,
          subItems: [
            { name: "Sector Overview", path: "/admin/mdrrmo/sector-overview" },
            { name: "Activity & Monitoring Logs", path: "/admin/mdrrmo/logs" }
          ]
        },
        {
          name: "Resident Feedbacks",
          path: "/admin/mdrrmo/feedback",
          icon: Message01Icon,
        }
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
  head_mdrrmo_admin: [
    {
      category: "Dashboard & Monitoring",
      items: [
        {
          name: "Main Overview", path: "/admin/mdrrmo/dashboard",
          icon: DashboardSquare01Icon
        },
        {
          name: "Audited Sector Data",
          icon: Database01Icon,
          subItems: [
            { name: "Sector Overview", path: "/admin/mdrrmo/sector-overview" },
            { name: "Activity & Monitoring Logs", path: "/admin/mdrrmo/logs" }
          ]
        },
        {
          name: "Resident Feedbacks",
          path: "/admin/mdrrmo/feedback",
          icon: Message01Icon,
        }
      ]
    },
    {
      category: "Curriculum & Content",
      items: [
        { name: "Training Modules", path: "/admin/mdrrmo/modules", icon: FolderAddIcon },
        { name: "Approve Modules", path: "/admin/mdrrmo/approvals", icon: FolderAddIcon }
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

        { name: "Resident Management", path: "/admin/barangay/residents", icon: UserGroupIcon },
        { name: "Resident Feedbacks", path: "/admin/barangay/feedback", icon: Message01Icon },
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
