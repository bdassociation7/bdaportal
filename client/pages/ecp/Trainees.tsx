/**
 * ECP Trainees Management
 * Manage trainees enrolled by the ECP partner
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  Search,
  PlusCircle,
  Upload,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Award,
  Loader2,
  Download,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  FileDown,
  ArrowUpDown,
  AlertCircle,
} from 'lucide-react';
import {
  useTrainees,
  useBatches,
  useCreateTrainee,
  useUpdateTrainee,
  useDeleteTrainee,
  useCreateTraineesBulk,
} from '@/entities/ecp';
import type { Trainee, CreateTraineeDTO, UpdateTraineeDTO, TraineeFilters, BulkTraineeUpload } from '@/entities/ecp';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    // Header
    title: 'Trainee Management',
    subtitle: 'Manage your enrolled trainees and track their certification journey',
    exportExcel: 'Export Excel',
    exportCSV: 'Export CSV',
    bulkUpload: 'Bulk Upload',
    addTrainee: 'Add Trainee',
    // Filters
    searchPlaceholder: 'Search trainees by name or email...',
    allBatches: 'All Batches',
    allTypes: 'All Types',
    allStatus: 'All Status',
    // Status options
    enrolled: 'Enrolled',
    attending: 'Attending',
    completed: 'Completed',
    dropped: 'Dropped',
    transferred: 'Transferred',
    // Table headers
    trainee: 'Trainee',
    contact: 'Contact',
    batch: 'Batch',
    certification: 'Certification',
    status: 'Status',
    progress: 'Progress',
    actions: 'Actions',
    // Table content
    trainees: 'Trainees',
    viewAndManage: 'View and manage all enrolled trainees',
    pageOf: (current: number, total: number) => `Page ${current} of ${total}`,
    showingTrainees: (from: number, to: number, total: number) => `Showing ${from} to ${to} of ${total} trainees`,
    noTraineesFound: 'No trainees found',
    addFirstTrainee: 'Add your first trainee',
    // Progress badges
    training: 'Training',
    exam: 'Exam',
    certified: 'Certified',
    notStarted: 'Not started',
    // Actions
    edit: 'Edit',
    sendEmail: 'Send Email',
    remove: 'Remove',
    // Pagination
    previous: 'Previous',
    next: 'Next',
    // Dialog - Add/Edit
    editTrainee: 'Edit Trainee',
    addNewTrainee: 'Add New Trainee',
    updateTraineeInfo: 'Update trainee information',
    registerNewTrainee: 'Register a new trainee for certification',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    jobTitle: 'Job Title',
    certificationType: 'Certification Type',
    trainingBatch: 'Training Batch',
    selectBatch: 'Select batch',
    noBatchAssigned: 'No batch assigned',
    noBatchesAvailable: (type: string) => `No ${type} batches available`,
    notes: 'Notes',
    anyAdditionalNotes: 'Any additional notes...',
    cancel: 'Cancel',
    updateTrainee: 'Update Trainee',
    cpCertified: 'CP (Certified Professional)',
    scpCertified: 'SCP (Senior Certified Professional)',
    // Dialog - Bulk Upload
    bulkUploadTrainees: 'Bulk Upload Trainees',
    uploadCSVDescription: 'Upload a CSV file to add multiple trainees at once',
    clickToUpload: 'Click to upload or drag and drop',
    selectCSVFile: 'Select CSV File',
    requiredColumns: 'Required columns: first_name, last_name, email',
    preview: 'Preview',
    andMore: (count: number) => `... and ${count} more`,
    downloadTemplate: 'Download CSV Template',
    uploadTrainees: (count: number) => `Upload ${count} Trainees`,
    // Dialog - Errors
    uploadErrors: 'Upload Errors',
    errorsDescription: 'The following errors were found while parsing your CSV file. Please correct these issues and try again.',
    rowsNotProcessed: (count: number) => `${count} row(s) could not be processed due to validation errors.`,
    close: 'Close',
    // Toast messages
    invalidEmail: 'Invalid Email',
    pleaseEnterValidEmail: 'Please enter a valid email address',
    error: 'Error',
    selectBatchAndFile: 'Please select a batch and upload a valid file',
    fileTooLarge: 'File Too Large',
    fileSizeLimit: (size: number) => `File size must be less than ${size}MB`,
    invalidFileType: 'Invalid File Type',
    pleaseUploadCSV: 'Please upload a CSV file',
    fileParsed: 'File Parsed',
    foundValidTrainees: (valid: number, errors: number) => `Found ${valid} valid trainees${errors > 0 ? `, ${errors} errors` : ''}`,
    parseError: 'Parse Error',
    noData: 'No Data',
    noTraineesToExport: 'No trainees to export',
    exported: 'Exported',
    traineesExportedCSV: (count: number) => `${count} trainees exported to CSV`,
    traineesExportedExcel: (count: number) => `${count} trainees exported to Excel`,
    confirmRemove: 'Are you sure you want to remove this trainee?',
  },
  ar: {
    // Header
    title: 'إدارة المتدربين',
    subtitle: 'إدارة المتدربين المسجلين وتتبع مسيرة الشهادات الخاصة بهم',
    exportExcel: 'تصدير Excel',
    exportCSV: 'تصدير CSV',
    bulkUpload: 'رفع بالجملة',
    addTrainee: 'إضافة متدرب',
    // Filters
    searchPlaceholder: 'البحث عن المتدربين بالاسم أو البريد الإلكتروني...',
    allBatches: 'جميع الدفعات',
    allTypes: 'جميع الأنواع',
    allStatus: 'جميع الحالات',
    // Status options
    enrolled: 'مسجل',
    attending: 'يحضر',
    completed: 'مكتمل',
    dropped: 'منسحب',
    transferred: 'محول',
    // Table headers
    trainee: 'المتدرب',
    contact: 'التواصل',
    batch: 'الدفعة',
    certification: 'الشهادة',
    status: 'الحالة',
    progress: 'التقدم',
    actions: 'الإجراءات',
    // Table content
    trainees: 'المتدربون',
    viewAndManage: 'عرض وإدارة جميع المتدربين المسجلين',
    pageOf: (current: number, total: number) => `صفحة ${current} من ${total}`,
    showingTrainees: (from: number, to: number, total: number) => `عرض ${from} إلى ${to} من ${total} متدرب`,
    noTraineesFound: 'لم يتم العثور على متدربين',
    addFirstTrainee: 'أضف أول متدرب',
    // Progress badges
    training: 'التدريب',
    exam: 'الامتحان',
    certified: 'معتمد',
    notStarted: 'لم يبدأ',
    // Actions
    edit: 'تعديل',
    sendEmail: 'إرسال بريد',
    remove: 'حذف',
    // Pagination
    previous: 'السابق',
    next: 'التالي',
    // Dialog - Add/Edit
    editTrainee: 'تعديل المتدرب',
    addNewTrainee: 'إضافة متدرب جديد',
    updateTraineeInfo: 'تحديث معلومات المتدرب',
    registerNewTrainee: 'تسجيل متدرب جديد للحصول على الشهادة',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    company: 'الشركة',
    jobTitle: 'المسمى الوظيفي',
    certificationType: 'نوع الشهادة',
    trainingBatch: 'دفعة التدريب',
    selectBatch: 'اختر الدفعة',
    noBatchAssigned: 'لم يتم تعيين دفعة',
    noBatchesAvailable: (type: string) => `لا توجد دفعات ${type} متاحة`,
    notes: 'ملاحظات',
    anyAdditionalNotes: 'أي ملاحظات إضافية...',
    cancel: 'إلغاء',
    updateTrainee: 'تحديث المتدرب',
    cpCertified: 'CP (محترف معتمد)',
    scpCertified: 'SCP (محترف معتمد أول)',
    // Dialog - Bulk Upload
    bulkUploadTrainees: 'رفع المتدربين بالجملة',
    uploadCSVDescription: 'قم برفع ملف CSV لإضافة عدة متدربين دفعة واحدة',
    clickToUpload: 'انقر للرفع أو اسحب وأفلت',
    selectCSVFile: 'اختر ملف CSV',
    requiredColumns: 'الأعمدة المطلوبة: first_name, last_name, email',
    preview: 'معاينة',
    andMore: (count: number) => `... و ${count} آخرين`,
    downloadTemplate: 'تحميل قالب CSV',
    uploadTrainees: (count: number) => `رفع ${count} متدرب`,
    // Dialog - Errors
    uploadErrors: 'أخطاء الرفع',
    errorsDescription: 'تم العثور على الأخطاء التالية أثناء تحليل ملف CSV. يرجى تصحيح هذه المشكلات والمحاولة مرة أخرى.',
    rowsNotProcessed: (count: number) => `لم تتم معالجة ${count} صف(وف) بسبب أخطاء التحقق.`,
    close: 'إغلاق',
    // Toast messages
    invalidEmail: 'بريد إلكتروني غير صالح',
    pleaseEnterValidEmail: 'يرجى إدخال عنوان بريد إلكتروني صالح',
    error: 'خطأ',
    selectBatchAndFile: 'يرجى اختيار دفعة ورفع ملف صالح',
    fileTooLarge: 'الملف كبير جداً',
    fileSizeLimit: (size: number) => `يجب أن يكون حجم الملف أقل من ${size} ميجابايت`,
    invalidFileType: 'نوع ملف غير صالح',
    pleaseUploadCSV: 'يرجى رفع ملف CSV',
    fileParsed: 'تم تحليل الملف',
    foundValidTrainees: (valid: number, errors: number) => `تم العثور على ${valid} متدرب صالح${errors > 0 ? `، ${errors} خطأ` : ''}`,
    parseError: 'خطأ في التحليل',
    noData: 'لا توجد بيانات',
    noTraineesToExport: 'لا يوجد متدربون للتصدير',
    exported: 'تم التصدير',
    traineesExportedCSV: (count: number) => `تم تصدير ${count} متدرب إلى CSV`,
    traineesExportedExcel: (count: number) => `تم تصدير ${count} متدرب إلى Excel`,
    confirmRemove: 'هل أنت متأكد من حذف هذا المتدرب؟',
  },
};

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-700',
  attending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  dropped: 'bg-red-100 text-red-700',
  transferred: 'bg-gray-100 text-gray-700',
};

const ITEMS_PER_PAGE = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type SortField = 'name' | 'email' | 'batch' | 'certification_type' | 'enrollment_status' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function ECPTrainees() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const texts = translations[language];
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filters, setFilters] = useState<TraineeFilters>({
    batch_id: searchParams.get('batch_id') || undefined,
  });
  const [search, setSearch] = useState('');

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(searchParams.get('action') === 'new');
  const [isUploadOpen, setIsUploadOpen] = useState(searchParams.get('action') === 'upload');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isErrorsOpen, setIsErrorsOpen] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState<Trainee | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Get batch_id from URL if present
  const urlBatchId = searchParams.get('batch_id') || '';

  // Form state - initialize with URL batch_id if present
  const [formData, setFormData] = useState<CreateTraineeDTO>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    job_title: '',
    batch_id: urlBatchId,
    certification_type: 'CP',
    notes: '',
  });

  // Bulk upload state
  const [uploadData, setUploadData] = useState<BulkTraineeUpload[]>([]);
  const [uploadBatchId, setUploadBatchId] = useState('');
  const [uploadCertType, setUploadCertType] = useState<'CP' | 'SCP'>('CP');

  // Queries
  const { data: trainees, isLoading } = useTrainees({ ...filters, search });
  const { data: batches } = useBatches({});

  // When URL has batch_id, set the certification_type from the batch
  useEffect(() => {
    if (urlBatchId && batches) {
      const batch = batches.find(b => b.id === urlBatchId);
      if (batch) {
        setFormData(prev => ({
          ...prev,
          batch_id: urlBatchId,
          certification_type: batch.certification_type as 'CP' | 'SCP',
        }));
        // Also set for bulk upload
        setUploadBatchId(urlBatchId);
        setUploadCertType(batch.certification_type as 'CP' | 'SCP');
      }
    }
  }, [urlBatchId, batches]);

  // Filter batches by certification type for form
  const filteredBatches = useMemo(() => {
    if (!batches) return [];
    if (!formData.certification_type) return batches;
    return batches.filter(b => b.certification_type === formData.certification_type);
  }, [batches, formData.certification_type]);

  // Sort and paginate trainees
  const sortedAndPaginatedTrainees = useMemo(() => {
    if (!trainees) return [];

    // Sort
    const sorted = [...trainees].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'name':
          aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
          bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'batch':
          aVal = a.batch?.batch_code?.toLowerCase() || '';
          bVal = b.batch?.batch_code?.toLowerCase() || '';
          break;
        case 'certification_type':
          aVal = a.certification_type;
          bVal = b.certification_type;
          break;
        case 'enrollment_status':
          aVal = a.enrollment_status;
          bVal = b.enrollment_status;
          break;
        case 'created_at':
        default:
          aVal = a.created_at;
          bVal = b.created_at;
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Paginate
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sorted.slice(startIndex, endIndex);
  }, [trainees, sortField, sortOrder, currentPage]);

  const totalPages = Math.ceil((trainees?.length || 0) / ITEMS_PER_PAGE);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Mutations
  const createMutation = useCreateTrainee();
  const updateMutation = useUpdateTrainee();
  const deleteMutation = useDeleteTrainee();
  const bulkMutation = useCreateTraineesBulk();

  // Clean up URL params
  useEffect(() => {
    if (searchParams.get('action')) {
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const handleAdd = async () => {
    // Validate email
    if (!isValidEmail(formData.email)) {
      toast({
        title: texts.invalidEmail,
        description: texts.pleaseEnterValidEmail,
        variant: 'destructive',
      });
      return;
    }

    await createMutation.mutateAsync(formData);
    if (!createMutation.isError) {
      setIsAddOpen(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!editingTrainee) return;
    await updateMutation.mutateAsync({
      id: editingTrainee.id,
      dto: formData as UpdateTraineeDTO,
    });
    if (!updateMutation.isError) {
      setIsEditOpen(false);
      setEditingTrainee(null);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(texts.confirmRemove)) return;
    await deleteMutation.mutateAsync(id);
  };

  const handleBulkUpload = async () => {
    if (!uploadBatchId || uploadData.length === 0) {
      toast({
        title: texts.error,
        description: texts.selectBatchAndFile,
        variant: 'destructive',
      });
      return;
    }

    await bulkMutation.mutateAsync({
      trainees: uploadData,
      batchId: uploadBatchId,
      certificationType: uploadCertType,
    });

    if (!bulkMutation.isError) {
      setIsUploadOpen(false);
      setUploadData([]);
      setUploadBatchId('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: texts.fileTooLarge,
        description: texts.fileSizeLimit(MAX_FILE_SIZE / 1024 / 1024),
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast({
        title: texts.invalidFileType,
        description: texts.pleaseUploadCSV,
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Parse CSV with papaparse (handles quoted fields properly)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const data: BulkTraineeUpload[] = [];
        const errors: string[] = [];

        results.data.forEach((row: any, index) => {
          // Map flexible column names
          const trainee: any = {
            first_name: row.first_name || row.firstname || '',
            last_name: row.last_name || row.lastname || '',
            email: row.email || '',
            phone: row.phone || '',
            company_name: row.company || row.company_name || '',
            job_title: row.job_title || row.title || '',
          };

          // Validate required fields
          if (!trainee.first_name || !trainee.last_name || !trainee.email) {
            errors.push(`Row ${index + 2}: Missing required fields (first_name, last_name, email)`);
            return;
          }

          // Validate email format
          if (!isValidEmail(trainee.email)) {
            errors.push(`Row ${index + 2}: Invalid email format (${trainee.email})`);
            return;
          }

          data.push(trainee);
        });

        if (errors.length > 0) {
          setUploadErrors(errors);
          setIsErrorsOpen(true);
        }

        setUploadData(data);
        toast({
          title: texts.fileParsed,
          description: texts.foundValidTrainees(data.length, errors.length),
          variant: errors.length > 0 ? 'default' : 'default',
        });
      },
      error: (error) => {
        toast({
          title: texts.parseError,
          description: error.message,
          variant: 'destructive',
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  const openEditDialog = (trainee: Trainee) => {
    setEditingTrainee(trainee);
    setFormData({
      first_name: trainee.first_name,
      last_name: trainee.last_name,
      email: trainee.email,
      phone: trainee.phone || '',
      company_name: trainee.company_name || '',
      job_title: trainee.job_title || '',
      batch_id: trainee.batch_id || '',
      certification_type: trainee.certification_type,
      notes: trainee.notes || '',
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    // Preserve URL batch_id and its certification_type when resetting
    const batch = urlBatchId && batches ? batches.find(b => b.id === urlBatchId) : null;
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_name: '',
      job_title: '',
      batch_id: urlBatchId || '',
      certification_type: (batch?.certification_type as 'CP' | 'SCP') || 'CP',
      notes: '',
    });
  };

  const downloadTemplate = () => {
    const csv = 'first_name,last_name,email,phone,company_name,job_title\nJohn,Doe,john@example.com,+1234567890,Acme Inc,Manager';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trainees_template.csv';
    a.click();
  };

  const exportToCSV = () => {
    if (!trainees || trainees.length === 0) {
      toast({
        title: texts.noData,
        description: texts.noTraineesToExport,
        variant: 'destructive',
      });
      return;
    }

    const csvData = trainees.map(t => ({
      first_name: t.first_name,
      last_name: t.last_name,
      email: t.email,
      phone: t.phone || '',
      company_name: t.company_name || '',
      job_title: t.job_title || '',
      certification_type: t.certification_type,
      batch_code: t.batch?.batch_code || '',
      enrollment_status: t.enrollment_status,
      training_completed: t.training_completed ? 'Yes' : 'No',
      exam_passed: t.exam_passed === true ? 'Yes' : t.exam_passed === false ? 'No' : 'Not Taken',
      certified: t.certified ? 'Yes' : 'No',
      certificate_number: t.certificate_number || '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trainees_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: texts.exported,
      description: texts.traineesExportedCSV(trainees.length),
    });
  };

  const exportToExcel = () => {
    if (!trainees || trainees.length === 0) {
      toast({
        title: texts.noData,
        description: texts.noTraineesToExport,
        variant: 'destructive',
      });
      return;
    }

    const excelData = trainees.map(t => ({
      'First Name': t.first_name,
      'Last Name': t.last_name,
      'Email': t.email,
      'Phone': t.phone || '',
      'Company': t.company_name || '',
      'Job Title': t.job_title || '',
      'Certification Type': t.certification_type,
      'Batch': t.batch?.batch_code || '',
      'Enrollment Status': t.enrollment_status,
      'Training Completed': t.training_completed ? 'Yes' : 'No',
      'Exam Passed': t.exam_passed === true ? 'Yes' : t.exam_passed === false ? 'No' : 'Not Taken',
      'Exam Score': t.exam_score || '',
      'Certified': t.certified ? 'Yes' : 'No',
      'Certificate Number': t.certificate_number || '',
      'Created At': new Date(t.created_at).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trainees');
    XLSX.writeFile(wb, `trainees_export_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: texts.exported,
      description: texts.traineesExportedExcel(trainees.length),
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r ${language === 'ar' ? 'from-navy-800 via-royal-600 to-sky-500' : 'from-sky-500 via-royal-600 to-navy-800'} rounded-lg p-6 text-white`}>
        <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <div className={language === 'ar' ? 'text-right' : ''}>
            <h1 className={`text-3xl font-bold flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <Users className="h-8 w-8" />
              {texts.title}
            </h1>
            <p className="mt-2 opacity-90">
              {texts.subtitle}
            </p>
          </div>
          <div className={`flex gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <Button variant="secondary" size="sm" onClick={exportToExcel} disabled={!trainees || trainees.length === 0}>
              <FileSpreadsheet className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              {texts.exportExcel}
            </Button>
            <Button variant="secondary" size="sm" onClick={exportToCSV} disabled={!trainees || trainees.length === 0}>
              <FileDown className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              {texts.exportCSV}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsUploadOpen(true)}>
              <Upload className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              {texts.bulkUpload}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(true)}>
              <PlusCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              {texts.addTrainee}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={`flex flex-col md:flex-row gap-4 ${language === 'ar' ? 'md:flex-row-reverse' : ''}`}>
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
                <Input
                  placeholder={texts.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={language === 'ar' ? 'pr-10 text-right' : 'pl-10'}
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            </div>

            <Select
              value={filters.batch_id || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, batch_id: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={texts.allBatches} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allBatches}</SelectItem>
                {batches?.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.batch_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.certification_type || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  certification_type: value === 'all' ? undefined : (value as 'CP' | 'SCP'),
                })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={texts.allTypes} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allTypes}</SelectItem>
                <SelectItem value="CP">CP</SelectItem>
                <SelectItem value="SCP">SCP</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.enrollment_status || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  enrollment_status: value === 'all' ? undefined : (value as any),
                })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={texts.allStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allStatus}</SelectItem>
                <SelectItem value="enrolled">{texts.enrolled}</SelectItem>
                <SelectItem value="attending">{texts.attending}</SelectItem>
                <SelectItem value="completed">{texts.completed}</SelectItem>
                <SelectItem value="dropped">{texts.dropped}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trainees Table */}
      <Card>
        <CardHeader>
          <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className={language === 'ar' ? 'text-right' : ''}>
              <CardTitle>{texts.trainees} ({trainees?.length || 0})</CardTitle>
              <CardDescription>{texts.viewAndManage}</CardDescription>
            </div>
            {totalPages > 1 && (
              <div className="text-sm text-gray-600">
                {texts.pageOf(currentPage, totalPages)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('name')} className={`hover:bg-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    {texts.trainee}
                    <ArrowUpDown className={`h-4 w-4 ${language === 'ar' ? 'mr-2' : 'ml-2'}`} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('email')} className={`hover:bg-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    {texts.contact}
                    <ArrowUpDown className={`h-4 w-4 ${language === 'ar' ? 'mr-2' : 'ml-2'}`} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('batch')} className={`hover:bg-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    {texts.batch}
                    <ArrowUpDown className={`h-4 w-4 ${language === 'ar' ? 'mr-2' : 'ml-2'}`} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('certification_type')} className={`hover:bg-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    {texts.certification}
                    <ArrowUpDown className={`h-4 w-4 ${language === 'ar' ? 'mr-2' : 'ml-2'}`} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('enrollment_status')} className={`hover:bg-gray-100 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    {texts.status}
                    <ArrowUpDown className={`h-4 w-4 ${language === 'ar' ? 'mr-2' : 'ml-2'}`} />
                  </Button>
                </TableHead>
                <TableHead>{texts.progress}</TableHead>
                <TableHead>{texts.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndPaginatedTrainees && sortedAndPaginatedTrainees.length > 0 ? (
                sortedAndPaginatedTrainees.map((trainee) => (
                  <TableRow key={trainee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {trainee.first_name[0]}
                            {trainee.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {trainee.first_name} {trainee.last_name}
                          </div>
                          {trainee.company_name && (
                            <div className="text-sm text-gray-500">{trainee.company_name}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{trainee.email}</div>
                      {trainee.phone && (
                        <div className="text-xs text-gray-500">{trainee.phone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {trainee.batch ? (
                        <Badge variant="outline">{trainee.batch.batch_code}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          trainee.certification_type === 'CP'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-purple-50 text-purple-700'
                        }
                      >
                        BDA-{trainee.certification_type}™
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={ENROLLMENT_STATUS_COLORS[trainee.enrollment_status]}>
                        {trainee.enrollment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                        {trainee.training_completed && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                            {texts.training}
                          </Badge>
                        )}
                        {trainee.exam_passed && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                            {texts.exam}
                          </Badge>
                        )}
                        {trainee.certified && (
                          <Badge className={`bg-green-600 text-white text-xs ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                            <Award className={`h-3 w-3 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                            {texts.certified}
                          </Badge>
                        )}
                        {!trainee.training_completed && !trainee.exam_passed && !trainee.certified && (
                          <span className="text-gray-400 text-xs">{texts.notStarted}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'}>
                          <DropdownMenuItem onClick={() => openEditDialog(trainee)} className={language === 'ar' ? 'flex-row-reverse' : ''}>
                            <Edit className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                            {texts.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`mailto:${trainee.email}`)}
                            className={language === 'ar' ? 'flex-row-reverse' : ''}
                          >
                            <Mail className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                            {texts.sendEmail}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={`text-red-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                            onClick={() => handleDelete(trainee.id)}
                          >
                            <Trash2 className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                            {texts.remove}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>{texts.noTraineesFound}</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setIsAddOpen(true)}
                    >
                      {texts.addFirstTrainee}
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`flex items-center justify-between mt-4 pt-4 border-t ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className="text-sm text-gray-600">
                {texts.showingTrainees(((currentPage - 1) * ITEMS_PER_PAGE) + 1, Math.min(currentPage * ITEMS_PER_PAGE, trainees?.length || 0), trainees?.length || 0)}
              </div>
              <div className={`flex gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {texts.previous}
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {texts.next}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false);
          setIsEditOpen(false);
          setEditingTrainee(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader className={language === 'ar' ? 'text-right' : ''}>
            <DialogTitle>{editingTrainee ? texts.editTrainee : texts.addNewTrainee}</DialogTitle>
            <DialogDescription>
              {editingTrainee
                ? texts.updateTraineeInfo
                : texts.registerNewTrainee}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">{texts.firstName} *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="last_name">{texts.lastName} *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">{texts.email} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">{texts.phone}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">{texts.company}</Label>
                <Input
                  id="company"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Inc"
                />
              </div>
              <div>
                <Label htmlFor="job_title">{texts.jobTitle}</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="Business Analyst"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="batch">{texts.trainingBatch}</Label>
              <Select
                value={formData.batch_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, batch_id: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={texts.selectBatch} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{texts.noBatchAssigned}</SelectItem>
                  {batches?.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batch_code} - {batch.batch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">{texts.notes}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={texts.anyAdditionalNotes}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                setIsEditOpen(false);
                resetForm();
              }}
            >
              {texts.cancel}
            </Button>
            <Button
              onClick={editingTrainee ? handleEdit : handleAdd}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !formData.first_name ||
                !formData.last_name ||
                !formData.email
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              )}
              {editingTrainee ? texts.updateTrainee : texts.addTrainee}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-2xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader className={language === 'ar' ? 'text-right' : ''}>
            <DialogTitle>{texts.bulkUploadTrainees}</DialogTitle>
            <DialogDescription>
              {texts.uploadCSVDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{texts.trainingBatch} *</Label>
              <Select value={uploadBatchId} onValueChange={setUploadBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder={texts.selectBatch} />
                </SelectTrigger>
                <SelectContent>
                  {batches?.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batch_code} - {batch.batch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                {texts.clickToUpload}
              </p>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {texts.selectCSVFile}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                {texts.requiredColumns}
              </p>
            </div>

            {uploadData.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className={`flex items-center justify-between mb-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <span className="font-medium">{texts.preview} ({uploadData.length} {texts.trainees.toLowerCase()})</span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="max-h-40 overflow-y-auto text-sm">
                  {uploadData.slice(0, 5).map((t, i) => (
                    <div key={i} className="py-1 border-b last:border-0">
                      {t.first_name} {t.last_name} - {t.email}
                    </div>
                  ))}
                  {uploadData.length > 5 && (
                    <div className="py-1 text-gray-500">
                      {texts.andMore(uploadData.length - 5)}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button variant="link" size="sm" onClick={downloadTemplate}>
              <Download className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
              {texts.downloadTemplate}
            </Button>
          </div>

          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              {texts.cancel}
            </Button>
            <Button
              onClick={handleBulkUpload}
              disabled={bulkMutation.isPending || !uploadBatchId || uploadData.length === 0}
            >
              {bulkMutation.isPending && <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />}
              {texts.uploadTrainees(uploadData.length)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Errors Dialog */}
      <Dialog open={isErrorsOpen} onOpenChange={(open) => {
        setIsErrorsOpen(open);
        if (!open) setUploadErrors([]);
      }}>
        <DialogContent className="max-w-2xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader className={language === 'ar' ? 'text-right' : ''}>
            <DialogTitle className={`flex items-center gap-2 text-red-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <AlertCircle className="h-5 w-5" />
              {texts.uploadErrors} ({uploadErrors.length})
            </DialogTitle>
            <DialogDescription>
              {texts.errorsDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {texts.rowsNotProcessed(uploadErrors.length)}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              {uploadErrors.map((error, index) => (
                <div
                  key={index}
                  className="p-3 border border-red-200 bg-red-50 rounded-md text-sm text-red-800"
                >
                  {error}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsErrorsOpen(false);
                setUploadErrors([]);
              }}
            >
              {texts.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
