// Routes de l'application
export const ROUTES = {
  // Public routes
  LOGIN: '/login',

  // Protected routes
  DASHBOARD: '/dashboard',
  AUTH_DEBUG: '/auth-debug',

  // Individual routes
  MY_BOOKS: '/my-books',
  EXAM_APPLICATIONS: '/exam-applications',
  MOCK_EXAMS: '/mock-exams',
  MY_CERTIFICATIONS: '/my-certifications',
  MY_RECOGNITIONS: '/my-recognitions',
  PDCS: '/pdcs',
  AUTHORIZED_PROVIDERS: '/authorized-providers',
  RESOURCES: '/resources',
  VERIFY_CERTIFICATION: '/verify-certification',
  HELP_CENTER: '/help-center',

  // Quiz routes
  QUIZ: {
    LIST: '/mock-exams',
    DETAIL: '/mock-exams/:id',
    PLAY: '/mock-exams/:id/play',
    RESULTS: '/mock-exams/:id/results',
    MY_ATTEMPTS: '/mock-exams/my-attempts',
  },

  // Support routes
  SUPPORT: {
    TICKETS: '/support/tickets',
    CREATE_TICKET: '/support/tickets/new',
    TICKET_DETAIL: '/support/tickets/:id',
    MY_TICKETS: '/support/my-tickets',
  },

  // ECP routes
  ECP: {
    DASHBOARD: '/ecp/dashboard',
    CANDIDATES: '/ecp/candidates',
    VOUCHERS: '/ecp/vouchers',
    TRAININGS: '/ecp/trainings',
    TRAINERS: '/ecp/trainers',
    LICENSE: '/ecp/license',
    TOOLKIT: '/ecp/toolkit',
    HELP: '/ecp/help',
  },

  // PDP routes
  PDP: {
    DASHBOARD: '/pdp/dashboard',
    PROGRAMS: '/pdp/programs',
    SUBMIT_PROGRAM: '/pdp/submit-program',
    PROFILE: '/pdp/profile',
    ANNUAL_REPORT: '/pdp/annual-report',
    SUPPORT: '/pdp/support',
  },

  // Admin routes
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    PARTNERS: '/admin/partners',
    EXAMS: '/admin/exams',
    PDCS: '/admin/pdcs',
    TRAINERS: '/admin/trainers',
    CONTENT: '/admin/content',
    FINANCE: '/admin/finance',
    REPORTS: '/admin/reports',
    COMMUNICATIONS: '/admin/communications',
    SETTINGS: '/admin/settings',
    SECURITY: '/admin/security',
    CERTIFICATE_DESIGNER: '/admin/certificate-designer',

    // Quiz Management
    QUIZZES: '/admin/quizzes',
    QUIZ_CREATE: '/admin/quizzes/new',
    QUIZ_EDIT: '/admin/quizzes/:id/edit',
    QUIZ_QUESTIONS: '/admin/quizzes/:id/questions',
    QUESTION_BANK: '/admin/question-bank',

    // Support Management
    SUPPORT: '/admin/support',
    SUPPORT_TICKETS: '/admin/support/tickets',
    SUPPORT_TICKET_DETAIL: '/admin/support/tickets/:id',
    SUPPORT_TEMPLATES: '/admin/support/templates',
    SUPPORT_STATS: '/admin/support/statistics',
  },
} as const;

// Routes publiques (non protégées)
export const PUBLIC_ROUTES = [ROUTES.LOGIN];

// Route par défaut après connexion
export const DEFAULT_ROUTE = ROUTES.DASHBOARD;