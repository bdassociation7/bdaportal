/**
 * Admin - Training Batch Detail Page
 * View detailed information about any training batch across all ECP partners
 */

import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Calendar,
  Edit,
  Users,
  MapPin,
  Monitor,
  Trash2,
  AlertCircle,
  Clock,
  User,
  BookOpen,
  CheckCircle,
  XCircle,
  Building2,
} from 'lucide-react';
import { useBatch, useDeleteBatch, useUpdateBatch } from '@/entities/ecp';
import type { BatchStatus } from '@/entities/ecp';
import { useCommonConfirms } from '@/hooks/use-confirm';

const STATUS_COLORS: Record<BatchStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const MODE_ICONS = {
  in_person: MapPin,
  online: Monitor,
  hybrid: Monitor,
};

export default function AdminECPTrainingBatchDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: batch, isLoading, error } = useBatch(id!);
  const deleteMutation = useDeleteBatch();
  const updateMutation = useUpdateBatch();
  const { confirmDelete, confirm } = useCommonConfirms();

  const handleDelete = async () => {
    if (!id) return;

    const confirmed = await confirmDelete('this training batch');
    if (!confirmed) return;

    await deleteMutation.mutateAsync(id);

    if (!deleteMutation.isError) {
      navigate('/admin/ecp/trainings');
    }
  };

  const handleStatusChange = async (status: BatchStatus) => {
    if (!id) return;

    await updateMutation.mutateAsync({
      id,
      dto: { status },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/ecp/trainings')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Calendar className="h-8 w-8" />
                Training Batch
              </h1>
            </div>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Training batch not found.
          </AlertDescription>
        </Alert>

        <Button onClick={() => navigate('/admin/ecp/trainings')}>
          Back to Training Batches
        </Button>
      </div>
    );
  }

  const ModeIcon = MODE_ICONS[batch.training_mode];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/ecp/trainings')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{batch.batch_name}</h1>
              <p className="mt-2 opacity-90 font-mono">{batch.batch_code}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/admin/ecp/trainings/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            {batch.status === 'draft' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Partner Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-gray-500" />
            <div>
              <div className="text-sm text-gray-500">ECP Partner</div>
              <div className="font-medium text-lg">Partner Name</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Badge and Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Status</div>
                <Badge className={`${STATUS_COLORS[batch.status]} text-base`}>
                  {batch.status}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Certification Type</div>
                <Badge
                  variant="outline"
                  className={`text-base ${
                    batch.certification_type === 'CP'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  BDA-{batch.certification_type}™
                </Badge>
              </div>
            </div>

            {/* Status Actions */}
            <div className="flex gap-2">
              {batch.status === 'draft' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('scheduled')}
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              )}
              {batch.status === 'scheduled' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Start Training
                </Button>
              )}
              {batch.status === 'in_progress' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('completed')}
                    disabled={updateMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Completed
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: 'Cancel In-Progress Training',
                        description: 'Are you sure you want to cancel this in-progress training? This action cannot be undone.',
                        confirmText: 'Cancel Training',
                        cancelText: 'Keep Training',
                        variant: 'destructive',
                      });
                      if (confirmed) {
                        handleStatusChange('cancelled');
                      }
                    }}
                    disabled={updateMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Training
                  </Button>
                </>
              )}
              {(batch.status === 'draft' || batch.status === 'scheduled') && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: 'Cancel Training Batch',
                      description: 'Are you sure you want to cancel this training batch?',
                      confirmText: 'Cancel Batch',
                      cancelText: 'Keep Batch',
                      variant: 'destructive',
                    });
                    if (confirmed) {
                      handleStatusChange('cancelled');
                    }
                  }}
                  disabled={updateMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Training Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Training Period</div>
              <div className="font-medium">{formatDate(batch.training_start_date)}</div>
              <div className="text-gray-500">to {formatDate(batch.training_end_date)}</div>
            </div>

            {batch.exam_date && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Exam Date</div>
                <div className="font-medium text-blue-600">{formatDate(batch.exam_date)}</div>
              </div>
            )}

            <div>
              <div className="text-sm text-gray-500 mb-1">Training Mode</div>
              <div className="flex items-center gap-2">
                <ModeIcon className="h-4 w-4 text-gray-500" />
                <span className="font-medium capitalize">
                  {batch.training_mode.replace('_', ' ')}
                </span>
              </div>
            </div>

            {batch.training_location && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Location</div>
                <div className="font-medium">{batch.training_location}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trainer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Trainer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {batch.trainer ? (
              <div className="space-y-2">
                <div className="font-medium text-lg">
                  {batch.trainer.first_name} {batch.trainer.last_name}
                </div>
                {batch.trainer.email && (
                  <div className="text-sm text-gray-600">{batch.trainer.email}</div>
                )}
                {batch.trainer.phone && (
                  <div className="text-sm text-gray-600">{batch.trainer.phone}</div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">No trainer assigned yet</div>
            )}
          </CardContent>
        </Card>

        {/* Enrolment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Enrolment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Capacity</div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  {batch.trainee_count || 0} / {batch.max_capacity}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      ((batch.trainee_count || 0) / batch.max_capacity) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate(`/admin/ecp/${batch.partner_id}?tab=trainees&batch_id=${batch.id}`)}
            >
              <Users className="h-4 w-4 mr-2" />
              View Trainees
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {batch.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{batch.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {new Date(batch.created_at).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>{' '}
              {new Date(batch.updated_at).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
