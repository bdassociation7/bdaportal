import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  Loader2,
  Edit,
  Trash2,
  Download,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Video,
  FileCode,
  BookOpen,
  Search,
  Filter,
  Plus,
  FolderOpen,
} from 'lucide-react';
import {
  useResources,
  useResourceTypes,
  useResourceCategories,
  useVisibilityRules,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  useResourceStats,
  ResourcesService,
} from '@/entities/resources';
import { useCommonConfirms } from '@/hooks/use-confirm';
import type {
  Resource,
  CreateResourceDTO,
  UpdateResourceDTO,
  ResourceFilters,
  CertificationType,
} from '@/entities/resources';

const ICON_MAP: Record<string, any> = {
  FileText,
  Video,
  FileCode,
  BookOpen,
};

export default function ContentManagement() {
  const { language } = useLanguage();
  const [filters, setFilters] = useState<ResourceFilters>({});
  const [search, setSearch] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const t = {
    en: {
      title: 'Content Management',
      description: 'Upload and manage learning resources',
      uploadResource: 'Upload Resource',
      uploadNewResource: 'Upload New Resource',
      uploadDescription: 'Upload learning materials to the resource library',
      editResource: 'Edit Resource',
      editDescription: 'Update resource metadata (file cannot be changed)',
      titleEnglish: 'Title (English)',
      titleArabic: 'Title (Arabic)',
      titlePlaceholder: 'Resource title',
      titlePlaceholderAr: 'عنوان المورد',
      descriptionEnglish: 'Description (English)',
      descriptionArabic: 'Description (Arabic)',
      descriptionPlaceholder: 'Brief description',
      descriptionPlaceholderAr: 'وصف موجز',
      resourceType: 'Resource Type',
      selectType: 'Select type',
      category: 'Category',
      selectCategory: 'Select category',
      none: 'None',
      certificationType: 'Certification Type',
      generalAll: 'General (All)',
      visibilityRule: 'Visibility Rule',
      selectVisibility: 'Select visibility',
      tags: 'Tags (comma-separated)',
      tagsPlaceholder: 'e.g., bock, module1, analytics',
      language: 'Language',
      english: 'English',
      arabic: 'Arabic',
      both: 'Both',
      version: 'Version',
      requiresCertification: 'Requires Certification',
      requiresPurchase: 'Requires Purchase',
      mainFile: 'Main File',
      selected: 'Selected',
      thumbnail: 'Thumbnail (optional)',
      cancel: 'Cancel',
      upload: 'Upload Resource',
      update: 'Update Resource',
      totalResources: 'Total Resources',
      totalDownloads: 'Total Downloads',
      resourceTypes: 'Resource Types',
      categories: 'Categories',
      allResources: 'All Resources',
      manageResources: 'Manage uploaded learning materials',
      searchPlaceholder: 'Search resources...',
      tableTitle: 'Title',
      tableType: 'Type',
      tableCategory: 'Category',
      tableCertType: 'Cert Type',
      tableSize: 'Size',
      tableDownloads: 'Downloads',
      tableStatus: 'Status',
      tableActions: 'Actions',
      general: 'General',
      noResources: 'No resources found',
      unpublish: 'Unpublish',
      publish: 'Publish',
      download: 'Download',
      edit: 'Edit',
      delete: 'Delete',
      deleteTitle: 'Delete Resource',
      deleteDescription: 'Are you sure you want to delete this resource? The file will also be removed from storage.',
      deleteConfirm: 'Delete',
      published: 'published',
      draft: 'draft',
    },
    ar: {
      title: 'إدارة المحتوى',
      description: 'رفع وإدارة الموارد التعليمية',
      uploadResource: 'رفع مورد',
      uploadNewResource: 'رفع مورد جديد',
      uploadDescription: 'رفع المواد التعليمية إلى مكتبة الموارد',
      editResource: 'تعديل المورد',
      editDescription: 'تحديث بيانات المورد (لا يمكن تغيير الملف)',
      titleEnglish: 'العنوان (الإنجليزية)',
      titleArabic: 'العنوان (العربية)',
      titlePlaceholder: 'عنوان المورد',
      titlePlaceholderAr: 'عنوان المورد',
      descriptionEnglish: 'الوصف (الإنجليزية)',
      descriptionArabic: 'الوصف (العربية)',
      descriptionPlaceholder: 'وصف موجز',
      descriptionPlaceholderAr: 'وصف موجز',
      resourceType: 'نوع المورد',
      selectType: 'اختر النوع',
      category: 'الفئة',
      selectCategory: 'اختر الفئة',
      none: 'بدون',
      certificationType: 'نوع الشهادة',
      generalAll: 'عام (الكل)',
      visibilityRule: 'قاعدة الرؤية',
      selectVisibility: 'اختر الرؤية',
      tags: 'العلامات (مفصولة بفواصل)',
      tagsPlaceholder: 'مثال: كتاب، وحدة1، تحليلات',
      language: 'اللغة',
      english: 'الإنجليزية',
      arabic: 'العربية',
      both: 'كلاهما',
      version: 'الإصدار',
      requiresCertification: 'يتطلب شهادة',
      requiresPurchase: 'يتطلب شراء',
      mainFile: 'الملف الرئيسي',
      selected: 'محدد',
      thumbnail: 'صورة مصغرة (اختياري)',
      cancel: 'إلغاء',
      upload: 'رفع المورد',
      update: 'تحديث المورد',
      totalResources: 'إجمالي الموارد',
      totalDownloads: 'إجمالي التحميلات',
      resourceTypes: 'أنواع الموارد',
      categories: 'الفئات',
      allResources: 'جميع الموارد',
      manageResources: 'إدارة المواد التعليمية المرفوعة',
      searchPlaceholder: 'البحث في الموارد...',
      tableTitle: 'العنوان',
      tableType: 'النوع',
      tableCategory: 'الفئة',
      tableCertType: 'نوع الشهادة',
      tableSize: 'الحجم',
      tableDownloads: 'التحميلات',
      tableStatus: 'الحالة',
      tableActions: 'الإجراءات',
      general: 'عام',
      noResources: 'لم يتم العثور على موارد',
      unpublish: 'إلغاء النشر',
      publish: 'نشر',
      download: 'تحميل',
      edit: 'تعديل',
      delete: 'حذف',
      deleteTitle: 'حذف المورد',
      deleteDescription: 'هل أنت متأكد من رغبتك في حذف هذا المورد؟ سيتم أيضاً إزالة الملف من التخزين.',
      deleteConfirm: 'حذف',
      published: 'منشور',
      draft: 'مسودة',
    }
  };

  const texts = t[language];

  const { data: resources, isLoading } = useResources({ ...filters, search });
  const { data: types } = useResourceTypes();
  const { data: categories } = useResourceCategories();
  const { data: visibilityRules } = useVisibilityRules();
  const { data: stats } = useResourceStats();

  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource();
  const deleteMutation = useDeleteResource();
  const { confirm } = useCommonConfirms();

  const [uploadForm, setUploadForm] = useState<{
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    resource_type_id: string;
    category_id: string;
    certification_type: CertificationType | '' | 'general';
    tags: string;
    visibility_rule_id: string;
    requires_certification: boolean;
    requires_purchase: boolean;
    language: string;
    version: string;
    file: File | null;
    thumbnail: File | null;
  }>({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    resource_type_id: '',
    category_id: 'none',
    certification_type: 'general',
    tags: '',
    visibility_rule_id: '',
    requires_certification: false,
    requires_purchase: false,
    language: 'en',
    version: '1.0',
    file: null,
    thumbnail: null,
  });

  const handleUpload = async () => {
    if (!uploadForm.file) {
      return;
    }

    const dto: CreateResourceDTO = {
      title: uploadForm.title,
      title_ar: uploadForm.title_ar,
      description: uploadForm.description,
      description_ar: uploadForm.description_ar,
      file: uploadForm.file,
      thumbnail: uploadForm.thumbnail || undefined,
      resource_type_id: uploadForm.resource_type_id,
      category_id: uploadForm.category_id === 'none' ? undefined : uploadForm.category_id || undefined,
      certification_type: uploadForm.certification_type === 'general' ? undefined : uploadForm.certification_type || undefined,
      tags: uploadForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      visibility_rule_id: uploadForm.visibility_rule_id,
      requires_certification: uploadForm.requires_certification,
      requires_purchase: uploadForm.requires_purchase,
      language: uploadForm.language,
      version: uploadForm.version,
    };

    await createMutation.mutateAsync(dto);
    setIsUploadOpen(false);
    resetUploadForm();
  };

  const handleUpdate = async () => {
    if (!editingResource) return;

    const dto: UpdateResourceDTO = {
      title: uploadForm.title,
      title_ar: uploadForm.title_ar,
      description: uploadForm.description,
      description_ar: uploadForm.description_ar,
      resource_type_id: uploadForm.resource_type_id,
      category_id: uploadForm.category_id === 'none' ? undefined : uploadForm.category_id || undefined,
      certification_type: uploadForm.certification_type === 'general' ? undefined : uploadForm.certification_type || undefined,
      tags: uploadForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      visibility_rule_id: uploadForm.visibility_rule_id,
      requires_certification: uploadForm.requires_certification,
      requires_purchase: uploadForm.requires_purchase,
    };

    await updateMutation.mutateAsync({ id: editingResource.id, dto });
    setIsEditOpen(false);
    setEditingResource(null);
    resetUploadForm();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: texts.deleteTitle,
      description: texts.deleteDescription,
      confirmText: texts.deleteConfirm,
      cancelText: texts.cancel,
      variant: 'destructive',
    });
    if (!confirmed) return;
    await deleteMutation.mutateAsync(id);
  };

  const handlePublish = async (resource: Resource) => {
    const newStatus = resource.status === 'published' ? 'draft' : 'published';
    const dto: UpdateResourceDTO = {
      status: newStatus,
      published_at: newStatus === 'published' ? new Date().toISOString() : undefined,
    };
    await updateMutation.mutateAsync({ id: resource.id, dto });
  };

  const handleDownloadResource = async (filePath: string, title: string) => {
    try {
      const urlResult = await ResourcesService.getDownloadUrl(filePath);

      if (urlResult.error || !urlResult.data) {
        throw new Error(urlResult.error?.message || 'Failed to generate download URL');
      }

      window.open(urlResult.data, '_blank');
    } catch (error: any) {
      alert(error.message || 'Failed to download resource');
    }
  };

  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource);
    setUploadForm({
      title: resource.title,
      title_ar: resource.title_ar || '',
      description: resource.description || '',
      description_ar: resource.description_ar || '',
      resource_type_id: resource.resource_type_id,
      category_id: resource.category_id || 'none',
      certification_type: resource.certification_type || 'general',
      tags: resource.tags?.join(', ') || '',
      visibility_rule_id: resource.visibility_rule_id,
      requires_certification: resource.requires_certification,
      requires_purchase: resource.requires_purchase,
      language: resource.language,
      version: resource.version || '1.0',
      file: null,
      thumbnail: null,
    });
    setIsEditOpen(true);
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      title_ar: '',
      description: '',
      description_ar: '',
      resource_type_id: '',
      category_id: 'none',
      certification_type: 'general',
      tags: '',
      visibility_rule_id: '',
      requires_certification: false,
      requires_purchase: false,
      language: 'en',
      version: '1.0',
      file: null,
      thumbnail: null,
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">{texts.title}</h1>
              <p className="mt-2 opacity-90">{texts.description}</p>
            </div>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary" onClick={() => resetUploadForm()}>
                <Plus className="h-5 w-5 mr-2" />
                {texts.uploadResource}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{texts.uploadNewResource}</DialogTitle>
                <DialogDescription>
                  {texts.uploadDescription}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">{texts.titleEnglish} *</Label>
                    <Input
                      id="title"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder={texts.titlePlaceholder}
                    />
                  </div>
                  <div>
                    <Label htmlFor="title_ar">{texts.titleArabic}</Label>
                    <Input
                      id="title_ar"
                      value={uploadForm.title_ar}
                      onChange={(e) => setUploadForm({ ...uploadForm, title_ar: e.target.value })}
                      placeholder={texts.titlePlaceholderAr}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="description">{texts.descriptionEnglish}</Label>
                    <Textarea
                      id="description"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder={texts.descriptionPlaceholder}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description_ar">{texts.descriptionArabic}</Label>
                    <Textarea
                      id="description_ar"
                      value={uploadForm.description_ar}
                      onChange={(e) => setUploadForm({ ...uploadForm, description_ar: e.target.value })}
                      placeholder={texts.descriptionPlaceholderAr}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="resource_type">{texts.resourceType} *</Label>
                    <Select
                      value={uploadForm.resource_type_id}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, resource_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={texts.selectType} />
                      </SelectTrigger>
                      <SelectContent>
                        {types?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {language === 'ar' ? type.label_ar || type.label_en : type.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category">{texts.category}</Label>
                    <Select
                      value={uploadForm.category_id}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={texts.selectCategory} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{texts.none}</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {language === 'ar' ? category.label_ar || category.label_en : category.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cert_type">{texts.certificationType}</Label>
                    <Select
                      value={uploadForm.certification_type}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, certification_type: value as CertificationType | '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={texts.general} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{texts.generalAll}</SelectItem>
                        <SelectItem value="CP">BDA-CP</SelectItem>
                        <SelectItem value="SCP">BDA-SCP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="visibility">{texts.visibilityRule} *</Label>
                    <Select
                      value={uploadForm.visibility_rule_id}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, visibility_rule_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={texts.selectVisibility} />
                      </SelectTrigger>
                      <SelectContent>
                        {visibilityRules?.map((rule) => (
                          <SelectItem key={rule.id} value={rule.id}>
                            {language === 'ar' ? rule.label_ar || rule.label_en : rule.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tags">{texts.tags}</Label>
                    <Input
                      id="tags"
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                      placeholder={texts.tagsPlaceholder}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="language">{texts.language}</Label>
                    <Select
                      value={uploadForm.language}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{texts.english}</SelectItem>
                        <SelectItem value="ar">{texts.arabic}</SelectItem>
                        <SelectItem value="both">{texts.both}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="version">{texts.version}</Label>
                    <Input
                      id="version"
                      value={uploadForm.version}
                      onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                      placeholder="1.0"
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_cert"
                      checked={uploadForm.requires_certification}
                      onCheckedChange={(checked) => setUploadForm({ ...uploadForm, requires_certification: checked })}
                    />
                    <Label htmlFor="requires_cert">{texts.requiresCertification}</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_purchase"
                      checked={uploadForm.requires_purchase}
                      onCheckedChange={(checked) => setUploadForm({ ...uploadForm, requires_purchase: checked })}
                    />
                    <Label htmlFor="requires_purchase">{texts.requiresPurchase}</Label>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label htmlFor="file">{texts.mainFile} *</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                      accept=".pdf,.doc,.docx,.mp4,.mov,.zip"
                    />
                    {uploadForm.file && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {texts.selected}: {uploadForm.file.name} ({(uploadForm.file.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="thumbnail">{texts.thumbnail}</Label>
                    <Input
                      id="thumbnail"
                      type="file"
                      onChange={(e) => setUploadForm({ ...uploadForm, thumbnail: e.target.files?.[0] || null })}
                      accept="image/*"
                    />
                    {uploadForm.thumbnail && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {texts.selected}: {uploadForm.thumbnail.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  {texts.cancel}
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={createMutation.isPending || !uploadForm.file || !uploadForm.title || !uploadForm.resource_type_id || !uploadForm.visibility_rule_id}
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Upload className="h-4 w-4 mr-2" />
                  {texts.upload}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{texts.editResource}</DialogTitle>
                <DialogDescription>{texts.editDescription}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{texts.titleEnglish} *</Label>
                    <Input
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{texts.titleArabic}</Label>
                    <Input
                      value={uploadForm.title_ar}
                      onChange={(e) => setUploadForm({ ...uploadForm, title_ar: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{texts.descriptionEnglish}</Label>
                    <Textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>{texts.descriptionArabic}</Label>
                    <Textarea
                      value={uploadForm.description_ar}
                      onChange={(e) => setUploadForm({ ...uploadForm, description_ar: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>{texts.resourceType} *</Label>
                    <Select
                      value={uploadForm.resource_type_id}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, resource_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {types?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {language === 'ar' ? type.label_ar || type.label_en : type.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{texts.category}</Label>
                    <Select
                      value={uploadForm.category_id}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{texts.none}</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {language === 'ar' ? category.label_ar || category.label_en : category.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{texts.certificationType}</Label>
                    <Select
                      value={uploadForm.certification_type}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, certification_type: value as CertificationType | '' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{texts.generalAll}</SelectItem>
                        <SelectItem value="CP">BDA-CP</SelectItem>
                        <SelectItem value="SCP">BDA-SCP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>{texts.tags}</Label>
                  <Input
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  />
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={uploadForm.requires_certification}
                      onCheckedChange={(checked) => setUploadForm({ ...uploadForm, requires_certification: checked })}
                    />
                    <Label>{texts.requiresCertification}</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={uploadForm.requires_purchase}
                      onCheckedChange={(checked) => setUploadForm({ ...uploadForm, requires_purchase: checked })}
                    />
                    <Label>{texts.requiresPurchase}</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  {texts.cancel}
                </Button>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {texts.update}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{texts.totalResources}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_resources}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{texts.totalDownloads}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_downloads}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{texts.resourceTypes}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Object.keys(stats.by_type).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{texts.categories}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Object.keys(stats.by_category).length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{texts.allResources}</CardTitle>
              <CardDescription>{texts.manageResources}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={texts.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-royal-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{texts.tableTitle}</TableHead>
                  <TableHead>{texts.tableType}</TableHead>
                  <TableHead>{texts.tableCategory}</TableHead>
                  <TableHead>{texts.tableCertType}</TableHead>
                  <TableHead>{texts.tableSize}</TableHead>
                  <TableHead>{texts.tableDownloads}</TableHead>
                  <TableHead>{texts.tableStatus}</TableHead>
                  <TableHead>{texts.tableActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources && resources.length > 0 ? (
                  resources.map((resource) => {
                    const IconComponent = ICON_MAP[resource.resource_type?.icon || 'FileText'] || FileText;
                    return (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{resource.title}</div>
                              {resource.title_ar && (
                                <div className="text-sm text-muted-foreground">{resource.title_ar}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{language === 'ar' ? resource.resource_type?.label_ar || resource.resource_type?.label_en : resource.resource_type?.label_en || '—'}</TableCell>
                        <TableCell>{language === 'ar' ? resource.category?.label_ar || resource.category?.label_en : resource.category?.label_en || '—'}</TableCell>
                        <TableCell>
                          {resource.certification_type ? (
                            <Badge variant="outline">BDA-{resource.certification_type}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">{texts.general}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatFileSize(resource.file_size)}</TableCell>
                        <TableCell>{resource.download_count || 0}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              resource.status === 'published'
                                ? 'default'
                                : resource.status === 'draft'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {resource.status === 'published' ? texts.published : texts.draft}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePublish(resource)}
                              disabled={updateMutation.isPending}
                              title={resource.status === 'published' ? texts.unpublish : texts.publish}
                              className={resource.status === 'published' ? 'text-green-600' : 'text-orange-600'}
                            >
                              {resource.status === 'published' ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadResource(resource.file_path, resource.title)}
                              title={texts.download}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(resource)} title={texts.edit}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(resource.id)}
                              disabled={deleteMutation.isPending}
                              title={texts.delete}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {texts.noResources}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
