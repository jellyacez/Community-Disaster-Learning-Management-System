import {
  DashboardSquare01Icon,
  Settings01Icon,
  UserGroupIcon,
  FolderAddIcon,
  Note01Icon,
  Database01Icon,
  Notification01Icon,
  Shield01Icon,
  Activity01Icon,
  Message01Icon,
  Award01Icon,
  CheckmarkBadge01Icon,
  Building03Icon,
} from "@hugeicons/core-free-icons";

export const ROLE_BASED_LINKS = {
  super_admin: [
    {
      category: "Super Administration",
      items: [
        {
          name: "Dashboard",
          path: "/admin/super/dashboard",
          icon: DashboardSquare01Icon,
        },
        {
          name: "Audited Sector Data",
          icon: Database01Icon,
          subItems: [
            { name: "Sector Overview", path: "/admin/mdrrmo/sector-overview" },
            { name: "Certification Analytics", path: "/admin/mdrrmo/certifications" },
            { name: "Governance Logs", path: "/admin/super/logs" },
          ],
        },
        {
          name: "Barangay Operations",
          icon: Building03Icon,
          subItems: [
            {
              name: "Barangay Dashboard",
              path: "/admin/barangay/dashboard",
            },
            {
              name: "Resident Registry",
              path: "/admin/barangay/residents",
            },
            {
              name: "Barangay Certifications",
              path: "/admin/barangay/certifications",
            },
            {
              name: "Barangay Logs",
              path: "/admin/barangay/logs",
            },
          ],
        },
        {
          name: "User Management",
          path: "/admin/super/users",
          icon: UserGroupIcon,
        },
      ],
    },
    {
      category: "Content & Operations",
      items: [
        {
          name: "Training Modules",
          path: "/admin/mdrrmo/modules",
          icon: FolderAddIcon,
        },
        {
          name: "Module Approvals",
          path: "/admin/mdrrmo/approvals",
          icon: CheckmarkBadge01Icon,
        },
        {
          name: "System Announcements",
          path: "/admin/mdrrmo/alerts",
          icon: Notification01Icon,
        },
      ],
    },
    {
      category: "System & Infrastructure",
      items: [
        {
          name: "System Settings",
          path: "/admin/super/settings",
          icon: Settings01Icon,
        },
        {
          name: "System Health",
          path: "/admin/super/health",
          icon: Activity01Icon,
        },
        {
          name: "Security",
          path: "/admin/super/security",
          icon: Shield01Icon,
        },
      ],
    },
  ],

  system_admin: [
    {
      category: "System Administration",
      items: [
        {
          name: "Dashboard",
          path: "/admin/system/dashboard",
          icon: DashboardSquare01Icon,
        },
        {
          name: "User Management",
          path: "/admin/system/users",
          icon: UserGroupIcon,
        },
        {
          name: "Activity Log",
          path: "/admin/system/logs",
          icon: Note01Icon,
        },
      ],
    },
    {
      category: "Infrastructure",
      items: [
        {
          name: "System Settings",
          path: "/admin/system/settings",
          icon: Settings01Icon,
        },
        {
          name: "System Health",
          path: "/admin/system/health",
          icon: Activity01Icon,
        },
        {
          name: "Security",
          path: "/admin/system/security",
          icon: Shield01Icon,
        },
      ],
    },
  ],

  mdrrmo_admin: [
    {
      category: "Dashboard & Monitoring",
      items: [
        {
          name: "Dashboard",
          path: "/admin/mdrrmo/dashboard",
          icon: DashboardSquare01Icon,
        },
        {
          name: "Audited Sector Data",
          icon: Database01Icon,
          subItems: [
            { name: "Sector Overview", path: "/admin/mdrrmo/sector-overview" },
            { name: "Certification Analytics", path: "/admin/mdrrmo/certifications" },
            { name: "Activity & Monitoring Logs", path: "/admin/mdrrmo/logs" },
          ],
        },
        {
          name: "Resident Feedbacks",
          path: "/admin/mdrrmo/feedback",
          icon: Message01Icon,
        },
      ],
    },
    {
      category: "Curriculum & Content",
      items: [
        {
          name: "Training Modules",
          path: "/admin/mdrrmo/modules",
          icon: FolderAddIcon,
        },
      ],
    },
    {
      category: "Administrative Operations",
      items: [
        {
          name: "Personnel Directory",
          path: "/admin/mdrrmo/users",
          icon: UserGroupIcon,
        },
        {
          name: "System Announcements",
          path: "/admin/mdrrmo/alerts",
          icon: Notification01Icon,
        },
        {
          name: "Settings",
          path: "/admin/mdrrmo/settings",
          icon: Settings01Icon,
        },
      ],
    },
  ],

  head_mdrrmo_admin: [
    {
      category: "Dashboard & Monitoring",
      items: [
        {
          name: "Dashboard",
          path: "/admin/mdrrmo/dashboard",
          icon: DashboardSquare01Icon,
        },
        {
          name: "Audited Sector Data",
          icon: Database01Icon,
          subItems: [
            { name: "Sector Overview", path: "/admin/mdrrmo/sector-overview" },
            { name: "Certification Analytics", path: "/admin/mdrrmo/certifications" },
            { name: "Activity & Monitoring Logs", path: "/admin/mdrrmo/logs" },
          ],
        },
        {
          name: "Resident Feedbacks",
          path: "/admin/mdrrmo/feedback",
          icon: Message01Icon,
        },
      ],
    },
    {
      category: "Curriculum & Content",
      items: [
        {
          name: "Training Modules",
          path: "/admin/mdrrmo/modules",
          icon: FolderAddIcon,
        },
        {
          name: "Approve Modules",
          path: "/admin/mdrrmo/approvals",
          icon: CheckmarkBadge01Icon,
        },
      ],
    },
    {
      category: "Administrative Operations",
      items: [
        {
          name: "Personnel Directory",
          path: "/admin/mdrrmo/users",
          icon: UserGroupIcon,
        },
        {
          name: "System Announcements",
          path: "/admin/mdrrmo/alerts",
          icon: Notification01Icon,
        },
        {
          name: "Settings",
          path: "/admin/mdrrmo/settings",
          icon: Settings01Icon,
        },
      ],
    },
  ],

  barangay_admin: [
    {
      category: "Dashboard & Monitoring",
      items: [
        {
          name: "Dashboard",
          path: "/admin/barangay/dashboard",
          icon: DashboardSquare01Icon,
        },
      ],
    },
    {
      category: "Community Oversight",
      items: [
        {
          name: "Resident Management",
          path: "/admin/barangay/residents",
          icon: UserGroupIcon,
        },
        {
          name: "Certification Roster",
          path: "/admin/barangay/certifications",
          icon: Award01Icon,
        },
        {
          name: "Resident Feedbacks",
          path: "/admin/barangay/feedback",
          icon: Message01Icon,
        },
      ],
    },
    {
      category: "Governance",
      items: [
        {
          name: "Activity Log",
          path: "/admin/barangay/logs",
          icon: Note01Icon,
        },
        {
          name: "Settings",
          path: "/admin/barangay/settings",
          icon: Settings01Icon,
        },
      ],
    },
  ],
};