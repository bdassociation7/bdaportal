/**
 * Exam Windows Management Page
 * Admin interface for managing certification exam availability windows
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  CalendarClock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ExamWindow {
  id: string;
  name: string;
  description: string | null;
  certification_type: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status?: string;
  created_at: string;
}

interface ExamWindowFormData {
  name: string;
  description: string;
  certification_type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const initialFormData: ExamWindowFormData = {
  name: '',
  description: '',
  certification_type: 'all',
  start_date: '',
  end_date: '',
  is_active: true,
};

export default function ExamWindows() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<ExamWindow | null>(null);
  const [formData, setFormData] = useState<ExamWindowFormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch exam windows
  const { data: examWindows, isLoading } = useQuery({
    queryKey: ['exam-windows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certification_exam_windows')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Add status to each window
      const today = new Date();
      return (data as ExamWindow[]).map((window) => {
        const startDate = new Date(window.start_date);
        const endDate = new Date(window.end_date);

        let status = 'closed';
        if (!window.is_active) {
          status = 'inactive';
        } else if (today < startDate) {
          status = 'upcoming';
        } else if (today >= startDate && today <= endDate) {
          status = 'open';
        }

        return { ...window, status };
      });
    },
  });

  // Check current window status
  const { data: currentWindowStatus } = useQuery({
    queryKey: ['current-exam-window-status'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_exam_window_open', {
        p_certification_type: null,
      });
      if (error) throw error;
      return data?.[0];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ExamWindowFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        certification_type: data.certification_type === 'all' ? null : data.certification_type,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: data.is_active,
      };

      if (editingWindow) {
        const { error } = await supabase
          .from('certification_exam_windows')
          .update(payload)
          .eq('id', editingWindow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('certification_exam_windows')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-windows'] });
      queryClient.invalidateQueries({ queryKey: ['current-exam-window-status'] });
      toast.success(editingWindow ? 'Exam window updated' : 'Exam window created');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save exam window');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('certification_exam_windows')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-windows'] });
      queryClient.invalidateQueries({ queryKey: ['current-exam-window-status'] });
      toast.success('Exam window deleted');
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete exam window');
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('certification_exam_windows')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-windows'] });
      queryClient.invalidateQueries({ queryKey: ['current-exam-window-status'] });
      toast.success('Exam window status updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  const handleOpenDialog = (window?: ExamWindow) => {
    if (window) {
      setEditingWindow(window);
      setFormData({
        name: window.name,
        description: window.description || '',
        certification_type: window.certification_type || 'all',
        start_date: window.start_date,
        end_date: window.end_date,
        is_active: window.is_active,
      });
    } else {
      setEditingWindow(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingWindow(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('End date must be after start date');
      return;
    }
    saveMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      case 'upcoming':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            Upcoming
          </Badge>
        );
      case 'closed':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <XCircle className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCertTypeBadge = (certType: string | null) => {
    if (!certType) {
      return <Badge variant="outline">All Certifications</Badge>;
    }
    return (
      <Badge variant="outline" className="uppercase">
        {certType}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarClock className="h-8 w-8" />
          Exam Windows
        </h1>
        <p className="mt-2 opacity-90">
          Manage certification exam availability windows
        </p>
      </div>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Current Window Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentWindowStatus?.is_open ? (
            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Exam Window is OPEN</p>
                <p className="text-sm text-green-700">
                  {currentWindowStatus.current_window_name} - Ends{' '}
                  {currentWindowStatus.window_end_date
                    ? format(new Date(currentWindowStatus.window_end_date), 'MMMM d, yyyy')
                    : 'N/A'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <XCircle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">Exam Window is CLOSED</p>
                {currentWindowStatus?.next_window_start ? (
                  <p className="text-sm text-orange-700">
                    Next window: {currentWindowStatus.next_window_name} - Opens{' '}
                    {format(new Date(currentWindowStatus.next_window_start), 'MMMM d, yyyy')}
                  </p>
                ) : (
                  <p className="text-sm text-orange-700">No upcoming windows scheduled</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Windows List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Exam Windows</CardTitle>
            <CardDescription>Define when certification exams are available</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Window
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : examWindows && examWindows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examWindows.map((window) => (
                  <TableRow key={window.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{window.name}</p>
                        {window.description && (
                          <p className="text-sm text-gray-500">{window.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getCertTypeBadge(window.certification_type)}</TableCell>
                    <TableCell>{format(new Date(window.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(window.end_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(window.status || 'closed')}</TableCell>
                    <TableCell>
                      <Switch
                        checked={window.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: window.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(window)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteConfirmId(window.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No exam windows defined yet</p>
              <p className="text-sm">Create your first exam window to control when exams are available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingWindow ? 'Edit Exam Window' : 'Create Exam Window'}
            </DialogTitle>
            <DialogDescription>
              Define a time period when certification exams will be available
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Window Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Q1 2026 Exam Window"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certification_type">Certification Type</Label>
              <Select
                value={formData.certification_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, certification_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select certification type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Certifications</SelectItem>
                  <SelectItem value="cp">CP (Certified Professional)</SelectItem>
                  <SelectItem value="scp">SCP (Senior Certified Professional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingWindow ? (
                  'Update Window'
                ) : (
                  'Create Window'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exam Window</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this exam window? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

ExamWindows.displayName = 'ExamWindows';
