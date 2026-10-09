/** Single source of truth for permissions and default role bundles. */
export const PERMISSIONS = {
  // module: [permission, description]
  patient: {
    "patient.view": "View patient details",
    "patient.create": "Register patients",
    "patient.edit": "Edit patients",
  },
  order: {
    "order.view": "View orders",
    "order.create": "Create orders / bookings",
    "order.cancel": "Cancel orders",
  },
  billing: {
    "invoice.view": "View invoices",
    "invoice.create": "Generate invoices",
    "invoice.discount": "Apply discounts",
    "invoice.cancel": "Cancel invoices",
    "payment.receive": "Receive payments",
    "payment.refund": "Issue refunds and credit notes",
  },
  sample: {
    "sample.view": "View samples",
    "sample.collect": "Mark samples collected",
    "sample.receive": "Receive and reject samples",
  },
  result: {
    "result.view": "View results",
    "result.enter": "Enter results",
    "result.upload": "Upload attachments",
    "critical.acknowledge": "Acknowledge critical values",
  },
  report: {
    "report.view": "View reports",
    "report.verify": "Verify reports",
    "report.approve": "Approve, sign and release reports",
    "report.amend": "Amend approved reports",
    "report.deliver": "Send / resend reports",
    "report.template": "Manage report templates",
  },
  doctor: {
    "doctor.view": "View doctors",
    "doctor.manage": "Manage doctors",
    "commission.view": "View commissions",
    "commission.manage": "Configure commission rules and settle payouts",
  },
  master: {
    "test.view": "View test master",
    "test.manage": "Manage test master and prices",
  },
  outsourcing: {
    "outsource.view": "View outsourcing",
    "outsource.manage": "Manage partner labs and outsourced tests",
  },
  home: {
    "home.view": "View all home collection bookings",
    "home.manage": "Create and assign home collections",
    "home.own": "View and update own assigned collections",
  },
  inventory: {
    "inventory.view": "View inventory",
    "inventory.manage": "Manage inventory and purchases",
  },
  qc: {
    "qc.view": "View QC",
    "qc.manage": "Enter QC and configure rules",
  },
  reports_mis: {
    "mis.view": "View MIS and financial reports",
    "mis.export": "Export reports",
  },
  admin: {
    "user.manage": "Manage users and roles",
    "settings.manage": "Manage settings",
    "audit.view": "View audit log",
    "backup.manage": "Manage backups",
    "data.import": "Import / export master data",
  },
} as const;

export type PermissionKey = {
  [M in keyof typeof PERMISSIONS]: keyof (typeof PERMISSIONS)[M];
}[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS).flatMap((m) => Object.keys(m)) as PermissionKey[];

export type RoleKey =
  | "super_admin" | "lab_owner" | "reception" | "phlebotomist" | "lab_tech"
  | "entry_operator" | "pathologist" | "outsourcing_manager" | "accountant"
  | "referring_doctor" | "home_collection";

const READ = ["patient.view", "order.view", "invoice.view", "sample.view", "result.view", "report.view"] as PermissionKey[];

export const DEFAULT_ROLES: Record<RoleKey, { name: string; description: string; permissions: PermissionKey[] }> = {
  super_admin: { name: "Super Admin", description: "Full access across all branches", permissions: ALL_PERMISSIONS },
  lab_owner: { name: "Lab Owner / Admin", description: "Full access to the laboratory", permissions: ALL_PERMISSIONS },
  reception: {
    name: "Reception / Billing",
    description: "Registration, booking, billing, receipts",
    permissions: [
      "patient.view", "patient.create", "patient.edit", "order.view", "order.create",
      "invoice.view", "invoice.create", "payment.receive", "sample.view", "report.view",
      "report.deliver", "test.view", "doctor.view", "home.view", "home.manage",
    ],
  },
  phlebotomist: {
    name: "Phlebotomist",
    description: "In-lab sample collection",
    permissions: ["patient.view", "order.view", "sample.view", "sample.collect", "home.own"],
  },
  lab_tech: {
    name: "Lab Technician",
    description: "Sample processing and result entry",
    permissions: ["patient.view", "order.view", "sample.view", "sample.receive", "result.view", "result.enter", "result.upload", "qc.view", "qc.manage", "test.view"],
  },
  entry_operator: {
    name: "Report Entry Operator",
    description: "Result entry and drafts only",
    permissions: ["patient.view", "order.view", "sample.view", "result.view", "result.enter", "result.upload", "test.view"],
  },
  pathologist: {
    name: "Pathologist / Verifier",
    description: "Review, approve, sign and release reports",
    permissions: [...READ, "result.enter", "critical.acknowledge", "report.verify", "report.approve", "report.amend", "report.deliver", "test.view", "qc.view"],
  },
  outsourcing_manager: {
    name: "Outsourcing Manager",
    description: "Partner labs, dispatch and partner results",
    permissions: ["patient.view", "order.view", "sample.view", "result.view", "result.enter", "result.upload", "outsource.view", "outsource.manage", "test.view"],
  },
  accountant: {
    name: "Accountant",
    description: "Payments, commissions, purchases and financial reports",
    permissions: ["patient.view", "order.view", "invoice.view", "payment.receive", "payment.refund", "doctor.view", "commission.view", "commission.manage", "inventory.view", "inventory.manage", "mis.view", "mis.export"],
  },
  referring_doctor: {
    name: "Referring Doctor",
    description: "Read-only portal for own referred patients",
    permissions: ["report.view"],
  },
  home_collection: {
    name: "Home Collection Staff",
    description: "Field sample collection (mobile)",
    permissions: ["home.own", "sample.collect", "patient.view"],
  },
};
