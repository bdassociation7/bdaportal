/**
 * Bulk User Upload Page
 * Enhanced with real-time progress tracking and professional UX
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Mail,
  BookOpen,
  RefreshCw,
  Check,
  AlertCircle,
  SkipForward,
  RotateCcw,
} from 'lucide-react';

import {
  BulkUploadService,
  SUPPORTED_EXTENSIONS,
} from '@/entities/bulk-upload';

import type {
  ValidatedRow,
  BulkValidationResult,
  BulkUploadJob,
  BulkUploadItem,
} from '@/entities/bulk-upload';

// ============================================
// STEP INDICATOR COMPONENT
// ============================================

interface StepIndicatorProps {
  currentStep: number;
  steps: { label: string; icon: React.ReactNode }[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <div
              className={`h-0.5 w-12 md:w-24 mx-2 transition-colors duration-300 ${
                idx <= currentStep ? 'bg-royal-500' : 'bg-gray-200'
              }`}
            />
          )}
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                idx < currentStep
                  ? 'bg-green-500 text-white'
                  : idx === currentStep
                    ? 'bg-royal-500 text-white ring-4 ring-royal-100'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {idx < currentStep ? <Check className="h-5 w-5" /> : step.icon}
            </div>
            <span
              className={`text-xs mt-2 font-medium hidden md:block ${
                idx <= currentStep ? 'text-royal-700' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================
// VALIDATION PREVIEW COMPONENT
// ============================================

interface ValidationPreviewProps {
  validation: BulkValidationResult;
  onProceed: () => void;
  onCancel: () => void;
  isUploading: boolean;
  resendToExisting?: boolean;
  sendWelcomeEmail?: boolean;
}

const ValidationPreview: React.FC<ValidationPreviewProps> = ({
  validation,
  onProceed,
  onCancel,
  isUploading,
  resendToExisting = false,
  sendWelcomeEmail = true,
}) => {
  const [showAll, setShowAll] = useState(false);
  const displayRows = showAll ? validation.rows : validation.rows.slice(0, 10);

  // Calculate how many existing users will receive resend emails
  const resendCount = resendToExisting && sendWelcomeEmail ? validation.existing_count : 0;
  // Calculate actual skip count (exclude existing users if resending)
  const skipCount = validation.duplicate_count + (resendToExisting ? 0 : validation.existing_count);
  // Total users that will be processed (new + resend)
  const totalToProcess = validation.valid_count + resendCount;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`grid grid-cols-2 gap-4 ${resendCount > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-blue-700">{validation.total_rows}</p>
          <p className="text-sm text-blue-600">Total Rows</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-green-700">{validation.valid_count}</p>
          <p className="text-sm text-green-600">New Users</p>
        </div>
        {resendCount > 0 && (
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-purple-700">{resendCount}</p>
            <p className="text-sm text-purple-600">Will Resend</p>
          </div>
        )}
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-red-700">{validation.error_count}</p>
          <p className="text-sm text-red-600">Errors</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-yellow-700">{skipCount}</p>
          <p className="text-sm text-yellow-600">Will Skip</p>
        </div>
      </div>

      {/* Row Details */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">Row</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Full Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Country</th>
                <th className="px-4 py-2 text-left">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayRows.map((row) => {
                // Determine if this existing user will receive a resend email
                const willResend = row.status === 'existing' && resendToExisting;
                return (
                <tr
                  key={row.row_number}
                  className={
                    row.status === 'valid'
                      ? 'bg-green-50'
                      : row.status === 'error'
                        ? 'bg-red-50'
                        : willResend
                          ? 'bg-purple-50'
                          : 'bg-yellow-50'
                  }
                >
                  <td className="px-4 py-2">{row.row_number}</td>
                  <td className="px-4 py-2">
                    {row.status === 'valid' && (
                      <span className="flex items-center gap-1 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        Valid
                      </span>
                    )}
                    {row.status === 'error' && (
                      <span className="flex items-center gap-1 text-red-700">
                        <XCircle className="h-4 w-4" />
                        Error
                      </span>
                    )}
                    {row.status === 'duplicate' && (
                      <span className="flex items-center gap-1 text-yellow-700">
                        <AlertTriangle className="h-4 w-4" />
                        Duplicate
                      </span>
                    )}
                    {row.status === 'existing' && (
                      willResend ? (
                        <span className="flex items-center gap-1 text-purple-700">
                          <RefreshCw className="h-4 w-4" />
                          Resend
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-700">
                          <AlertTriangle className="h-4 w-4" />
                          Exists
                        </span>
                      )
                    )}
                  </td>
                  <td className="px-4 py-2">{row.data.full_name}</td>
                  <td className="px-4 py-2">{row.data.email}</td>
                  <td className="px-4 py-2">{row.data.country}</td>
                  <td className="px-4 py-2 text-red-600 text-xs">
                    {row.errors.join('; ')}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>

        {validation.rows.length > 10 && (
          <div className="p-2 bg-gray-50 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-royal-600 text-sm hover:underline flex items-center gap-1 mx-auto"
            >
              {showAll ? (
                <>
                  Show Less <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Show All ({validation.rows.length} rows) <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-sm text-gray-600">
          {validation.valid_count > 0 && <>{validation.valid_count} users will be created. </>}
          {resendCount > 0 && <span className="text-purple-600">{resendCount} existing users will receive emails. </span>}
          {validation.error_count > 0 && (
            <span className="text-red-600">
              {validation.error_count} rows have errors and will be skipped.
            </span>
          )}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            disabled={totalToProcess === 0 || isUploading}
            className="px-4 py-2 bg-royal-600 text-white rounded-lg hover:bg-royal-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                {validation.valid_count > 0 && resendCount > 0
                  ? `Create ${validation.valid_count} + Resend ${resendCount}`
                  : validation.valid_count > 0
                    ? `Create ${validation.valid_count} Users`
                    : `Resend to ${resendCount} Users`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// REAL-TIME PROGRESS COMPONENT
// ============================================

interface ProcessingProgressProps {
  job: BulkUploadJob;
  items: BulkUploadItem[];
  latestItem: BulkUploadItem | null;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  job,
  items,
  latestItem,
}) => {
  const progressPercent = job.total_users > 0
    ? Math.round((job.processed_count / job.total_users) * 100)
    : 0;

  // Email progress (only count if sending emails)
  const emailSentCount = job.email_sent_count || 0;
  const expectedEmailCount = job.send_welcome_email ? job.success_count : 0;
  const emailProgressPercent = expectedEmailCount > 0
    ? Math.round((emailSentCount / expectedEmailCount) * 100)
    : 0;

  // Get last 5 processed items for log
  const recentItems = items
    .filter(i => i.status !== 'pending')
    .slice(-5)
    .reverse();

  // Helper to get email status icon and text
  const getEmailStatusDisplay = (item: BulkUploadItem) => {
    if (!job.send_welcome_email) return null;

    const status = item.email_status;
    if (status === 'sending') {
      return (
        <span className="flex items-center gap-1 text-blue-400">
          <Mail className="h-3 w-3 animate-pulse" />
          <span className="text-xs">Sending email...</span>
        </span>
      );
    }
    if (status === 'sent') {
      return (
        <span className="flex items-center gap-1 text-cyan-400">
          <Mail className="h-3 w-3" />
          <span className="text-xs">Email sent</span>
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="flex items-center gap-1 text-orange-400">
          <Mail className="h-3 w-3" />
          <span className="text-xs">Email failed</span>
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Main Progress */}
      <div className="bg-gradient-to-r from-royal-50 to-blue-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-royal-100 rounded-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-royal-600 animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-royal-900">Creating User Accounts</h3>
              <p className="text-sm text-royal-600">Please wait while we process your upload...</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-royal-700">{progressPercent}%</p>
            <p className="text-sm text-royal-500">
              {job.processed_count} / {job.total_users}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-royal-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-royal-500 to-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Email Progress (only show if sending emails) */}
      {job.send_welcome_email && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-600" />
              <span className="font-medium text-cyan-900">Sending Welcome Emails</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-cyan-700">{emailSentCount}</span>
              <span className="text-cyan-500 text-sm"> / {expectedEmailCount}</span>
            </div>
          </div>
          <div className="h-2 bg-cyan-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-500 ease-out"
              style={{ width: `${emailProgressPercent}%` }}
            />
          </div>
          <p className="text-xs text-cyan-600 mt-2">
            Emails are sent with a slight delay to ensure reliable delivery
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-green-700">{job.success_count}</p>
            <p className="text-xs text-green-600">Created</p>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 flex items-center gap-3">
          <SkipForward className="h-8 w-8 text-yellow-500" />
          <div>
            <p className="text-2xl font-bold text-yellow-700">{job.skipped_count}</p>
            <p className="text-xs text-yellow-600">Skipped</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold text-red-700">{job.error_count}</p>
            <p className="text-xs text-red-600">Errors</p>
          </div>
        </div>
      </div>

      {/* Live Log */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2 text-sm font-medium flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Live Progress
        </div>
        <div className="bg-gray-900 p-4 max-h-48 overflow-y-auto font-mono text-sm">
          {recentItems.length === 0 ? (
            <p className="text-gray-500">Waiting for updates...</p>
          ) : (
            recentItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-1 flex-wrap">
                {item.status === 'success' && (
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                )}
                {item.status === 'skipped' && (
                  <SkipForward className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                )}
                {item.status === 'error' && (
                  <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                )}
                {item.status === 'processing' && (
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin flex-shrink-0" />
                )}
                <span className={
                  item.status === 'success' ? 'text-green-300' :
                  item.status === 'skipped' ? 'text-yellow-300' :
                  item.status === 'error' ? 'text-red-300' :
                  'text-blue-300'
                }>
                  {item.email}
                </span>
                <span className="text-gray-500">-</span>
                <span className={
                  item.status === 'success' ? 'text-green-400' :
                  item.status === 'skipped' ? 'text-yellow-400' :
                  item.status === 'error' ? 'text-red-400' :
                  'text-blue-400'
                }>
                  {item.status === 'success' && 'Created'}
                  {item.status === 'skipped' && (item.error_message || 'Skipped')}
                  {item.status === 'error' && (item.error_message || 'Error')}
                  {item.status === 'processing' && 'Processing...'}
                </span>
                {/* Email status indicator */}
                {getEmailStatusDisplay(item)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// RESULTS COMPONENT (Enhanced)
// ============================================

interface UploadResultsProps {
  job: BulkUploadJob;
  items: BulkUploadItem[];
  onReset: () => void;
}

const UploadResults: React.FC<UploadResultsProps> = ({ job, items: initialItems, onReset }) => {
  const [activeTab, setActiveTab] = useState<'created' | 'resent' | 'skipped' | 'errors'>('created');
  const [items, setItems] = useState(initialItems);
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());

  // Update items when initialItems change
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Distinguish between newly created users and resent emails
  const allSuccessItems = items.filter(i => i.status === 'success');
  const createdItems = allSuccessItems.filter(i => !i.error_message?.includes('email resent'));
  const resentItems = allSuccessItems.filter(i => i.error_message?.includes('email resent'));
  const skippedItems = items.filter(i => i.status === 'skipped');
  const errorItems = items.filter(i => i.status === 'error');

  // Auto-select the appropriate default tab
  useEffect(() => {
    if (createdItems.length > 0) {
      setActiveTab('created');
    } else if (resentItems.length > 0) {
      setActiveTab('resent');
    } else if (skippedItems.length > 0) {
      setActiveTab('skipped');
    } else if (errorItems.length > 0) {
      setActiveTab('errors');
    }
  }, [createdItems.length, resentItems.length, skippedItems.length, errorItems.length]);

  // Items that need email resend (failed email or error status)
  const failedEmailItems = items.filter(i =>
    i.email_status === 'failed' ||
    (i.status === 'error' && i.error_message?.toLowerCase().includes('email'))
  );

  const displayItems = activeTab === 'created' ? createdItems :
                       activeTab === 'resent' ? resentItems :
                       activeTab === 'skipped' ? skippedItems : errorItems;

  // Handle resend invite
  const handleResend = async (itemId: string) => {
    setResendingIds(prev => new Set([...prev, itemId]));

    try {
      const result = await BulkUploadService.resendInvite(itemId);

      if (result.success) {
        // Update item status locally
        setItems(prev => prev.map(item =>
          item.id === itemId
            ? { ...item, email_status: 'sent' as const, error_message: null }
            : item
        ));
      } else {
        // Update with error
        setItems(prev => prev.map(item =>
          item.id === itemId
            ? { ...item, email_status: 'failed' as const, error_message: result.error || 'Resend failed' }
            : item
        ));
        alert(`Failed to resend: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setResendingIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="text-center p-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-green-800 mb-2">
          {createdItems.length > 0 && resentItems.length > 0
            ? 'Upload Complete!'
            : createdItems.length > 0
              ? 'Upload Complete!'
              : resentItems.length > 0
                ? 'Emails Sent!'
                : 'Processing Complete!'}
        </h2>
        <p className="text-green-700">
          {createdItems.length > 0 && (
            <>Created {createdItems.length} user account{createdItems.length !== 1 ? 's' : ''}. </>
          )}
          {resentItems.length > 0 && (
            <span className="text-purple-700">
              Resent emails to {resentItems.length} existing user{resentItems.length !== 1 ? 's' : ''}.
            </span>
          )}
          {createdItems.length === 0 && resentItems.length === 0 && (
            <>No new users created.</>
          )}
        </p>
        {job.send_welcome_email && (job.email_sent_count || 0) > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-4 py-2 rounded-full">
            <Mail className="h-4 w-4" />
            <span className="text-sm font-medium">
              {job.email_sent_count || 0} welcome email{(job.email_sent_count || 0) !== 1 ? 's' : ''} sent
            </span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className={`grid gap-4 ${resentItems.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <button
          onClick={() => setActiveTab('created')}
          className={`rounded-lg p-4 text-center transition-all ${
            activeTab === 'created'
              ? 'bg-green-100 ring-2 ring-green-400'
              : 'bg-green-50 hover:bg-green-100'
          }`}
        >
          <p className="text-3xl font-bold text-green-700">{createdItems.length}</p>
          <p className="text-sm text-green-600">Created</p>
        </button>
        {resentItems.length > 0 && (
          <button
            onClick={() => setActiveTab('resent')}
            className={`rounded-lg p-4 text-center transition-all ${
              activeTab === 'resent'
                ? 'bg-purple-100 ring-2 ring-purple-400'
                : 'bg-purple-50 hover:bg-purple-100'
            }`}
          >
            <p className="text-3xl font-bold text-purple-700">{resentItems.length}</p>
            <p className="text-sm text-purple-600">Resent</p>
          </button>
        )}
        <button
          onClick={() => setActiveTab('skipped')}
          className={`rounded-lg p-4 text-center transition-all ${
            activeTab === 'skipped'
              ? 'bg-yellow-100 ring-2 ring-yellow-400'
              : 'bg-yellow-50 hover:bg-yellow-100'
          }`}
        >
          <p className="text-3xl font-bold text-yellow-700">{job.skipped_count}</p>
          <p className="text-sm text-yellow-600">Skipped</p>
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`rounded-lg p-4 text-center transition-all ${
            activeTab === 'errors'
              ? 'bg-red-100 ring-2 ring-red-400'
              : 'bg-red-50 hover:bg-red-100'
          }`}
        >
          <p className="text-3xl font-bold text-red-700">{job.error_count}</p>
          <p className="text-sm text-red-600">Errors</p>
        </button>
      </div>

      {/* Items Table */}
      {displayItems.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Row</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  {(activeTab === 'created' || activeTab === 'resent') && (
                    <th className="px-4 py-2 text-left">Email Status</th>
                  )}
                  {(activeTab === 'skipped' || activeTab === 'errors') && (
                    <th className="px-4 py-2 text-left">Error Details</th>
                  )}
                  {activeTab === 'errors' && (
                    <th className="px-4 py-2 text-left">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{item.row_number}</td>
                    <td className="px-4 py-2 font-mono text-xs">{item.email}</td>
                    <td className="px-4 py-2">{item.full_name}</td>
                    {(activeTab === 'created' || activeTab === 'resent') && (
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {item.email_status === 'sent' ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <Mail className="h-4 w-4" /> Sent
                            </span>
                          ) : item.email_status === 'sending' ? (
                            <span className="text-blue-600 flex items-center gap-1">
                              <Loader2 className="h-4 w-4 animate-spin" /> Sending
                            </span>
                          ) : item.email_status === 'failed' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-orange-600 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" /> Failed
                              </span>
                              <button
                                onClick={() => handleResend(item.id)}
                                disabled={resendingIds.has(item.id)}
                                className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 flex items-center gap-1"
                              >
                                {resendingIds.has(item.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                                Resend
                              </button>
                            </div>
                          ) : item.email_status === 'skipped' ? (
                            <span className="text-gray-400">-</span>
                          ) : item.email_queued ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <Mail className="h-4 w-4" /> Queued
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    )}
                    {(activeTab === 'skipped' || activeTab === 'errors') && (
                      <td className="px-4 py-2">
                        <div className="max-w-xs">
                          <p className="text-sm text-red-600 font-medium">
                            {item.error_message || 'Unknown error'}
                          </p>
                          {item.email_status === 'failed' && (
                            <p className="text-xs text-gray-500 mt-1">Email delivery failed</p>
                          )}
                        </div>
                      </td>
                    )}
                    {activeTab === 'errors' && (
                      <td className="px-4 py-2">
                        {item.error_message?.toLowerCase().includes('email') && (
                          <button
                            onClick={() => handleResend(item.id)}
                            disabled={resendingIds.has(item.id)}
                            className="px-3 py-1.5 bg-royal-600 text-white text-xs rounded-lg hover:bg-royal-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                          >
                            {resendingIds.has(item.id) ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3 w-3" />
                                Resend Email
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {displayItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No {activeTab === 'created' ? 'created users' : activeTab === 'skipped' ? 'skipped users' : 'errors'} to display
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4 border-t">
        <button
          onClick={() => BulkUploadService.exportJobResultsCSV(job.id)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export Full Report
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-royal-600 text-white rounded-lg hover:bg-royal-700 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Upload More Users
        </button>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

type Stage = 'upload' | 'validate' | 'processing' | 'result';

const STEPS = [
  { label: 'Upload', icon: <Upload className="h-5 w-5" /> },
  { label: 'Review', icon: <FileSpreadsheet className="h-5 w-5" /> },
  { label: 'Processing', icon: <Loader2 className="h-5 w-5" /> },
  { label: 'Complete', icon: <CheckCircle className="h-5 w-5" /> },
];

const BulkUserUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validation, setValidation] = useState<BulkValidationResult | null>(null);

  // Job tracking state
  const [currentJob, setCurrentJob] = useState<BulkUploadJob | null>(null);
  const [jobItems, setJobItems] = useState<BulkUploadItem[]>([]);
  const [latestItem, setLatestItem] = useState<BulkUploadItem | null>(null);

  // Options
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [activateContent, setActivateContent] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'individual' | 'ecp' | 'pdp'>('individual');
  const [resendToExisting, setResendToExisting] = useState(false);

  // Cleanup subscription on unmount
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const getStepIndex = (s: Stage): number => {
    switch (s) {
      case 'upload': return 0;
      case 'validate': return 1;
      case 'processing': return 2;
      case 'result': return 3;
      default: return 0;
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setIsProcessing(true);

    try {
      // Read file content
      const content = await file.text();

      // Parse CSV
      const rows = BulkUploadService.parseCSV(content);

      if (rows.length === 0) {
        alert('No valid data found in file. Please check the format.');
        setIsProcessing(false);
        return;
      }

      // Validate rows
      const validationResult = await BulkUploadService.validateRows(rows);

      setValidation(validationResult);
      setStage('validate');
    } catch (error: any) {
      console.error('File processing error:', error);
      alert(`Error processing file: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleProceed = useCallback(async () => {
    if (!validation) return;

    setIsProcessing(true);

    try {
      // Start the job upload
      const { job_id, error } = await BulkUploadService.startJobUpload(
        validation.rows,
        sendWelcomeEmail,
        activateContent,
        selectedRole,
        resendToExisting
      );

      if (error || !job_id) {
        throw new Error(error || 'Failed to start upload job');
      }

      // Fetch initial job state
      const job = await BulkUploadService.getJob(job_id);
      if (job) {
        setCurrentJob(job);
      }

      // Fetch initial items
      const items = await BulkUploadService.getJobItems(job_id);
      setJobItems(items);

      // Check if job already completed (fast completion before subscription)
      if (job && (job.status === 'completed' || job.status === 'failed')) {
        console.log('[BulkUpload] Job already completed, going to results');
        setStage('result');
        return;
      }

      // Subscribe to real-time updates
      unsubscribeRef.current = BulkUploadService.subscribeToJob(
        job_id,
        (updatedJob) => {
          setCurrentJob(updatedJob);
          if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
            // Fetch final items
            BulkUploadService.getJobItems(job_id).then(setJobItems);
            setStage('result');
          }
        },
        (updatedItem) => {
          setLatestItem(updatedItem);
          setJobItems((prev) => {
            const idx = prev.findIndex(i => i.id === updatedItem.id);
            if (idx >= 0) {
              const newItems = [...prev];
              newItems[idx] = updatedItem;
              return newItems;
            }
            return [...prev, updatedItem];
          });
        }
      );

      setStage('processing');

      // Also poll once after a delay in case Realtime didn't catch the update
      setTimeout(async () => {
        const latestJob = await BulkUploadService.getJob(job_id);
        if (latestJob && (latestJob.status === 'completed' || latestJob.status === 'failed')) {
          console.log('[BulkUpload] Job completed (poll fallback)');
          setCurrentJob(latestJob);
          const latestItems = await BulkUploadService.getJobItems(job_id);
          setJobItems(latestItems);
          setStage('result');
        }
      }, 2000);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Error creating users: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [validation, sendWelcomeEmail, activateContent, selectedRole, resendToExisting]);

  const handleReset = useCallback(() => {
    // Cleanup subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setStage('upload');
    setValidation(null);
    setCurrentJob(null);
    setJobItems([]);
    setLatestItem(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bulk User Upload</h1>
              <p className="text-white/80">
                Import users via Excel or CSV file
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Indicator */}
        <StepIndicator currentStep={getStepIndex(stage)} steps={STEPS} />

        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Upload Stage */}
          {stage === 'upload' && (
            <div className="space-y-6">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">Required Columns:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Full Name</strong> - User's full name</li>
                      <li><strong>Email</strong> - Valid email address (unique identifier)</li>
                      <li><strong>Country</strong> - 2-letter country code (e.g., AE, EG, US)</li>
                      <li><strong>Language</strong> - EN or AR</li>
                    </ul>
                    <p className="mt-2">
                      <strong>Optional:</strong> Phone, Certification Track (BDA-CP/BDA-SCP)
                    </p>
                  </div>
                </div>
              </div>

              {/* Download Template */}
              <div className="flex justify-end">
                <button
                  onClick={() => BulkUploadService.downloadTemplate()}
                  className="text-royal-600 hover:text-royal-700 text-sm flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download CSV Template
                </button>
              </div>

              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isProcessing
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-gray-300 hover:border-royal-400 cursor-pointer'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {isProcessing ? (
                  <div>
                    <Loader2 className="h-12 w-12 text-royal-500 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">Processing file...</p>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      Drag and drop your file here, or click to browse
                    </p>
                    <p className="text-gray-400 text-sm">
                      Supported formats: {SUPPORTED_EXTENSIONS.join(', ')}
                    </p>
                  </>
                )}
              </div>

              {/* Options */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-medium text-gray-900">Options</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWelcomeEmail}
                    onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                    className="w-4 h-4 text-royal-600 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">Send welcome emails with password setup links</span>
                  </div>
                </label>
                {sendWelcomeEmail && (
                  <label className="flex items-center gap-3 cursor-pointer ml-6">
                    <input
                      type="checkbox"
                      checked={resendToExisting}
                      onChange={(e) => setResendToExisting(e.target.checked)}
                      className="w-4 h-4 text-royal-600 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">Resend email to users that already exist</span>
                    </div>
                  </label>
                )}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activateContent}
                    onChange={(e) => setActivateContent(e.target.checked)}
                    className="w-4 h-4 text-royal-600 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">
                      Activate curriculum access based on certification track
                    </span>
                  </div>
                </label>

                {/* Role Selection */}
                <div className="flex items-center gap-3 pt-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">Assign role:</span>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'individual' | 'ecp' | 'pdp')}
                    className="ml-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-royal-500 focus:border-royal-500"
                  >
                    <option value="individual">Individual (Professional)</option>
                    <option value="ecp">ECP Partner (Training Provider)</option>
                    <option value="pdp">PDP Partner (Development Provider)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Validation Stage */}
          {stage === 'validate' && validation && (
            <ValidationPreview
              validation={validation}
              onProceed={handleProceed}
              onCancel={handleReset}
              isUploading={isProcessing}
              resendToExisting={resendToExisting}
              sendWelcomeEmail={sendWelcomeEmail}
            />
          )}

          {/* Processing Stage */}
          {stage === 'processing' && currentJob && (
            <ProcessingProgress
              job={currentJob}
              items={jobItems}
              latestItem={latestItem}
            />
          )}

          {/* Results Stage */}
          {stage === 'result' && currentJob && (
            <UploadResults
              job={currentJob}
              items={jobItems}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUserUpload;
