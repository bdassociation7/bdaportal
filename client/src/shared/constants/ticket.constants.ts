/**
 * Support Ticket System Constants
 *
 * Centralized constants for Support Tickets feature
 */

import type { TicketCategory, TicketPriority, TicketStatus } from '@/entities/support';

// =============================================================================
// LABELS & DISPLAY TEXT
// =============================================================================

/**
 * Ticket category labels (English)
 */
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  certification: 'Certification Questions',
  exam: 'Exam Issues',
  pdc: 'PDC Management',
  account: 'Account/Login Issues',
  partnership: 'Partnership Application',
  technical: 'Technical Problems',
  other: 'Other',
} as const;

/**
 * Ticket category labels (Arabic)
 */
export const TICKET_CATEGORY_LABELS_AR: Record<TicketCategory, string> = {
  certification: 'أسئلة الشهادات',
  exam: 'مشاكل الامتحانات',
  pdc: 'إدارة PDC',
  account: 'مشاكل الحساب/تسجيل الدخول',
  partnership: 'طلب شراكة',
  technical: 'مشاكل تقنية',
  other: 'أخرى',
} as const;

/**
 * Ticket category descriptions
 */
export const TICKET_CATEGORY_DESCRIPTIONS: Record<TicketCategory, string> = {
  certification: 'Questions about certification requirements, processes, or validity',
  exam: 'Issues with exam registration, scheduling, or results',
  pdc: 'Professional Development Credits submission or approval',
  account: 'Login problems, password reset, or account settings',
  partnership: 'Questions about becoming an Authorised Provider or partner',
  technical: 'Website errors, payment issues, or system problems',
  other: 'Any other questions or concerns',
} as const;

/**
 * Ticket priority labels
 */
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
} as const;

/**
 * Ticket priority labels (Arabic)
 */
export const TICKET_PRIORITY_LABELS_AR: Record<TicketPriority, string> = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
} as const;

/**
 * Ticket status labels
 */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  waiting_user: 'Waiting for User',
  resolved: 'Resolved',
  closed: 'Closed',
} as const;

/**
 * Ticket status labels (Arabic)
 */
export const TICKET_STATUS_LABELS_AR: Record<TicketStatus, string> = {
  new: 'جديد',
  in_progress: 'قيد المعالجة',
  waiting_user: 'في انتظار المستخدم',
  resolved: 'تم الحل',
  closed: 'مغلق',
} as const;

/**
 * Ticket status descriptions
 */
export const TICKET_STATUS_DESCRIPTIONS: Record<TicketStatus, string> = {
  new: 'Ticket has been created and is awaiting review',
  in_progress: 'Our team is working on your ticket',
  waiting_user: 'We need more information from you',
  resolved: 'Issue has been resolved',
  closed: 'Ticket has been closed',
} as const;

// =============================================================================
// COLORS & STYLING
// =============================================================================

/**
 * Ticket status colors (Tailwind classes)
 */
export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  new: 'text-blue-700 bg-blue-50 border-blue-200',
  in_progress: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  waiting_user: 'text-orange-700 bg-orange-50 border-orange-200',
  resolved: 'text-green-700 bg-green-50 border-green-200',
  closed: 'text-gray-700 bg-gray-50 border-gray-200',
} as const;

/**
 * Ticket priority colors (Tailwind classes)
 */
export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'text-gray-600 bg-gray-50 border-gray-200',
  normal: 'text-blue-600 bg-blue-50 border-blue-200',
  high: 'text-red-600 bg-red-50 border-red-200',
} as const;

/**
 * Ticket category colors
 */
export const TICKET_CATEGORY_COLORS: Record<TicketCategory, string> = {
  certification: 'text-purple-600 bg-purple-50',
  exam: 'text-blue-600 bg-blue-50',
  pdc: 'text-green-600 bg-green-50',
  account: 'text-orange-600 bg-orange-50',
  partnership: 'text-pink-600 bg-pink-50',
  technical: 'text-red-600 bg-red-50',
  other: 'text-gray-600 bg-gray-50',
} as const;

/**
 * Ticket category icons (Lucide icon names)
 */
export const TICKET_CATEGORY_ICONS: Record<TicketCategory, string> = {
  certification: 'Award',
  exam: 'FileText',
  pdc: 'BookOpen',
  account: 'User',
  partnership: 'Handshake',
  technical: 'Settings',
  other: 'HelpCircle',
} as const;

/**
 * Ticket status icons
 */
export const TICKET_STATUS_ICONS: Record<TicketStatus, string> = {
  new: 'Plus',
  in_progress: 'Clock',
  waiting_user: 'MessageCircle',
  resolved: 'CheckCircle',
  closed: 'XCircle',
} as const;

/**
 * Ticket priority icons
 */
