/**
 * Exam Scheduling Types
 *
 * TypeScript types for exam scheduling and booking system
 * Requirements: task.md Step 4 - Schedule the Exam
 */

// ============================================================================
// Booking Status
// ============================================================================

export type ExamBookingStatus =
  | 'scheduled'
  | 'rescheduled'
  | 'cancelled'
  | 'no_show'
  | 'completed'
  | 'expired';

// ============================================================================
// Timeslot Interface
// ============================================================================

export interface ExamTimeslot {
  id: string;
  quiz_id: string;
  certification_product_id?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  max_capacity: number;
  current_bookings: number;
  is_available: boolean;
  available_slots?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Booking Interface
// ============================================================================

export interface ExamBooking {
  id: string;
  user_id: string;
  quiz_id: string;
  timeslot_id?: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  timezone: string;
  status: ExamBookingStatus;
  voucher_id?: string;
  confirmation_code?: string;
  confirmation_sent_at?: string;
  confirmation_email_sent: boolean;
  reminder_48h_sent: boolean;
  reminder_48h_sent_at?: string;
  reminder_24h_sent: boolean;
  reminder_24h_sent_at?: string;
  attempt_id?: string;
  original_booking_id?: string;
  rescheduled_from_time?: string;
  reschedule_count: number;
  reschedule_reason?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  booking_notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Submission Types
// ============================================================================

export interface CreateBookingSubmission {
  quiz_id: string;
  timeslot_id: string;
  voucher_id?: string;
  timezone?: string;
  booking_notes?: string;
}

export interface RescheduleBookingSubmission {
  booking_id: string;
  new_timeslot_id: string;
  reschedule_reason?: string;
}

export interface CancelBookingSubmission {
  booking_id: string;
  cancellation_reason?: string;
}

export interface CreateTimeslotSubmission {
  quiz_id: string;
  certification_product_id?: string;
  start_time: Date;
  end_time: Date;
  timezone?: string;
  max_capacity?: number;
  notes?: string;
}

// ============================================================================
// Query Filters
// ============================================================================

export interface TimeslotFilters {
  quiz_id: string;
  start_date?: Date;
  end_date?: Date;
  timezone?: string;
}

export interface BookingFilters {
  user_id?: string;
  quiz_id?: string;
  status?: ExamBookingStatus;
  start_date?: Date;
  end_date?: Date;
}

// ============================================================================
// Response Types
// ============================================================================

export interface SchedulingResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// ============================================================================
// Booking Details with Relations
// ============================================================================

export interface BookingWithDetails extends ExamBooking {
  quiz?: {
    id: string;
    title: string;
    certification_type: string;
    time_limit_minutes: number;
  };
  timeslot?: ExamTimeslot;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// ============================================================================
// Display Labels
// ============================================================================

export const BOOKING_STATUS_LABELS: Record<ExamBookingStatus, string> = {
  scheduled: 'Scheduled',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  completed: 'Completed',
  expired: 'Expired',
};

export const BOOKING_STATUS_COLORS: Record<ExamBookingStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  rescheduled: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-700',
  no_show: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  expired: 'bg-orange-100 text-orange-700',
};

// ============================================================================
// Timezone Helpers (re-exported from shared constants)
// ============================================================================

export { COMMON_TIMEZONES, TIMEZONE_LIST, getTimezoneLabel, detectAndResolveTimezone } from '@/shared/constants/timezones';
