/**
 * ECP Trainer Detail Page
 * View detailed information about a specific trainer
 */

import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Edit,
  Trash2,
  AlertCircle,
  Mail,
  Phone,
  Linkedin,
  Award,
  Calendar,
  FileText,
  UserCheck,
  ExternalLink,
  Send,
  KeyRound,
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/shared/config/supabase.config';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTrainer, useDeleteTrainer, useUpdateTrainer } from '@/entities/ecp';
import type { TrainerStatus } from '@/entities/ecp';
import { useCommonConfirms } from '@/hooks/use-confirm';

const STATUS_COLORS: Record<TrainerStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  inactive: 'bg-gray-100 text-gray-700',
};

export default function ECPTrainerDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: trainer, isLoading, error } = useTrainer(id!);
  const deleteMutation = useDeleteTrainer();
  const updateMutation = useUpdateTrainer();
  const { confirmDelete, confirm } = useCommonConfirms();
  const { user } = useAuthContext();

  const handleDelete = async () => {
    if (!id) return;

    const confirmed = await confirmDelete('this trainer');
    if (!confirmed) return;

    await deleteMutation.mutateAsync(id);

    if (!deleteMutation.isError) {
      navigate('/ecp/trainers');
    }
  };

  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const handleSendInvite = async () => {
    if (!id || !trainer) return;
    setInviteLoading(true);
    setInviteMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/trainers/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ trainer_id: id }),
      });
      const json = await res.json();
      if (json.success) {
        setInviteMessage(json.already_active ? 'Trainer already has an active account.' : `Invitation sent to ${trainer.email}`);
      } else {
        setInviteMessage(`Error: ${json.error}`);
      }
    } catch (err: any) {
      setInviteMessage('Failed to send invitation. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!id || !trainer) return;

    const action = trainer.is_active ? 'deactivate' : 'activate';
    const confirmed = await confirm({
      title: `${action === 'activate' ? 'Activate' : 'Deactivate'} Trainer`,
      description: `Are you sure you want to ${action} ${trainer.first_name} ${trainer.last_name}?`,
      confirmText: action === 'activate' ? 'Activate' : 'Deactivate',
      cancelText: 'Cancel',
      variant: action === 'deactivate' ? 'destructive' : 'default',
    });

    if (!confirmed) return;

    // Use suspend_trainer_account which also updates the linked user account
    if (user?.id) {
      const { data: result } = await supabase.rpc('suspend_trainer_account', {
        p_trainer_id: id,
        p_caller_id: user.id,
        p_suspend: trainer.is_active, // true = suspend (currently active), false = reactivate
      });
      if (!result?.success) {
        console.error('Suspend failed:', result?.error);
        return;
      }
    }
    // Also refresh local cache via updateMutation
    await updateMutation.mutateAsync({
      id,
      dto: { is_active: !trainer.is_active },
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

  if (error || !trainer) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/ecp/trainers')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <UserCheck className="h-8 w-8" />
                Trainer
              </h1>
            </div>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Trainer not found or you don't have permission to view them.
          </AlertDescription>
        </Alert>

        <Button onClick={() => navigate('/ecp/trainers')}>Back to Trainers</Button>
      </div>
    );
  }

  const isExpired = trainer.trainer_certification_expiry && new Date(trainer.trainer_certification_expiry) < new Date();
  const isExpiringSoon = trainer.trainer_certification_expiry &&
    new Date(trainer.trainer_certification_expiry).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/ecp/trainers')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {trainer.first_name[0]}
                  {trainer.last_name[0]}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {trainer.first_name} {trainer.last_name}
                </h1>
                {trainer.trainer_code && (
                  <p className="mt-1 opacity-90 font-mono">{trainer.trainer_code}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendInvite}
              disabled={inviteLoading || !!(trainer as any).user_id}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {(trainer as any).user_id
                ? <><KeyRound className="h-4 w-4 mr-2" />Account Active</>
                : <><Send className="h-4 w-4 mr-2" />{inviteLoading ? 'Sending...' : 'Send Invite'}</>
              }
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/ecp/trainers/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant={trainer.is_active ? 'destructive' : 'secondary'}
              size="sm"
              onClick={handleToggleActive}
              disabled={updateMutation.isPending}
            >
              {trainer.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      </div>

      {/* Status & Warnings */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Status</div>
                  <Badge className={`${STATUS_COLORS[trainer.status]} text-base`}>
                    {trainer.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Active Status</div>
                  <Badge variant={trainer.is_active ? 'default' : 'outline'} className="text-base">
                    {trainer.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Portal Account</div>
                  <Badge
                    className={`text-base ${
                      (trainer as any).user_id
                        ? 'bg-emerald-100 text-emerald-700'
                        : (trainer as any).invite_status === 'invited'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {(trainer as any).user_id
                      ? 'Active Account'
                      : (trainer as any).invite_status === 'invited'
                        ? 'Invite Sent'
                        : 'No Account'
                    }
                  </Badge>
                </div>
              </div>
              {inviteMessage && (
                <p className={`mt-3 text-sm font-medium ${
                  inviteMessage.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'
                }`}>{inviteMessage}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {isExpired && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This trainer's certification expired on {formatDate(trainer.trainer_certification_expiry!)}.
              They cannot conduct training sessions until recertified.
            </AlertDescription>
          </Alert>
        )}

        {!isExpired && isExpiringSoon && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This trainer's certification will expire soon on {formatDate(trainer.trainer_certification_expiry!)}.
              Consider renewal to avoid interruption.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Email</div>
              <a
                href={`mailto:${trainer.email}`}
                className="font-medium text-blue-600 hover:underline flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {trainer.email}
              </a>
            </div>
            {trainer.phone && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Phone</div>
                <a
                  href={`tel:${trainer.phone}`}
                  className="font-medium flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {trainer.phone}
                </a>
              </div>
            )}
            {trainer.linkedin_url && (
              <div>
                <div className="text-sm text-gray-500 mb-1">LinkedIn</div>
                <a
                  href={trainer.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Linkedin className="h-4 w-4" />
                  View Profile
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-2">Certifications Held</div>
              <div className="flex gap-2">
                {trainer.certifications && trainer.certifications.length > 0 ? (
                  trainer.certifications.map(cert => (
                    <Badge
                      key={cert}
                      variant="outline"
                      className={
                        cert === 'CP'
                          ? 'bg-green-50 text-green-700 text-base'
                          : 'bg-purple-50 text-purple-700 text-base'
                      }
                    >
                      {cert}
                    </Badge>
                  ))
                ) : (
                  <span className="text-gray-400">No certifications</span>
                )}
              </div>
            </div>

            {trainer.trainer_certification_date && (
              <div>
                <div className="text-sm text-gray-500 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Certification Date
                </div>
                <div className="font-medium">{formatDate(trainer.trainer_certification_date)}</div>
              </div>
            )}

            {trainer.trainer_certification_expiry && (
              <div>
                <div className="text-sm text-gray-500 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Expiry Date
                </div>
                <div
                  className={`font-medium ${
                    isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-green-600'
                  }`}
                >
                  {formatDate(trainer.trainer_certification_expiry)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bio / Qualifications */}
      {trainer.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Bio / Qualifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{trainer.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {new Date(trainer.created_at).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>{' '}
              {new Date(trainer.updated_at).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
