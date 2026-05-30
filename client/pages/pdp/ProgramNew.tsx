/**
 * PDP Program New Page
 * Create a new PDP program
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgramForm } from './components/ProgramForm';
import { useCreateProgram, useProgramSlotStatus } from '@/entities/pdp';
import type { CreateProgramDTO } from '@/entities/pdp';

export default function PDPProgramNew() {
  const navigate = useNavigate();
  const createMutation = useCreateProgram();
  const { data: slotStatus, isLoading: slotLoading, error: slotError } = useProgramSlotStatus();

  const canSubmit = slotStatus?.can_submit === true;
  const hasAvailableSlots =
    slotStatus?.remaining_slots !== undefined && slotStatus.remaining_slots > 0;

  const handleSubmit = async (data: CreateProgramDTO) => {
    const result = await createMutation.mutateAsync(data);
    if (!result.error) {
      navigate('/pdp/programs');
    }
  };

  if (slotLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (slotError || !canSubmit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/pdp/programs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Programs
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Create Program</h1>
          <p className="text-gray-600 mt-2">Create a new professional development program</p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Program Creation Not Available</AlertTitle>
          <AlertDescription>
            {slotError ? (
              'Unable to verify your license status. Please try again later.'
            ) : slotStatus?.reason ? (
              slotStatus.reason
            ) : !hasAvailableSlots && slotStatus?.max_programs ? (
              <>
                You have reached your maximum program limit ({slotStatus.max_programs} programs).
                Please contact BDA administration to request additional program slots.
              </>
            ) : (
              'You are not authorised to create programs at this time. Please contact BDA administration to set up your PDP license.'
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/pdp/programs')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Programs
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Create Program</h1>
        <p className="text-gray-600 mt-2">Create a new professional development program</p>
      </div>

      {slotStatus && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Program Slots</AlertTitle>
          <AlertDescription>
            You have {slotStatus.remaining_slots} of {slotStatus.max_programs} program slots
            available.
            {slotStatus.remaining_slots <= 2 && slotStatus.remaining_slots > 0 && (
              <span className="text-orange-600 ml-1">Consider requesting more slots soon.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <ProgramForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/pdp/programs')}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
