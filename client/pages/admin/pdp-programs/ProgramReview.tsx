/**
 * PDP Program Review Page
 * Dedicated page for reviewing and approving/rejecting PDP program submissions
 * Replaces the modal-based review workflow
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AdminPageLayout } from '@/components/admin/AdminPageLayout';
import {
  GraduationCap,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
  FileText,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const reviewChecklist = [
  { id: 'content', label: 'Content aligns with stated learning objectives' },
  { id: 'competencies', label: 'BoCK competency mapping is accurate' },
  { id: 'pdc', label: 'PDC credits are appropriate for duration and content' },
  { id: 'audience', label: 'Target audience is clearly defined' },
  { id: 'materials', label: 'Program materials/agenda provided' },
  { id: 'instructor', label: 'Instructor qualifications verified' },
];

export default function ProgramReview() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [pdcAdjustment, setPdcAdjustment] = useState<number | null>(null);

  // Fetch program
  const { data: program, isLoading, error } = useQuery({
    queryKey: ['pdp-program', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdp_programs')
        .select(`
          *,
          users!pdp_programs_provider_id_fkey(
            id,
            email,
            first_name,
            last_name,
            company_name
          ),
          pdp_program_competencies(
            relevance_level,
            bock_competencies(
              code,
              name
            )
          )
        `)
        .eq('id', programId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  // Update program mutation
  const updateProgramMutation = useMutation({
    mutationFn: async ({
      status,
      pdc_credits,
      notes,
    }: {
      status: string;
      pdc_credits?: number;
      notes?: string;
    }) => {
      const updateData: any = {
        status,
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
      };

      if (pdc_credits !== undefined && program?.status !== 'approved') {
        updateData.max_pdc_credits = pdc_credits;
      }

      const { error } = await supabase
        .from('pdp_programs')
        .update(updateData)
        .eq('id', programId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-programs'] });
      queryClient.invalidateQueries({ queryKey: ['pdp-program', programId] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: 'Failed to update program status. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleApprove = async () => {
    await updateProgramMutation.mutateAsync({
      status: 'approved',
      pdc_credits: pdcAdjustment || program?.max_pdc_credits,
      notes: reviewNotes,
    });

    toast({
      title: 'Program Approved',
      description: `"${program?.program_name}" has been approved for ${
        pdcAdjustment || program?.max_pdc_credits
      } PDCs`,
    });

    navigate('/admin/pdp-programs');
  };

  const handleReject = async () => {
    await updateProgramMutation.mutateAsync({
      status: 'rejected',
      notes: reviewNotes,
    });

    toast({
      title: 'Program Rejected',
      description: `"${program?.program_name}" has been rejected`,
      variant: 'destructive',
    });

    navigate('/admin/pdp-programs');
  };

  const handleRequestRevision = async () => {
    await updateProgramMutation.mutateAsync({
      status: 'revision_requested',
      notes: reviewNotes,
    });

    toast({
      title: 'Revision Requested',
      description: `Revision request sent to partner`,
    });

    navigate('/admin/pdp-programs');
  };

  if (isLoading) {
    return (
      <AdminPageLayout title="Loading..." backTo="/admin/pdp-programs">
        <Skeleton className="h-96 w-full" />
      </AdminPageLayout>
    );
  }

  if (error || !program) {
    return (
      <AdminPageLayout title="Program Not Found" backTo="/admin/pdp-programs">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Program not found or an error occurred.</AlertDescription>
        </Alert>
      </AdminPageLayout>
    );
  }

  const provider = program.users || null;
  const partnerName = program.provider_name || provider?.company_name || `${provider?.first_name || ''} ${provider?.last_name || ''}`.trim() || 'Unknown Partner';

  return (
    <AdminPageLayout
      title="Program Review"
      subtitle={program.program_id}
      backTo="/admin/pdp-programs"
      
    >
      <div className="space-y-6">
        {/* Program Info */}
        <Card>
          <CardHeader>
            <CardTitle>Program Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-gray-500">Program Name</Label>
                <p className="font-medium">{program.program_name}</p>
              </div>
              <div>
                <Label className="text-gray-500">Partner</Label>
                <p className="font-medium">{partnerName}</p>
              </div>
              <div>
                <Label className="text-gray-500">Activity Type</Label>
                <p className="font-medium capitalize">{program.activity_type.replace('_', ' ')}</p>
              </div>
              <div>
                <Label className="text-gray-500">Delivery Mode</Label>
                <p className="font-medium capitalize">{program.delivery_mode?.replace('_', ' ') || '—'}</p>
              </div>
              <div>
                <Label className="text-gray-500">Language</Label>
                <p className="font-medium">{program.delivery_language || 'English'}</p>
              </div>
              <div>
                <Label className="text-gray-500">Duration</Label>
                <p className="font-medium">{program.duration_hours || 0} hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDC Review */}
        <Card>
          <CardHeader>
            <CardTitle>PDC Credits Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-gray-500">PDC Credits Requested</Label>
                <p className="text-2xl font-bold">{program.max_pdc_credits}</p>
              </div>
              {program.status === 'approved' ? (
                <div className="max-w-sm text-right text-sm text-gray-500">
                  PDC credits are locked because this programme is already an approved accreditation record.
                </div>
              ) : (
                <div className="text-right">
                  <Label htmlFor="pdcAdjustment">Adjust PDCs (optional)</Label>
                  <Input
                    id="pdcAdjustment"
                    type="number"
                    className="w-24"
                    placeholder={program.max_pdc_credits.toString()}
                    min={1}
                    max={program.max_pdc_credits}
                    value={pdcAdjustment || ''}
                    onChange={(e) => setPdcAdjustment(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
              )}
            </div>
            {pdcAdjustment && pdcAdjustment < program.max_pdc_credits && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  PDC credits will be reduced from {program.max_pdc_credits} to {pdcAdjustment}. Please
                  provide justification in the notes.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Program Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{program.description || 'No description provided.'}</p>
          </CardContent>
        </Card>

        {/* Learning Outcomes */}
        {program.learning_outcomes && program.learning_outcomes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Learning Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {program.learning_outcomes.map((outcome: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* BoCK Competencies */}
        {program.pdp_program_competencies && program.pdp_program_competencies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>BoCK Competency Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {program.pdp_program_competencies.map((comp: any) => (
                  <div
                    key={comp.bock_competencies?.code}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{comp.bock_competencies?.code}</Badge>
                      <span>{comp.bock_competencies?.name}</span>
                    </div>
                    <Badge
                      className={
                        comp.relevance_level === 'primary'
                          ? 'bg-blue-100 text-blue-700'
                          : comp.relevance_level === 'secondary'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }
                    >
                      {comp.relevance_level}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        {(program.agenda_url || program.brochure_url) && (
          <Card>
            <CardHeader>
              <CardTitle>Program Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {program.agenda_url && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-blue-700">Program Agenda</span>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
              {program.brochure_url && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-blue-700">Program Brochure</span>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Review Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Review Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="checklist">
                <AccordionTrigger>Review Items</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {reviewChecklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          id={item.id}
                          checked={checkedItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCheckedItems([...checkedItems, item.id]);
                            } else {
                              setCheckedItems(checkedItems.filter((i) => i !== item.id));
                            }
                          }}
                        />
                        <label htmlFor={item.id} className="text-sm cursor-pointer">
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Review Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Review Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add notes for the partner or internal record..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={updateProgramMutation.isPending}
            className="text-red-600"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            variant="outline"
            onClick={handleRequestRevision}
            disabled={updateProgramMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Request Revision
          </Button>
          <Button
            onClick={handleApprove}
            disabled={updateProgramMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </div>
      </div>
    </AdminPageLayout>
  );
}
