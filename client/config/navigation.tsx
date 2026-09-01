import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  Award,
  Clock,
  Building2,
  FolderOpen,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  LogOut,
  Users,
  Ticket,
  Calendar,
  CalendarClock,
  CalendarCheck,
  UserCheck,
  UserPlus,
  BarChart3,
  Palette,
  PlusCircle,
  Edit,
  Upload,
  MessageCircle,
  CheckSquare,
  DollarSign,
  CreditCard,
  Mail,
  Settings,
  ArrowLeftRight,
  ArrowUpCircle,
  Shield,
  Package,
  ShoppingCart,
  BookMarked,
  List,
  UserCog,
  FileCheck,
  FileText,
  FileQuestion,
  Layers,
  CircleHelp,
  Crown,
  Handshake,
  BookPlus,
  FileImage,
  SlidersHorizontal,
  Globe
} from 'lucide-react';
import { NavigationConfig } from '@/types/navigation';

export const navigationConfig: NavigationConfig = {
  // Individual User Navigation
  individual: [
    { id: 'dashboard', label: 'nav.individual.dashboard', path: '/individual/dashboard', icon: LayoutDashboard },
    { id: 'my-membership', label: 'nav.individual.myMembership', path: '/my-membership', icon: Crown },
    { id: 'my-books', label: 'nav.individual.myBooks', path: '/my-books', icon: BookOpen },
    { id: 'learning-system', label: 'nav.individual.learningSystem', path: '/learning-system', icon: BookMarked },
    { id: 'mock-exams', label: 'nav.individual.mockExams', path: '/mock-exams', icon: ClipboardCheck },
    { id: 'certification-exams', label: 'nav.individual.certificationExams', path: '/certification-exams', icon: FileCheck },
    { id: 'my-exam-results', label: 'nav.individual.myExamResults', path: '/my-exam-results', icon: FileText },
    { id: 'my-certifications', label: 'nav.individual.myCertifications', path: '/my-certifications', icon: Award },
    { id: 'verify-certification', label: 'nav.individual.verifyCertification', path: '/verify-certification', icon: ShieldCheck },
    { id: 'pdcs', label: 'nav.individual.pdcs', path: '/pdcs', icon: Clock },
    { id: 'authorised-providers', label: 'nav.individual.authorisedProviders', path: '/authorised-providers', icon: Building2 },
    { id: 'accredited-programs', label: 'nav.individual.accreditedPrograms', path: '/accredited-programs', icon: GraduationCap },
    { id: 'resources', label: 'nav.individual.resources', path: '/resources', icon: FolderOpen },
    { id: 'my-tickets', label: 'nav.individual.myTickets', path: '/support/my-tickets', icon: MessageCircle },
    { id: 'help-center', label: 'nav.individual.helpCenter', path: '/help-center', icon: HelpCircle },
    { id: 'return-website', label: 'nav.individual.returnWebsite', path: 'https://bda-global.org', icon: ExternalLink, external: true },
    { id: 'sign-out', label: 'nav.individual.signOut', icon: LogOut, action: 'logout' }
  ],

  // Dual Partner Navigation (ECP + PDP)
  dual_partner: [
    { id: 'workspace', label: 'Workspace', path: '/workspace', icon: ArrowLeftRight },
    // ECP Section
    { id: 'ecp-dashboard', label: 'ECP Dashboard', path: '/ecp/dashboard', icon: LayoutDashboard, section: 'ECP — Education & Certification Partner' },
    { id: 'candidates', label: 'nav.ecp.candidates', path: '/ecp/candidates', icon: Users },
    { id: 'vouchers', label: 'nav.ecp.vouchers', path: '/ecp/vouchers', icon: Ticket },
    { id: 'trainings', label: 'nav.ecp.trainings', path: '/ecp/trainings', icon: Calendar },
    { id: 'trainers', label: 'nav.ecp.trainers', path: '/ecp/trainers', icon: UserCheck },
    { id: 'ecp-toolkit', label: 'nav.ecp.toolkit', path: '/ecp/toolkit', icon: Palette },
    // PDP Section
    { id: 'pdp-dashboard', label: 'PDP Dashboard', path: '/pdp/dashboard', icon: LayoutDashboard, section: 'PDP — Professional Development Partner' },
    { id: 'programs', label: 'nav.pdp.programs', path: '/pdp/programs', icon: BookOpen },
    { id: 'submit-program', label: 'Submit Program', path: '/pdp/submit-program', icon: PlusCircle },
    { id: 'pdp-toolkit', label: 'nav.pdp.toolkit', path: '/pdp/toolkit', icon: Package },
    { id: 'annual-report', label: 'nav.pdp.annualReport', path: '/pdp/annual-report', icon: Upload },
    { id: 'pdp-support', label: 'nav.pdp.support', path: '/pdp/support', icon: MessageCircle },
    { id: 'sign-out', label: 'nav.ecp.signOut', icon: LogOut, action: 'logout' }
  ],

  // ECP Partner Navigation
  // ECP now includes PDP Standard access — same navigation as dual_partner
  ecp: [
    { id: 'workspace', label: 'Workspace', path: '/workspace', icon: ArrowLeftRight },
    // ECP Section
    { id: 'ecp-dashboard', label: 'ECP Dashboard', path: '/ecp/dashboard', icon: LayoutDashboard, section: 'ECP — Education & Certification Partner' },
    { id: 'trainings', label: 'nav.ecp.trainings', path: '/ecp/trainings', icon: Calendar },
    { id: 'candidates', label: 'nav.ecp.candidates', path: '/ecp/candidates', icon: Users },
    { id: 'trainers', label: 'nav.ecp.trainers', path: '/ecp/trainers', icon: UserCheck },
    { id: 'vouchers', label: 'nav.ecp.vouchers', path: '/ecp/vouchers', icon: Ticket },
    { id: 'learning-system', label: 'nav.ecp.learningSystem', path: '/ecp/learning-system', icon: BookMarked },
    { id: 'mock-exams', label: 'nav.ecp.mockExams', path: '/ecp/mock-exams', icon: ClipboardCheck },
    { id: 'ecp-toolkit', label: 'nav.ecp.toolkit', path: '/ecp/toolkit', icon: Palette },
    // PDP Section
    { id: 'pdp-dashboard', label: 'PDP Dashboard', path: '/pdp/dashboard', icon: LayoutDashboard, section: 'PDP — Professional Development Partner' },
    { id: 'programs', label: 'nav.pdp.programs', path: '/pdp/programs', icon: BookOpen },
    { id: 'submit-program', label: 'Submit Program', path: '/pdp/submit-program', icon: PlusCircle },
    { id: 'pdp-toolkit', label: 'nav.pdp.toolkit', path: '/pdp/toolkit', icon: Package },
    { id: 'annual-report', label: 'nav.pdp.annualReport', path: '/pdp/annual-report', icon: Upload },
    { id: 'pdp-support', label: 'nav.pdp.support', path: '/pdp/support', icon: MessageCircle },
    { id: 'sign-out', label: 'nav.ecp.signOut', icon: LogOut, action: 'logout' }
  ],

  // PDP Partner Navigation
  pdp: [
    { id: 'dashboard', label: 'nav.pdp.dashboard', path: '/pdp/dashboard', icon: LayoutDashboard },
    { id: 'programs', label: 'nav.pdp.programs', path: '/pdp/programs', icon: BookOpen },
    { id: 'profile', label: 'nav.pdp.profile', path: '/pdp/profile', icon: Edit },
    { id: 'toolkit', label: 'nav.pdp.toolkit', path: '/pdp/toolkit', icon: Package },
    { id: 'annual-report', label: 'nav.pdp.annualReport', path: '/pdp/annual-report', icon: Upload },
    { id: 'support', label: 'nav.pdp.support', path: '/pdp/support', icon: MessageCircle },
    { id: 'upgrade', label: 'Upgrade Partnership', path: '/pdp/upgrade', icon: ArrowUpCircle },
    { id: 'sign-out', label: 'nav.pdp.signOut', icon: LogOut, action: 'logout' }
  ],

  // Admin Navigation
  admin: [
    // Overview
    { id: 'dashboard', label: 'nav.admin.dashboard', path: '/admin/dashboard', icon: LayoutDashboard },

    // System Section
    { id: 'role-mapping', label: 'nav.admin.roleMapping', path: '/admin/role-mapping', icon: ArrowLeftRight, section: 'nav.admin.section.system' },

    // User Management Section
    { id: 'users', label: 'nav.admin.users', path: '/admin/users', icon: Users, section: 'nav.admin.section.usersPartners' },
    { id: 'memberships', label: 'nav.admin.memberships', path: '/admin/memberships', icon: Crown },
    { id: 'upgrade-requests', label: 'Partnership Requests', path: '/admin/upgrade-requests', icon: UserPlus },
    { id: 'partners', label: 'nav.admin.partners', path: '/admin/partners', icon: Building2 },
    { id: 'ecp-management', label: 'nav.admin.ecpManagement', path: '/admin/ecp-management', icon: Award },
    { id: 'partner-resources', label: 'Partner Resources', path: '/admin/partner-resources', icon: Package },
    { id: 'training-batches', label: 'nav.admin.trainingBatches', path: '/admin/training-batches', icon: Calendar },
    { id: 'pdp-management', label: 'nav.admin.pdpManagement', path: '/admin/pdp-management', icon: GraduationCap },
    { id: 'pdp-programs', label: 'nav.admin.pdpPrograms', path: '/admin/pdp-programs', icon: BookOpen },
    { id: 'pdp-reports', label: 'nav.admin.pdpReports', path: '/admin/pdp-reports', icon: BarChart3 },

    // Exams Section
    { id: 'certification-exams', label: 'nav.admin.certificationExams', path: '/admin/certification-exams', icon: FileCheck, section: 'nav.admin.section.examinations' },
    { id: 'certification-integrity-reviews', label: 'Integrity Reviews', path: '/admin/certification-exams/integrity-reviews', icon: Shield },
    { id: 'exam-scheduling', label: 'nav.admin.examScheduling', path: '/admin/exam-scheduling', icon: Calendar },
    { id: 'exam-bookings', label: 'nav.admin.examBookings', path: '/admin/exam-bookings', icon: CalendarCheck },
    { id: 'exam-windows', label: 'nav.admin.examWindows', path: '/admin/exam-windows', icon: CalendarClock },
    { id: 'eco-blueprint', label: 'nav.admin.ecoBlueprint', path: '/admin/exams/eco-blueprint', icon: SlidersHorizontal },
    { id: 'voucher-tracking', label: 'nav.admin.voucherTracking', path: '/admin/voucher-tracking', icon: Ticket },
    { id: 'certifications', label: 'nav.admin.certifications', path: '/admin/certifications', icon: Award },
    { id: 'exams', label: 'nav.admin.mockExams', path: '/admin/exams', icon: ClipboardCheck },

    // Learning System Section
    { id: 'curriculum', label: 'nav.admin.modules', path: '/admin/curriculum', icon: BookMarked, section: 'nav.admin.section.learningSystem' },
    { id: 'curriculum-lessons', label: 'nav.admin.lessons', path: '/admin/curriculum/lessons', icon: List },
    { id: 'question-bank', label: 'nav.admin.assessmentBank', path: '/admin/question-bank', icon: CircleHelp },
    { id: 'flashcards', label: 'nav.admin.flashcards', path: '/admin/flashcards', icon: Layers },
    { id: 'curriculum-access', label: 'nav.admin.curriculumAccess', path: '/admin/curriculum/access', icon: UserCog },
    { id: 'learning-system-products', label: 'nav.admin.learningSystemProducts', path: '/admin/learning-system-products', icon: Package },
    // Trainer Gate Section
    { id: 'trainer-gate-modules', label: 'Modules', path: '/admin/trainer-gate/modules', icon: BookMarked, section: 'Trainer Gate' },
    { id: 'trainer-gate-lessons', label: 'Lessons', path: '/admin/trainer-gate/lessons', icon: List },
    { id: 'trainer-gate-assessment', label: 'Assessment Bank', path: '/admin/trainer-gate/assessment', icon: CircleHelp },

    // Products & Sales Section
    { id: 'certification-products', label: 'nav.admin.certificationProducts', path: '/admin/certification-products', icon: Package, section: 'nav.admin.section.productsSales' },
    { id: 'mock-exam-products', label: 'nav.admin.mockExamProducts', path: '/admin/mock-exam-products', icon: ClipboardCheck },
    { id: 'membership-benefit-books', label: 'nav.admin.membershipBenefitBooks', path: '/admin/membership-benefit-books', icon: BookOpen },
    { id: 'book-products', label: 'nav.admin.bookProducts', path: '/admin/book-products', icon: BookMarked },
    { id: 'grant-book-access', label: 'nav.admin.grantBookAccess', path: '/admin/grant-book-access', icon: BookPlus },
    { id: 'partnership-products', label: 'nav.admin.partnershipProducts', path: '/admin/partnership-products', icon: Handshake },
    { id: 'membership-products', label: 'nav.admin.membershipProducts', path: '/admin/membership-products', icon: Crown },
    { id: 'customers-vouchers', label: 'nav.admin.customersVouchers', path: '/admin/customers-vouchers', icon: Users },
    { id: 'vouchers', label: 'nav.admin.allVouchers', path: '/admin/vouchers', icon: Ticket },

    // Operations Section
    { id: 'support', label: 'nav.admin.supportTickets', path: '/admin/support', icon: MessageCircle, section: 'nav.admin.section.operations' },
    { id: 'help-center-management', label: 'Help Center', path: '/admin/help-center', icon: HelpCircle },
    { id: 'pdcs', label: 'nav.admin.pdcValidation', path: '/admin/pdcs', icon: CheckSquare },
    { id: 'content', label: 'nav.admin.contentResources', path: '/admin/content', icon: FolderOpen },
    { id: 'toolkit', label: 'nav.admin.toolkit', path: '/admin/toolkit', icon: Package },
    { id: 'certificate-designer', label: 'nav.admin.certificateDesigner', path: '/admin/certificate-designer', icon: FileImage },
    { id: 'finance', label: 'nav.admin.financeTransactions', path: '/admin/finance', icon: CreditCard },
    { id: 'communications', label: 'nav.admin.communications', path: '/admin/communications', icon: Mail },
    { id: 'reports', label: 'nav.admin.reportsAnalytics', path: '/admin/reports', icon: BarChart3 },
    { id: 'country-analytics', label: 'nav.admin.countryAnalytics', path: '/admin/country-analytics', icon: Globe },

    // Sign Out
    { id: 'sign-out', label: 'nav.admin.signOut', icon: LogOut, action: 'logout' }
  ],

  // Super Admin Navigation (same as admin with full access)
  super_admin: [
    // Overview
    { id: 'dashboard', label: 'nav.admin.dashboard', path: '/admin/dashboard', icon: LayoutDashboard },

    // Admin Management (Super Admin Only)
    { id: 'admin-management', label: 'nav.admin.adminManagement', path: '/admin/admins', icon: Shield, section: 'nav.admin.section.system' },
    { id: 'role-mapping', label: 'nav.admin.roleMapping', path: '/admin/role-mapping', icon: ArrowLeftRight },

    // User Management Section
    { id: 'users', label: 'nav.admin.users', path: '/admin/users', icon: Users, section: 'nav.admin.section.usersPartners' },
    { id: 'memberships', label: 'nav.admin.memberships', path: '/admin/memberships', icon: Crown },
    { id: 'upgrade-requests', label: 'Partnership Requests', path: '/admin/upgrade-requests', icon: UserPlus },
    { id: 'partners', label: 'nav.admin.partners', path: '/admin/partners', icon: Building2 },
    { id: 'ecp-management', label: 'nav.admin.ecpManagement', path: '/admin/ecp-management', icon: Award },
    { id: 'partner-resources', label: 'Partner Resources', path: '/admin/partner-resources', icon: Package },
    { id: 'training-batches', label: 'nav.admin.trainingBatches', path: '/admin/training-batches', icon: Calendar },
    { id: 'pdp-management', label: 'nav.admin.pdpManagement', path: '/admin/pdp-management', icon: GraduationCap },
    { id: 'pdp-programs', label: 'nav.admin.pdpPrograms', path: '/admin/pdp-programs', icon: BookOpen },
    { id: 'pdp-reports', label: 'nav.admin.pdpReports', path: '/admin/pdp-reports', icon: BarChart3 },

    // Exams Section
    { id: 'certification-exams', label: 'nav.admin.certificationExams', path: '/admin/certification-exams', icon: FileCheck, section: 'nav.admin.section.examinations' },
    { id: 'certification-integrity-reviews', label: 'Integrity Reviews', path: '/admin/certification-exams/integrity-reviews', icon: Shield },
    { id: 'exam-scheduling', label: 'nav.admin.examScheduling', path: '/admin/exam-scheduling', icon: Calendar },
    { id: 'exam-bookings', label: 'nav.admin.examBookings', path: '/admin/exam-bookings', icon: CalendarCheck },
    { id: 'exam-windows', label: 'nav.admin.examWindows', path: '/admin/exam-windows', icon: CalendarClock },
    { id: 'eco-blueprint', label: 'nav.admin.ecoBlueprint', path: '/admin/exams/eco-blueprint', icon: SlidersHorizontal },
    { id: 'voucher-tracking', label: 'nav.admin.voucherTracking', path: '/admin/voucher-tracking', icon: Ticket },
    { id: 'certifications', label: 'nav.admin.certifications', path: '/admin/certifications', icon: Award },
    { id: 'exams', label: 'nav.admin.mockExams', path: '/admin/exams', icon: ClipboardCheck },

    // Learning System Section
    { id: 'curriculum', label: 'nav.admin.modules', path: '/admin/curriculum', icon: BookMarked, section: 'nav.admin.section.learningSystem' },
    { id: 'curriculum-lessons', label: 'nav.admin.lessons', path: '/admin/curriculum/lessons', icon: List },
    { id: 'question-bank', label: 'nav.admin.assessmentBank', path: '/admin/question-bank', icon: CircleHelp },
    { id: 'flashcards', label: 'nav.admin.flashcards', path: '/admin/flashcards', icon: Layers },
    { id: 'curriculum-access', label: 'nav.admin.curriculumAccess', path: '/admin/curriculum/access', icon: UserCog },
    // Trainer Gate Section
    { id: 'trainer-gate-modules', label: 'Modules', path: '/admin/trainer-gate/modules', icon: BookMarked, section: 'Trainer Gate' },
    { id: 'trainer-gate-lessons', label: 'Lessons', path: '/admin/trainer-gate/lessons', icon: List },
    { id: 'trainer-gate-assessment', label: 'Assessment Bank', path: '/admin/trainer-gate/assessment', icon: CircleHelp },
    { id: 'learning-system-products', label: 'nav.admin.learningSystemProducts', path: '/admin/learning-system-products', icon: Package },

    // Products & Sales Section
    { id: 'certification-products', label: 'nav.admin.certificationProducts', path: '/admin/certification-products', icon: Package, section: 'nav.admin.section.productsSales' },
    { id: 'mock-exam-products', label: 'nav.admin.mockExamProducts', path: '/admin/mock-exam-products', icon: ClipboardCheck },
    { id: 'membership-benefit-books', label: 'nav.admin.membershipBenefitBooks', path: '/admin/membership-benefit-books', icon: BookOpen },
    { id: 'book-products', label: 'nav.admin.bookProducts', path: '/admin/book-products', icon: BookMarked },
    { id: 'grant-book-access', label: 'nav.admin.grantBookAccess', path: '/admin/grant-book-access', icon: BookPlus },
    { id: 'partnership-products', label: 'nav.admin.partnershipProducts', path: '/admin/partnership-products', icon: Handshake },
    { id: 'membership-products', label: 'nav.admin.membershipProducts', path: '/admin/membership-products', icon: Crown },
    { id: 'customers-vouchers', label: 'nav.admin.customersVouchers', path: '/admin/customers-vouchers', icon: Users },
    { id: 'vouchers', label: 'nav.admin.allVouchers', path: '/admin/vouchers', icon: Ticket },

    // Operations Section
    { id: 'support', label: 'nav.admin.supportTickets', path: '/admin/support', icon: MessageCircle, section: 'nav.admin.section.operations' },
    { id: 'help-center-management', label: 'Help Center', path: '/admin/help-center', icon: HelpCircle },
    { id: 'seo-management', label: 'SEO & Public Pages', path: '/admin/seo', icon: Globe, section: 'SEO & Publishing' },
    { id: 'pdcs', label: 'nav.admin.pdcValidation', path: '/admin/pdcs', icon: CheckSquare },
    { id: 'content', label: 'nav.admin.contentResources', path: '/admin/content', icon: FolderOpen },
    { id: 'toolkit', label: 'nav.admin.toolkit', path: '/admin/toolkit', icon: Package },
    { id: 'certificate-designer', label: 'nav.admin.certificateDesigner', path: '/admin/certificate-designer', icon: FileImage },
    { id: 'finance', label: 'nav.admin.financeTransactions', path: '/admin/finance', icon: CreditCard },
    { id: 'communications', label: 'nav.admin.communications', path: '/admin/communications', icon: Mail },
    { id: 'reports', label: 'nav.admin.reportsAnalytics', path: '/admin/reports', icon: BarChart3 },
    { id: 'country-analytics', label: 'nav.admin.countryAnalytics', path: '/admin/country-analytics', icon: Globe },
    { id: 'settings', label: 'nav.admin.settings', path: '/admin/settings', icon: Settings },
    { id: 'security', label: 'nav.admin.security', path: '/admin/security', icon: Shield },

    // Sign Out
    { id: 'sign-out', label: 'nav.admin.signOut', icon: LogOut, action: 'logout' }
  ]
};
