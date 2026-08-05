/**
 * Admin - ECP Training Batches Management
 * View and manage training batches across all ECP partners
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Search,
  PlusCircle,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Play,
  CheckCircle,
  XCircle,
  MapPin,
  Monitor,
  Eye,
  Building2,
} from 'lucide-react';
import { useBatches, useUpdateBatch, useDeleteBatch } from '@/entities/ecp';
import type { TrainingBatch, BatchFilters, BatchStatus, TrainingMode } from '@/entities/ecp';
import { useCommonConfirms } from '@/hooks/use-confirm';

const STATUS_COLORS: Record<BatchStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const MODE_ICONS: Record<TrainingMode, typeof Monitor> = {
  in_person: MapPin,
  online: Monitor,
  hybrid: Monitor,
};

export default function AdminECPTrainingBatches() {
  const navigate = useNavigate();
  const { confirmDelete, confirm } = useCommonConfirms();

  // Filters
  const [filters, setFilters] = useState<BatchFilters>({});
  const [search, setSearch] = useState('');

  // Queries - Admin fetches ALL batches across partners
  const { data: batches, isLoading } = useBatches({ ...filters, search });

  // Mutations
  const updateMutation = useUpdateBatch();
  const deleteMutation = useDeleteBatch();

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete('this training batch');
    if (!confirmed) return;
    await deleteMutation.mutateAsync(id);
  };

  const handleStatusChange = async (batch: TrainingBatch, status: BatchStatus) => {
    await updateMutation.mutateAsync({
      id: batch.id,
      dto: { status },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-8 w-8" />
              ECP Training Batches
            </h1>
            <p className="mt-2 opacity-90">
              Manage training batches across all ECP partners
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/ecp/trainings/new')}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{batches?.length || 0}</div>
            <div className="text-sm text-gray-500">Total Batches</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {batches?.filter((b) => b.status === 'draft').length || 0}
            </div>
            <div className="text-sm text-gray-500">Draft</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {batches?.filter((b) => b.status === 'scheduled').length || 0}
            </div>
            <div className="text-sm text-gray-500">Scheduled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {batches?.filter((b) => b.status === 'in_progress').length || 0}
            </div>
            <div className="text-sm text-gray-500">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {batches?.filter((b) => b.status === 'completed').length || 0}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search batches..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value === 'all' ? undefined : (value as BatchStatus) })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CP">CP</SelectItem>
                <SelectItem value="SCP">SCP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Training Batches</CardTitle>
          <CardDescription>View and manage training batches across all ECP partners</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Certification</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Enrolment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches && batches.length > 0 ? (
                batches.map((batch) => {
                  const ModeIcon = MODE_ICONS[batch.training_mode];
                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Partner Name</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{batch.batch_name}</div>
                          <div className="text-sm text-gray-500 font-mono">{batch.batch_code}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <ModeIcon className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500 capitalize">
                              {batch.training_mode.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            batch.certification_type === 'CP'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-purple-50 text-purple-700'
                          }
                        >
                          BDA-{batch.certification_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(batch.training_start_date)}</div>
                          <div className="text-gray-500">to {formatDate(batch.training_end_date)}</div>
                          {batch.exam_date && (
                            <div className="text-xs text-blue-600 mt-1">
                              Exam: {formatDate(batch.exam_date)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {batch.trainer ? (
                          <div className="text-sm">
                            {batch.trainer.first_name} {batch.trainer.last_name}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>
                            {batch.trainee_count || 0}/{batch.max_capacity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[batch.status]}>{batch.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/ecp/trainings/${batch.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/ecp/trainings/${batch.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/admin/ecp/${batch.partner_id}?tab=trainees&batch_id=${batch.id}`)
                              }
                            >
                              <Users className="h-4 w-4 mr-2" />
                              View Trainees
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {batch.status === 'draft' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(batch, 'scheduled')}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Schedule
                              </DropdownMenuItem>
                            )}
                            {batch.status === 'scheduled' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(batch, 'in_progress')}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Start Training
                              </DropdownMenuItem>
                            )}
                            {batch.status === 'in_progress' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(batch, 'completed')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Completed
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={async () => {
                                    const confirmed = await confirm({
                                      title: 'Cancel In-Progress Training',
                                      description: 'Are you sure you want to cancel this in-progress training? This action cannot be undone.',
                                      confirmText: 'Cancel Training',
                                      cancelText: 'Keep Training',
                                      variant: 'destructive',
                                    });
                                    if (confirmed) {
                                      handleStatusChange(batch, 'cancelled');
                                    }
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Training
                                </DropdownMenuItem>
                              </>
                            )}
                            {(batch.status === 'draft' || batch.status === 'scheduled') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={async () => {
                                    const confirmed = await confirm({
                                      title: 'Cancel Training Batch',
                                      description: 'Are you sure you want to cancel this training batch?',
                                      confirmText: 'Cancel Batch',
                                      cancelText: 'Keep Batch',
                                      variant: 'destructive',
                                    });
                                    if (confirmed) {
                                      handleStatusChange(batch, 'cancelled');
                                    }
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                            {batch.status === 'draft' && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(batch.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                    <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No training batches found</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate('/admin/ecp/trainings/new')}
                    >
                      Create first batch
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
