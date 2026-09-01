/**
 * PDP Program Edit Page
 * Edit an existing PDP program
 */

import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgramForm } from './components/ProgramForm';
import { useProgram, useUpdateProgram } from '@/entities/pdp';
import type { CreateProgramDTO } from '@/entities/pdp';

export default function PDPProgramEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: program, isLoading, error } = useProgram(id!);
  const updateMutation = useUpdateProgram();

  const handleSubmit = async (data: CreateProgramDTO) => {
    if (!id) return;

    const result = await updateMutation.mutateAsync({ id, dto: data });
    if (!result.error) {
      navigate(`/pdp/programs/${id}`);
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

  if (error || !program) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/pdp/programs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Programs
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Edit Program</h1>
          <p className="text-gray-600 mt-2">Edit an existing program</p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Program not found or you don't have permission to edit it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // In limitedEdit mode the program name is locked; all other fields remain editable.
  const isLimitedEdit = program.status === 'approved';

  // Block editing for submitted, under_review, and expired programs
  if (program.status !== 'draft' && program.status !== 'rejected' && program.status !== 'approved') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/pdp/programs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Programs
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Edit Program</h1>
          <p className="text-gray-600 mt-2">Edit an existing program</p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You cannot edit a program that is {program.status}. Only draft, rejected, and approved programs can be edited.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/pdp/programs/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Program
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Edit Program</h1>
        <p className="text-gray-600 mt-2">
          {isLimitedEdit
            ? 'The accredited programme name is locked after approval. You may update its public directory title and all other programme details.'
            : 'Update your program details'}
        </p>
      </div>

      <ProgramForm
        initialData={program}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/pdp/programs/${id}`)}
        isSubmitting={updateMutation.isPending}
        limitedEdit={isLimitedEdit}
      />
    </div>
  );
}
