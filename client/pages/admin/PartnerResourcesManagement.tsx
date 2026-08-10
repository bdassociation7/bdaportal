/**
 * Admin Partner Resources Management
 *
 * Unified management page for ECP Toolkit and PDP Guidelines.
 * Admin selects partner type (ECP / PDP) when adding a resource.
 * ECP resources appear in the ECP partner portal.
 * PDP resources appear in the PDP partner portal.
 */
import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Upload,
  Loader2,
  Edit,
  Trash2,
  Download,
  Image,
  FileText,
  BookOpen,
  Megaphone,
  Share2,
  Plus,
  ExternalLink,
  Package,
  Users,
  Building2,
} from 'lucide-react';
import {
  useAllECPToolkitItems,
  useCreateECPToolkitItem,
  useUpdateECPToolkitItem,
  useDeleteECPToolkitItem,
  useUploadECPToolkitFile,
} from '@/entities/ecp/ecp.hooks';
import {
  useAllToolkitItems as useAllPDPToolkitItems,
  useCreateToolkitItem as useCreatePDPToolkitItem,
  useUpdateToolkitItem as useUpdatePDPToolkitItem,
  useDeleteToolkitItem as useDeletePDPToolkitItem,
  useUploadToolkitFile as useUploadPDPToolkitFile,
} from '@/entities/pdp/pdp.hooks';
import type { ECPToolkitItem, ECPToolkitCategory } from '@/entities/ecp/ecp.types';
import type { PDPToolkitItem, ToolkitCategory } from '@/entities/pdp/pdp.types';
import { useCommonConfirms } from '@/hooks/use-confirm';

// ─── Types ────────────────────────────────────────────────────────────────────
type PartnerType = 'ecp' | 'pdp' | 'both';
type AnyCategory = ECPToolkitCategory | ToolkitCategory;

interface UnifiedItem {
  id: string;
  partnerType: PartnerType;
  category: AnyCategory;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  sort_order?: number;
  is_active: boolean;
  created_at?: string;
  _raw: ECPToolkitItem | PDPToolkitItem;
}

interface FormData {
  partnerType: PartnerType;
  category: AnyCategory;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size: number;
  sort_order: number;
  is_active: boolean;
}

