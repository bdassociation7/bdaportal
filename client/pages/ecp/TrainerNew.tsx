/**
 * ECP Trainer New Page
 * Register a new trainer profile with an optional immediate portal invite
 */

import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrainerForm } from './components/TrainerForm';
import { useCreateTrainer } from '@/entities/ecp';
import type { CreateTrainerDTO } from '@/entities/ecp';
import { supabase } from '@/shared/config/supabase.config';

export default function ECPTrainerNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createMutation = useCreateTrainer();

  const handleSubmit = async (data: CreateTrainerDTO, sendInvite: boolean) => {
    // 1. Create trainer record
    const result = await createMutation.mutateAsync(data);
    if (result.error || !result.data) return;

    const trainerId = result.data.id;

    // 2. Send invitation through the production Edge Function.
    // A trainer record is never reported as invited unless the email provider accepts delivery.
    if (sendInvite) {
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('send-trainer-invite', {
        body: { trainer_id: trainerId },
      });

      if (inviteError || !inviteData?.success) {
        toast({
          title: 'Trainer profile saved',
          description: inviteData?.error || inviteError?.message || 'The invitation was not sent. Please use Send Invite from the trainer profile to try again.',
          variant: 'destructive',
        });
        navigate(`/ecp/trainers/${trainerId}`);
        return;
      }

      toast({
        title: 'Trainer added and invited',
        description: inviteData.already_active ? 'The trainer already has an active account.' : `An activation email was sent to ${data.email}.`,
      });
    }

    navigate(`/ecp/trainers/${trainerId}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <section className="rounded-2xl bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] px-7 py-8 text-white shadow-sm sm:px-10">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ecp/trainers')} className="-ml-2 text-blue-50 hover:bg-white/10 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Trainers
        </Button>
        <p className="mt-5 text-xs font-bold tracking-[0.18em] text-blue-100">BDA ECP TRAINER REGISTER</p>
        <h1 className="mt-3 text-3xl font-bold">Add Trainer Profile</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
          Record the trainer’s professional profile and delivery capabilities, then invite them to activate Instructor View when ready.
        </p>
      </section>

      <TrainerForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/ecp/trainers')}
        isSubmitting={createMutation.isPending}
        showInviteOption={true}
      />
    </div>
  );
}