export const TICKET_PRIORITY_ICONS: Record<TicketPriority, string> = {
  low: 'ArrowDown',
  normal: 'Minus',
  high: 'ArrowUp',
} as const;

// =============================================================================
// FILE UPLOAD CONFIGURATION
// =============================================================================

/**
 * File upload constraints
 */
export const FILE_UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_TICKET: 5,
  MAX_FILES_PER_MESSAGE: 3,

  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ] as const,

  ALLOWED_EXTENSIONS: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.txt',
  ] as const,
} as const;

/**
 * Human-readable file type names
 */
export const FILE_TYPE_NAMES: Record<string, string> = {
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/gif': 'GIF Image',
  'image/webp': 'WebP Image',
  'application/pdf': 'PDF Document',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'application/vnd.ms-excel': 'Excel Spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
  'text/plain': 'Text File',
} as const;

// =============================================================================
// SLA (SERVICE LEVEL AGREEMENT) CONFIGURATION
// =============================================================================

/**
 * SLA thresholds in hours
 */
export const SLA_THRESHOLDS = {
  RESPONSE_TIME: {
    low: 48, // 2 days
    normal: 24, // 1 day
    high: 4, // 4 hours
  },
  RESOLUTION_TIME: {
    low: 168, // 7 days
    normal: 72, // 3 days
    high: 24, // 1 day
  },
} as const;

/**
 * SLA status colors
 */
export const SLA_STATUS_COLORS = {
  met: 'text-green-600 bg-green-50',
  at_risk: 'text-yellow-600 bg-yellow-50',
  breached: 'text-red-600 bg-red-50',
} as const;

// =============================================================================
// PAGINATION & LIMITS
// =============================================================================

/**
 * Ticket pagination defaults
 */
export const TICKET_PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
} as const;

/**
 * Ticket text limits
 */
export const TICKET_TEXT_LIMITS = {
  MIN_SUBJECT_LENGTH: 5,
  MAX_SUBJECT_LENGTH: 200,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 2000,
  MIN_MESSAGE_LENGTH: 1,
  MAX_MESSAGE_LENGTH: 2000,
  MAX_INTERNAL_NOTE_LENGTH: 1000,
} as const;

// =============================================================================
// MESSAGES & NOTIFICATIONS
// =============================================================================

/**
 * Ticket notification messages
 */
export const TICKET_MESSAGES = {
  // Success messages
  SUCCESS: {
    TICKET_CREATED: 'Support ticket created successfully',
    MESSAGE_SENT: 'Message sent successfully',
    TICKET_CLOSED: 'Ticket closed successfully',
    TICKET_UPDATED: 'Ticket updated successfully',
    FILE_UPLOADED: 'File uploaded successfully',
    FILE_DELETED: 'File deleted successfully',
    TEMPLATE_CREATED: 'Template created successfully',
    TEMPLATE_UPDATED: 'Template updated successfully',
  },

  // Error messages
  ERROR: {
    TICKET_NOT_FOUND: 'Ticket not found',
    UNAUTHORIZED: 'You do not have permission to perform this action',
    INVALID_FILE: 'Invalid file type or size',
    FILE_TOO_LARGE: 'File size exceeds 10MB limit',
    TOO_MANY_FILES: 'Maximum 5 files allowed per ticket',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UPLOAD_FAILED: 'File upload failed. Please try again.',
    INVALID_INPUT: 'Please check your input and try again',
  },

  // Warning messages
  WARNING: {
    CLOSE_CONFIRMATION: 'Are you sure you want to close this ticket?',
    DELETE_CONFIRMATION: 'Are you sure you want to delete this item?',
    UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
    FILE_DELETE_CONFIRMATION: 'Are you sure you want to delete this file?',
  },

  // Info messages
  INFO: {
    NO_TICKETS: 'No tickets found',
    TICKET_CREATED_INFO: 'We will respond to your ticket within 24 hours',
    AWAITING_RESPONSE: 'We are working on your ticket',
    PROVIDE_MORE_INFO: 'Please provide additional information',
    TICKET_RESOLVED_INFO: 'If you need further assistance, please reopen this ticket',
  },
} as const;

/**
 * Ticket notification messages (Arabic)
 */
