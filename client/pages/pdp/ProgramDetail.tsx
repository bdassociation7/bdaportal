/**
 * PDP Program Detail Page
 * View detailed information about a specific program
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
  Award,
  Clock,
  Calendar,
  BookOpen,
  Target,
  Users,
  Send,
  CheckCircle,
} from 'lucide-react';
import { useProgram, useDeleteProgram, useSubmitProgram } from '@/entities/pdp';
import type { ProgramStatus, ActivityType } from '@/entities/pdp';
import { useCommonConfirms } from '@/hooks/use-confirm';

const statusColors: Record<ProgramStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

const activityTypeLabels: Record<ActivityType, string> = {
  training_course: 'Training Course',
  conference: 'Conference',
  workshop: 'Workshop',
  webinar: 'Webinar',
  self_study: 'Self Study',
  teaching: 'Teaching',
  publication: 'Publication',
  volunteer_work: 'Volunteer Work',
  other: 'Other',
};

export default function PDPProgramDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: program, isLoading, error } = useProgram(id!);
  const deleteMutation = useDeleteProgram();
  const submitMutation = useSubmitProgram();
  const { confirmDelete, confirm } = useCommonConfirms();

  const handleDelete = async () => {
    if (!id) return;

    const confirmed = await confirmDelete(`"${program?.program_name}"`);
    if (!confirmed) return;

    await deleteMutation.mutateAsync(id);

    if (!deleteMutation.isError) {
      navigate('/pdp/programs');
    }
  };

  const handleSubmit = async () => {
    if (!id || !program) return;

    const confirmed = await confirm({
      title: 'Submit Program for Review',
      description: `Are you sure you want to submit "${program.program_name}" for accreditation review? Once submitted, you won't be able to edit it until the review is complete.`,
      confirmText: 'Submit for Review',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    await submitMutation.mutateAsync(id);
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

  if (error || !program) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pdp/programs')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8" />
                Program
              </h1>
            </div>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Program not found or you don't have permission to view it.
          </AlertDescription>
        </Alert>

        <Button onClick={() => navigate('/pdp/programs')}>Back to Programs</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pdp/programs')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{program.program_name}</h1>
              <p className="mt-2 opacity-90 font-mono">{program.program_id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {program.status === 'draft' && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/pdp/programs/${id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="secondary" size="sm" onClick={handleSubmit} disabled={submitMutation.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Review
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
            {program.status === 'rejected' && (
              <Button variant="secondary" size="sm" onClick={() => navigate(`/pdp/programs/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Revise & Resubmit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Status</div>
                <Badge className={`${statusColors[program.status || 'draft']} text-base`}>
                  {program.status || 'draft'}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Activity Type</div>
                <Badge variant="outline" className="text-base">
                  {activityTypeLabels[program.activity_type]}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Program Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Program Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">PDC Credits</div>
              <div className="text-2xl font-bold text-purple-600">{program.max_pdc_credits}</div>
            </div>
            {program.duration_hours && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Duration</div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{program.duration_hours} hours</span>
                </div>
              </div>
            )}
            {program.delivery_mode && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Delivery Mode</div>
                <div className="font-medium capitalize">{program.delivery_mode.replace('_', ' ')}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Validity Period */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Validity Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Valid From</div>
              <div className="font-medium">{formatDate(program.valid_from)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Valid Until</div>
              <div className="font-medium">{formatDate(program.valid_until)}</div>
            </div>
          </CardContent>
        </Card>

        {/* Enrolment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Enrolments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Enrolments</div>
              <div className="text-2xl font-bold text-blue-600">{program.enrolment_count || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {program.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{program.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Target Audience & Prerequisites */}
      {(program.target_audience || program.prerequisites) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {program.target_audience && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Target Audience</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{program.target_audience}</p>
              </CardContent>
            </Card>
          )}
          {program.prerequisites && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prerequisites</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{program.prerequisites}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Learning Outcomes */}
      {program.learning_outcomes && program.learning_outcomes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Learning Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {program.learning_outcomes.map((outcome, index) => (
                <li key={index} className="text-gray-700">
                  {outcome}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* BoCK Competencies */}
      {program.competencies && program.competencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              BoCK Competency Mapping ({program.competencies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['primary', 'secondary', 'supporting'].map(level => {
                const comps = program.competencies?.filter(c => c.relevance_level === level);
                if (!comps || comps.length === 0) return null;
                return (
                  <div key={level} className="flex items-start gap-2">
                    <Badge
                      className={
                        level === 'primary'
                          ? 'bg-blue-600'
                          : level === 'secondary'
                          ? 'bg-purple-600'
                          : 'bg-gray-600'
                      }
                    >
                      {level}
                    </Badge>
                    <div className="flex flex-wrap gap-2">
                      {comps.map(pc =>
                        pc.competency ? (
                          <Badge key={pc.id} variant="outline">
                            {pc.competency.code} - {pc.competency.name}
                          </Badge>
                        ) : null
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {new Date(program.created_at).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {new Date(program.updated_at).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