const defaultForm: FormData = {
  partnerType: 'both',
  category: 'logos',
  title: '',
  description: '',
  file_url: '',
  file_type: '',
  file_size: 0,
  sort_order: 0,
  is_active: true,
};

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORIES: { value: AnyCategory; label: string; icon: React.ElementType }[] = [
  { value: 'logos',       label: 'Logos & Badges',      icon: Image },
  { value: 'templates',   label: 'Templates',           icon: FileText },
  { value: 'guidelines',  label: 'Guidelines',          icon: BookOpen },
  { value: 'marketing',   label: 'Marketing Materials', icon: Megaphone },
  { value: 'social_media',label: 'Social Media',        icon: Share2 },
];

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PARTNER_LABELS: Record<PartnerType, { label: string; color: string; bg: string }> = {
  ecp:  { label: 'ECP Partner',      color: 'text-blue-700',  bg: 'bg-blue-100' },
  pdp:  { label: 'PDP Partner',      color: 'text-purple-700', bg: 'bg-purple-100' },
  both: { label: 'ECP + PDP',        color: 'text-teal-700',  bg: 'bg-teal-100' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PartnerResourcesManagement() {
  const [filterPartner, setFilterPartner] = useState<PartnerType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<AnyCategory | 'all'>('all');
  const [isAddOpen, setIsAddOpen]   = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UnifiedItem | null>(null);
  const [formData, setFormData]     = useState<FormData>(defaultForm);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: ecpItems = [], isLoading: ecpLoading } = useAllECPToolkitItems();
  const { data: pdpItems = [], isLoading: pdpLoading } = useAllPDPToolkitItems();

  const createECP = useCreateECPToolkitItem();
  const updateECP = useUpdateECPToolkitItem();
  const deleteECP = useDeleteECPToolkitItem();
  const uploadECP = useUploadECPToolkitFile();

  const createPDP = useCreatePDPToolkitItem();
  const updatePDP = useUpdatePDPToolkitItem();
  const deletePDP = useDeletePDPToolkitItem();
  const uploadPDP = useUploadPDPToolkitFile();

  const { confirmDelete } = useCommonConfirms();

  const isLoading = ecpLoading || pdpLoading;

  // ── Merge items ─────────────────────────────────────────────────────────────
  const allItems: UnifiedItem[] = [
    ...(ecpItems as ECPToolkitItem[]).map(item => ({
      id: item.id,
      partnerType: 'ecp' as PartnerType,
      category: item.category as AnyCategory,
      title: item.title,
      description: item.description,
      file_url: item.file_url,
      file_type: item.file_type,
      file_size: item.file_size,
      sort_order: item.sort_order,
      is_active: item.is_active,
      created_at: item.created_at,
      _raw: item,
    })),
    ...(pdpItems as PDPToolkitItem[]).map(item => ({
      id: item.id,
      partnerType: 'pdp' as PartnerType,
      category: item.category as AnyCategory,
      title: item.title,
      description: item.description,
      file_url: item.file_url,
      file_type: item.file_type,
      file_size: item.file_size,
      sort_order: item.sort_order,
      is_active: item.is_active,
      created_at: item.created_at,
      _raw: item,
    })),
  ].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const filtered = allItems.filter(item => {
    if (filterPartner !== 'all' && item.partnerType !== filterPartner) return false;
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    return true;
  });

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      let result;
      // For 'both', upload to ECP bucket (same file URL will be reused for PDP record)
      if (formData.partnerType === 'ecp' || formData.partnerType === 'both') {
        result = await uploadECP.mutateAsync({ file, category: formData.category as ECPToolkitCategory });
      } else {
        result = await uploadPDP.mutateAsync({ file, category: formData.category as ToolkitCategory });
      }
      if (result.data) {
        setFormData(prev => ({
          ...prev,
          file_url: result.data!.url,
          file_type: result.data!.fileType,
          file_size: result.data!.fileSize,
        }));
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Add ─────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!formData.title || !formData.file_url) return;
    const dto = {
      category: formData.category,
      title: formData.title,
      description: formData.description || undefined,
      file_url: formData.file_url,
      file_type: formData.file_type || undefined,
      file_size: formData.file_size || undefined,
      sort_order: formData.sort_order,
      is_active: formData.is_active,
    };
    if (formData.partnerType === 'ecp') {
      await createECP.mutateAsync(dto as any);
    } else if (formData.partnerType === 'pdp') {
      await createPDP.mutateAsync(dto as any);
    } else {
      // both — create in both tables simultaneously
      await Promise.all([
        createECP.mutateAsync(dto as any),
        createPDP.mutateAsync(dto as any),
      ]);
    }
    setIsAddOpen(false);
    setFormData(defaultForm);
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const handleEdit = (item: UnifiedItem) => {
    setEditingItem(item);
    setFormData({
      partnerType: item.partnerType,
      category: item.category,
      title: item.title,
      description: item.description || '',
      file_url: item.file_url,
      file_type: item.file_type || '',
      file_size: item.file_size || 0,
      sort_order: item.sort_order ?? 0,
      is_active: item.is_active,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem || !formData.title) return;
    const dto = {
      category: formData.category,
      title: formData.title,
      description: formData.description || undefined,
      file_url: formData.file_url || undefined,
      file_type: formData.file_type || undefined,
      file_size: formData.file_size || undefined,
      sort_order: formData.sort_order,
      is_active: formData.is_active,
    };
    if (editingItem.partnerType === 'ecp') {
      await updateECP.mutateAsync({ id: editingItem.id, data: dto as any });
    } else {
      await updatePDP.mutateAsync({ id: editingItem.id, data: dto as any });
    }
    setIsEditOpen(false);
    setEditingItem(null);
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (item: UnifiedItem) => {
    const ok = await confirmDelete('resource');
    if (!ok) return;
    if (item.partnerType === 'ecp') {
      await deleteECP.mutateAsync(item.id);
    } else {
      await deletePDP.mutateAsync(item.id);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const ecpCount = allItems.filter(i => i.partnerType === 'ecp').length;
  const pdpCount = allItems.filter(i => i.partnerType === 'pdp').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partner Resources</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage downloadable resources for ECP and PDP partners
          </p>
        </div>
        <Button
          onClick={() => { setFormData(defaultForm); setIsAddOpen(true); }}
          className="bg-[#0f91e0] hover:bg-[#0d7fc7] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">ECP Resources</p>
                <p className="text-xl font-bold text-slate-900">{ecpCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">PDP Resources</p>
                <p className="text-xl font-bold text-slate-900">{pdpCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <Package className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Active</p>
                <p className="text-xl font-bold text-slate-900">{allItems.filter(i => i.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Resources</p>
                <p className="text-xl font-bold text-slate-900">{allItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {/* Partner filter */}
        <div className="flex gap-2">
          {(['all', 'ecp', 'pdp'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPartner(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterPartner === p
                  ? 'bg-[#0f91e0] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p === 'all' ? 'All Partners' : p === 'ecp' ? 'ECP Only' : 'PDP Only'}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <Select value={filterCategory} onValueChange={(v: any) => setFilterCategory(v)}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Package className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium">No resources found</p>
              <p className="text-sm mt-1">Add your first resource using the button above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => {
                  const catConf = CATEGORIES.find(c => c.value === item.category);
                  const CatIcon = catConf?.icon || FileText;
                  const partnerConf = PARTNER_LABELS[item.partnerType];
                  return (
                    <TableRow key={`${item.partnerType}-${item.id}`}>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${partnerConf.bg} ${partnerConf.color}`}>
                          {item.partnerType === 'ecp' ? <Users className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                          {partnerConf.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CatIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{catConf?.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-slate-400 truncate max-w-xs">{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                          {item.file_type?.toUpperCase() || 'FILE'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatFileSize(item.file_size)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-xs">
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => window.open(item.file_url, '_blank')}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => handleDelete(item)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Add Dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Partner Resource</DialogTitle>
            <DialogDescription>Upload a new resource for ECP or PDP partners.</DialogDescription>
          </DialogHeader>
          <ResourceForm
            formData={formData}
            setFormData={setFormData}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            showPartnerType
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAdd}
              disabled={!formData.title || !formData.file_url || createECP.isPending || createPDP.isPending}
              className="bg-[#0f91e0] hover:bg-[#0d7fc7] text-white"
            >
              {(createECP.isPending || createPDP.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Add Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>Update this partner resource.</DialogDescription>
          </DialogHeader>
          <ResourceForm
            formData={formData}
            setFormData={setFormData}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            showPartnerType={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.title || updateECP.isPending || updatePDP.isPending}
              className="bg-[#0f91e0] hover:bg-[#0d7fc7] text-white"
            >
              {(updateECP.isPending || updatePDP.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Form sub-component ───────────────────────────────────────────────────────
function ResourceForm({
  formData,
  setFormData,
  isUploading,
  fileInputRef,
  onFileSelect,
  showPartnerType,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPartnerType: boolean;
}) {
  const update = (field: keyof FormData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4 py-2">
      {/* Partner Type */}
      {showPartnerType && (
        <div className="space-y-1.5">
          <Label>Visible To <span className="text-red-400">*</span></Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'ecp',  label: 'ECP Only',    icon: <Users className="w-4 h-4" />,    active: 'border-blue-500 bg-blue-50 text-blue-700' },
              { value: 'pdp',  label: 'PDP Only',    icon: <Building2 className="w-4 h-4" />, active: 'border-purple-500 bg-purple-50 text-purple-700' },
              { value: 'both', label: 'ECP + PDP',   icon: <Package className="w-4 h-4" />,   active: 'border-teal-500 bg-teal-50 text-teal-700' },
            ] as const).map(({ value, label, icon, active }) => (
              <button
                key={value}
                type="button"
                onClick={() => update('partnerType', value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                  formData.partnerType === value ? active : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={formData.category} onValueChange={(v: any) => update('category', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label>Title <span className="text-red-400">*</span></Label>
        <Input
          value={formData.title}
          onChange={e => update('title', e.target.value)}
          placeholder="e.g. BDA Official Logo Pack"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={e => update('description', e.target.value)}
          placeholder="Brief description of the resource..."
          rows={2}
        />
      </div>

      {/* File */}
      <div className="space-y-1.5">
        <Label>File <span className="text-red-400">*</span></Label>
        <div className="flex gap-2">
          <Input
            value={formData.file_url}
            onChange={e => update('file_url', e.target.value)}
            placeholder="Upload a file or paste URL"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFileSelect}
          />
        </div>
        {formData.file_url && (
          <a
            href={formData.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
          >
            <ExternalLink className="w-3 h-3" />
            Preview file
          </a>
        )}
      </div>

      {/* Sort + Active */}
      <div className="flex gap-4 items-end">
        <div className="space-y-1.5 flex-1">
          <Label>Sort Order</Label>
          <Input
            type="number"
            value={formData.sort_order}
            onChange={e => update('sort_order', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch
            checked={formData.is_active}
            onCheckedChange={v => update('is_active', v)}
          />
          <Label>Active</Label>
        </div>
      </div>
    </div>
  );
}
