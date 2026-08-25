/**
 * Create New Training Batch Page
 * Dedicated page for creating new training batches
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateBatch } from '@/entities/ecp';
import { BatchForm } from './components/BatchForm';
import type { CreateBatchDTO } from '@/entities/ecp';

export default function ECPTrainingBatchNew() {
  const navigate = useNavigate();
  const createMutation = useCreateBatch();

  const handleSubmit = async (data: CreateBatchDTO) => {
    await createMutation.mutateAsync(data);

    if (!createMutation.isError) {
      navigate('/ecp/trainings');
    }
  };

  const handleCancel = () => {
    navigate('/ecp/trainings');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f91e0] via-[#1c4a8b] to-[#0d1f4e] px-6 py-7 text-white shadow-sm sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-[-92px] left-1/3 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/ecp/trainings')} className="text-white hover:bg-white/15 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-lg"><Calendar className="h-6 w-6" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">ECP delivery operations</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Create Training Batch</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Open an internal operational record for a unified BDA curriculum delivery. Exams, vouchers, and certification decisions remain separate.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-blue-100 shadow-sm dark:border-sky-900/60">
        <CardHeader className="border-b border-blue-50 bg-[#f0f6ff]/60 dark:border-sky-900/50 dark:bg-slate-900/60">
          <CardTitle className="text-[#0d1f4e] dark:text-sky-100">Operational delivery details</CardTitle>
          <CardDescription>All details are optional operational information. You can complete or update the record whenever your delivery plan is ready.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <BatchForm onSubmit={handleSubmit} onCancel={handleCancel} isSubmitting={createMutation.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