export const TICKET_MESSAGES_AR = {
  SUCCESS: {
    TICKET_CREATED: 'تم إنشاء تذكرة الدعم بنجاح',
    MESSAGE_SENT: 'تم إرسال الرسالة بنجاح',
    TICKET_CLOSED: 'تم إغلاق التذكرة بنجاح',
    TICKET_UPDATED: 'تم تحديث التذكرة بنجاح',
    FILE_UPLOADED: 'تم تحميل الملف بنجاح',
    FILE_DELETED: 'تم حذف الملف بنجاح',
    TEMPLATE_CREATED: 'تم إنشاء القالب بنجاح',
    TEMPLATE_UPDATED: 'تم تحديث القالب بنجاح',
  },
  ERROR: {
    TICKET_NOT_FOUND: 'التذكرة غير موجودة',
    UNAUTHORIZED: 'ليس لديك إذن لتنفيذ هذا الإجراء',
    INVALID_FILE: 'نوع أو حجم ملف غير صالح',
    FILE_TOO_LARGE: 'حجم الملف يتجاوز حد 10 ميغابايت',
    TOO_MANY_FILES: 'الحد الأقصى 5 ملفات لكل تذكرة',
    NETWORK_ERROR: 'خطأ في الشبكة. يرجى التحقق من اتصالك.',
    UPLOAD_FAILED: 'فشل تحميل الملف. يرجى المحاولة مرة أخرى.',
    INVALID_INPUT: 'يرجى التحقق من المدخلات والمحاولة مرة أخرى',
  },
  WARNING: {
    CLOSE_CONFIRMATION: 'هل أنت متأكد أنك تريد إغلاق هذه التذكرة؟',
    DELETE_CONFIRMATION: 'هل أنت متأكد أنك تريد حذف هذا العنصر؟',
    UNSAVED_CHANGES: 'لديك تغييرات غير محفوظة. هل أنت متأكد أنك تريد المغادرة؟',
    FILE_DELETE_CONFIRMATION: 'هل أنت متأكد أنك تريد حذف هذا الملف؟',
  },
  INFO: {
    NO_TICKETS: 'لم يتم العثور على تذاكر',
    TICKET_CREATED_INFO: 'سنرد على تذكرتك خلال 24 ساعة',
    AWAITING_RESPONSE: 'نحن نعمل على تذكرتك',
    PROVIDE_MORE_INFO: 'يرجى تقديم معلومات إضافية',
    TICKET_RESOLVED_INFO: 'إذا كنت بحاجة إلى مزيد من المساعدة، يرجى إعادة فتح هذه التذكرة',
  },
} as const;

// =============================================================================
// ROUTES
// =============================================================================

/**
 * Support ticket routes
 */
export const TICKET_ROUTES = {
  // User routes
  LIST: '/support/tickets',
  CREATE: '/support/tickets/new',
  DETAIL: (id: string) => `/support/tickets/${id}`,
  MY_TICKETS: '/support/my-tickets',

  // Admin routes
  ADMIN_DASHBOARD: '/admin/support',
  ADMIN_TICKETS: '/admin/support/tickets',
  ADMIN_TICKET_DETAIL: (id: string) => `/admin/support/tickets/${id}`,
  ADMIN_TEMPLATES: '/admin/support/templates',
  ADMIN_STATS: '/admin/support/statistics',
} as const;

// =============================================================================
// FILTERS & SORTING
// =============================================================================

/**
 * Default filter values
 */
export const DEFAULT_FILTERS = {
  status: undefined,
  category: undefined,
  priority: undefined,
  search: '',
} as const;

/**
 * Sort options for ticket list
 */
export const TICKET_SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Created', labelAr: 'تاريخ الإنشاء' },
  { value: 'updated_at', label: 'Last Updated', labelAr: 'آخر تحديث' },
  { value: 'priority', label: 'Priority', labelAr: 'الأولوية' },
  { value: 'status', label: 'Status', labelAr: 'الحالة' },
  { value: 'ticket_number', label: 'Ticket Number', labelAr: 'رقم التذكرة' },
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return '.' + filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Check if file type is allowed
 */
export const isFileTypeAllowed = (file: File): boolean => {
  const extension = getFileExtension(file.name);
  return (
    FILE_UPLOAD_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.type as any) &&
    FILE_UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(extension as any)
  );
};

/**
 * Check if file size is within limit
 */
export const isFileSizeValid = (file: File): boolean => {
  return file.size <= FILE_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE;
};

/**
 * Calculate time elapsed since ticket creation
 */
export const getTimeElapsed = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
};

/**
 * Check if SLA is met for response time
 */
export const isResponseSLAMet = (createdAt: string, priority: TicketPriority): boolean => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  return diffHours <= SLA_THRESHOLDS.RESPONSE_TIME[priority];
};

/**
 * Check if SLA is at risk (80% of threshold)
 */
export const isResponseSLAAtRisk = (createdAt: string, priority: TicketPriority): boolean => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  const threshold = SLA_THRESHOLDS.RESPONSE_TIME[priority];

  return diffHours > threshold * 0.8 && diffHours <= threshold;
};

/**
 * Get ticket number display (e.g., "TICK-2025-0001")
 */
export const formatTicketNumber = (ticketNumber: string): string => {
  return `#${ticketNumber}`;
};

/**
 * Generate ticket summary for notifications
 */
export const generateTicketSummary = (subject: string, maxLength: number = 50): string => {
  if (subject.length <= maxLength) {
    return subject;
  }
  return subject.substring(0, maxLength) + '...';
};
