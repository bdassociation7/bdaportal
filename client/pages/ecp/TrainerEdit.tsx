/**
 * ECP Trainer Edit Page
 * Edit an existing trainer
 */

import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TrainerForm } from './components/TrainerForm';
import { useTrainer, useUpdateTrainer } from '@/entities/ecp';
import type { CreateTrainerDTO } from '@/entities/ecp';

export default function ECPTrainerEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: trainer, isLoading, error } = useTrainer(id!);
  const updateMutation = useUpdateTrainer();

  const handleSubmit = async (data: CreateTrainerDTO, _sendInvite?: boolean) => {
    if (!id) return;

    const result = await updateMutation.mutateAsync({ id, dto: data });
    if (!result.error) {
      navigate(`/ecp/trainers/${id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/ecp/trainers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trainers
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Edit Trainer</h1>
          <p className="text-gray-600 mt-2">Update trainer information</p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Trainer not found or you don't have permission to edit them.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/ecp/trainers/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trainer
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Edit Trainer</h1>
        <p className="text-gray-600 mt-2">
          Update information for {trainer.first_name} {trainer.last_name}
        </p>
      </div>

      <TrainerForm
        initialData={trainer}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/ecp/trainers/${id}`)}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
