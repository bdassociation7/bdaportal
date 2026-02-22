/**
 * Admin Toolkit Management
 *
 * Manage downloadable resources for PDP partners:
 * logos, templates, guidelines, marketing materials, social media assets
 */

import { useState, useRef } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  AlertCircle,
  ExternalLink,
  Package,
} from 'lucide-react';
import {
  useAllToolkitItems,
  useCreateToolkitItem,
  useUpdateToolkitItem,
  useDeleteToolkitItem,
  useUploadToolkitFile,
} from '@/entities/pdp/pdp.hooks';
import type { PDPToolkitItem, ToolkitCategory, CreateToolkitItemDTO, UpdateToolkitItemDTO } from '@/entities/pdp/pdp.types';
import { useCommonConfirms } from '@/hooks/use-confirm';

// Category configuration
const CATEGORIES: { value: ToolkitCategory; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'logos', label: 'Logos & Badges', icon: Image, color: 'text-blue-600 bg-blue-100' },
  { value: 'templates', label: 'Templates', icon: FileText, color: 'text-green-600 bg-green-100' },
  { value: 'guidelines', label: 'Guidelines', icon: BookOpen, color: 'text-purple-600 bg-purple-100' },
  { value: 'marketing', label: 'Marketing Materials', icon: Megaphone, color: 'text-orange-600 bg-orange-100' },
  { value: 'social_media', label: 'Social Media', icon: Share2, color: 'text-pink-600 bg-pink-100' },
];

const getCategoryConfig = (category: ToolkitCategory) => {
  return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface ItemFormData {
  category: ToolkitCategory;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size: number;
  sort_order: number;
  is_active: boolean;
}

const defaultFormData: ItemFormData = {
  category: 'logos',
  title: '',
  description: '',
  file_url: '',
  file_type: '',
  file_size: 0,
  sort_order: 0,
  is_active: true,
};

export default function ToolkitManagement() {
  const [filterCategory, setFilterCategory] = useState<ToolkitCategory | 'all'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PDPToolkitItem | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(defaultFormData);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items, isLoading, error } = useAllToolkitItems();
  const createItem = useCreateToolkitItem();
  const updateItem = useUpdateToolkitItem();
  const deleteItem = useDeleteToolkitItem();
  const uploadFile = useUploadToolkitFile();
  const { confirmDelete } = useCommonConfirms();

  // Filter items by category
  const filteredItems = items?.filter(item =>
    filterCategory === 'all' || item.category === filterCategory
  ) || [];

  // Count items per category
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = items?.filter(item => item.category === cat.value).length || 0;
    return acc;
  }, {} as Record<ToolkitCategory, number>);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadFile.mutateAsync({ file, category: formData.category });
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAdd = async () => {
    if (!formData.title || !formData.file_url) return;

    const dto: CreateToolkitItemDTO = {
      category: formData.category,
      title: formData.title,
      description: formData.description || undefined,
      file_url: formData.file_url,
      file_type: formData.file_type || undefined,
      file_size: formData.file_size || undefined,
      sort_order: formData.sort_order,
      is_active: formData.is_active,
    };

    await createItem.mutateAsync(dto);
    setIsAddOpen(false);
    setFormData(defaultFormData);
  };

  const handleEdit = async () => {
    if (!editingItem || !formData.title) return;

    const dto: UpdateToolkitItemDTO = {
      category: formData.category,
      title: formData.title,
      description: formData.description || undefined,
      file_url: formData.file_url || undefined,
      file_type: formData.file_type || undefined,
      file_size: formData.file_size || undefined,
      sort_order: formData.sort_order,
      is_active: formData.is_active,
    };

    await updateItem.mutateAsync({ id: editingItem.id, dto });
    setIsEditOpen(false);
    setEditingItem(null);
    setFormData(defaultFormData);
  };

  const handleDelete = async (item: PDPToolkitItem) => {
    const confirmed = await confirmDelete({
      title: 'Delete Toolkit Item',
      message: `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
    });
    if (confirmed) {
      await deleteItem.mutateAsync(item.id);
    }
  };

  const handleToggleActive = async (item: PDPToolkitItem) => {
    await updateItem.mutateAsync({
      id: item.id,
      dto: { is_active: !item.is_active },
    });
  };

  const openEditDialog = (item: PDPToolkitItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      title: item.title,
      description: item.description || '',
      file_url: item.file_url,
      file_type: item.file_type || '',
      file_size: item.file_size || 0,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setIsEditOpen(true);
  };

  const openAddDialog = () => {
    setFormData(defaultFormData);
    setIsAddOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load toolkit items. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Toolkit Management</h1>
          <p className="text-gray-600 mt-1">
            Manage downloadable resources for PDP partners
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-5 gap-4">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = categoryCounts[cat.value];
          const isSelected = filterCategory === cat.value;
          return (
            <Card
              key={cat.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setFilterCategory(isSelected ? 'all' : cat.value)}
            >
              <CardContent className="pt-4 text-center">
                <div className={`p-2 rounded-lg inline-block ${cat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-medium mt-2 text-sm">{cat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Toolkit Items
            {filterCategory !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {CATEGORIES.find(c => c.value === filterCategory)?.label}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            {filterCategory !== 'all' && ' in this category'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No items found</p>
              <p className="text-sm mt-1">
                {filterCategory !== 'all'
                  ? 'No items in this category. Click "Add Item" to create one.'
                  : 'Click "Add Item" to add your first toolkit resource.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>File Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => {
                  const catConfig = getCategoryConfig(item.category);
                  const CatIcon = catConfig.icon;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className={`p-1.5 rounded inline-flex ${catConfig.color}`}>
                          <CatIcon className="h-4 w-4" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.file_type?.toUpperCase() || 'FILE'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatFileSize(item.file_size)}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {item.sort_order}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => handleToggleActive(item)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(item.file_url, '_blank')}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Toolkit Item</DialogTitle>
            <DialogDescription>
              Upload a new resource for PDP partners
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v: ToolkitCategory) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="h-4 w-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., BDA Partner Logo (PNG)"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the resource..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>File *</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.file_url ? 'File uploaded' : ''}
                  placeholder="No file selected"
                  readOnly
                  className="flex-1"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.svg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formData.file_url && (
                <p className="text-xs text-gray-500">
                  {formData.file_type?.toUpperCase()} • {formatFileSize(formData.file_size)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Active</Label>
                <div className="pt-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!formData.title || !formData.file_url || createItem.isPending}
            >
              {createItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Toolkit Item</DialogTitle>
            <DialogDescription>
              Update resource details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v: ToolkitCategory) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="h-4 w-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Replace File (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.file_url ? 'Current file' : ''}
                  placeholder="No file"
                  readOnly
                  className="flex-1"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.svg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
                {formData.file_url && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(formData.file_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {formData.file_type && (
                <p className="text-xs text-gray-500">
                  {formData.file_type.toUpperCase()} • {formatFileSize(formData.file_size)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Active</Label>
                <div className="pt-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!formData.title || updateItem.isPending}
            >
              {updateItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
