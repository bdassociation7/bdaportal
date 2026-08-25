/**
 * ECP Trainer New Page
 * Register a new trainer profile with an optional immediate portal invite
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrainerForm } from './components/TrainerForm';
import { useCreateTrainer } from '@/entities/ecp';
import type { CreateTrainerDTO } from '@/entities/ecp';
import { supabase } from '@/shared/config/supabase.config';

export default function ECPTrainerNew() {
  const navigate = useNavigate();
  const createMutation = useCreateTrainer();

  const handleSubmit = async (data: CreateTrainerDTO, sendInvite: boolean) => {
    // 1. Create trainer record
    const result = await createMutation.mutateAsync(data);
    if (result.error || !result.data) return;

    const trainerId = result.data.id;

    // 2. Send invite if requested
    if (sendInvite) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch('/api/trainers/invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ trainer_id: trainerId }),
        });
      } catch (err) {
        // Invite failure is non-blocking — trainer is still created
        console.warn('Invite send failed:', err);
      }
    }

    navigate('/ecp/trainers');
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
