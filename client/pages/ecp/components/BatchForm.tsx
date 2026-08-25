/**
 * Reusable operational Training Batch form.
 * A batch records delivery logistics for the unified BDA curriculum only.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, Loader2, MapPin, Monitor, UsersRound } from 'lucide-react';
import { useTrainers } from '@/entities/ecp';
import type { CreateBatchDTO, TrainingBatch, TrainingMode } from '@/entities/ecp';

interface BatchFormProps {
  initialData?: TrainingBatch;
  onSubmit: (data: CreateBatchDTO) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const fieldClass = 'h-11 border-slate-200 bg-white shadow-sm focus-visible:ring-[#0f91e0] dark:border-slate-700 dark:bg-slate-900';

export function BatchForm({ initialData, onSubmit, onCancel, isSubmitting }: BatchFormProps) {
  const [formData, setFormData] = useState<CreateBatchDTO>({
    batch_name: initialData?.batch_name || '',
    batch_name_ar: initialData?.batch_name_ar || '',
    description: initialData?.description || '',
    trainer_id: initialData?.trainer_id || null,
    training_start_date: initialData?.training_start_date || '',
    training_end_date: initialData?.training_end_date || '',
    training_location: initialData?.training_location || '',
    delivery_platform: initialData?.delivery_platform || '',
    training_mode: initialData?.training_mode || 'in_person',
    max_capacity: initialData?.max_capacity || 30,
  });
  const [validationError, setValidationError] = useState('');
  const { data: trainers } = useTrainers({ is_active: true, status: 'approved' });

  const updateField = <K extends keyof CreateBatchDTO>(field: K, value: CreateBatchDTO[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (validationError) setValidationError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      formData.training_start_date &&
      formData.training_end_date &&
      new Date(formData.training_end_date) < new Date(formData.training_start_date)
    ) {
      setValidationError('The end date cannot be earlier than the start date.');
      return;
    }

    if (formData.max_capacity < 1 || formData.max_capacity > 100) {
      setValidationError('Capacity must be between 1 and 100 trainees.');
      return;
    }

    await onSubmit({
      ...formData,
      batch_name: formData.batch_name?.trim() || undefined,
      batch_name_ar: formData.batch_name_ar?.trim() || undefined,
      description: formData.description?.trim() || undefined,
      trainer_id: formData.trainer_id || null,
      training_start_date: formData.training_start_date || undefined,
      training_end_date: formData.training_end_date || undefined,
      training_location: formData.training_location?.trim() || undefined,
      delivery_platform: formData.delivery_platform?.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-[#0f91e0]/15 bg-[#f0f6ff] px-4 py-3 text-sm leading-6 text-[#1c4a8b] dark:border-sky-900/70 dark:bg-slate-900 dark:text-sky-100">
        This creates an operational training record for the unified BDA curriculum. It does not assign a certification, schedule an exam, issue vouchers, or change candidate access.
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/70">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f91e0]/10 text-[#0f91e0]"><CalendarDays className="h-4.5 w-4.5" /></span>
          <div>
            <h2 className="text-sm font-bold text-[#0d1f4e] dark:text-sky-100">Delivery record</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Add a label for your internal register, or leave it blank for an automatic label.</p>
          </div>
        </div>
        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <Label htmlFor="batch_name" className="font-semibold text-[#0d1f4e] dark:text-sky-100">Batch label <span className="font-normal text-slate-400">(optional)</span></Label>
            <Input id="batch_name" value={formData.batch_name || ''} onChange={(event) => updateField('batch_name', event.target.value)} placeholder="e.g. Partner training delivery" className={fieldClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="font-semibold text-[#0d1f4e] dark:text-sky-100">Internal description <span className="font-normal text-slate-400">(optional)</span></Label>
            <Textarea id="description" value={formData.description || ''} onChange={(event) => updateField('description', event.target.value)} placeholder="A short operational note for your team." rows={3} className="resize-none border-slate-200 bg-white shadow-sm focus-visible:ring-[#0f91e0] dark:border-slate-700 dark:bg-slate-900" />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/70">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1c4a8b]/10 text-[#1c4a8b]"><Monitor className="h-4.5 w-4.5" /></span>
          <div>
            <h2 className="text-sm font-bold text-[#0d1f4e] dark:text-sky-100">Delivery context</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">All information in this section is operational and can be completed or updated later.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="training_start_date" className="font-semibold text-[#0d1f4e] dark:text-sky-100">Start date <span className="font-normal text-slate-400">(optional)</span></Label>
            <Input id="training_start_date" type="date" value={formData.training_start_date || ''} onChange={(event) => updateField('training_start_date', event.target.value || undefined)} className={fieldClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="training_end_date" className="font-semibold text-[#0d1f4e] dark:text-sky-100">End date <span className="font-normal text-slate-400">(optional)</span></Label>
            <Input id="training_end_date" type="date" value={formData.training_end_date || ''} onChange={(event) => updateField('training_end_date', event.target.value || undefined)} className={fieldClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="training_mode" className="font-semibold text-[#0d1f4e] dark:text-sky-100">Delivery mode</Label>
            <Select value={formData.training_mode} onValueChange={(value) => updateField('training_mode', value as TrainingMode)}>
              <SelectTrigger id="training_mode" className={fieldClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">In-person</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="training_location" className="font-semibold text-[#0d1f4e] dark:text-sky-100">Location or venue <span className="font-normal text-slate-400">(optional)</span></Label>
            <div className="relative"><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f91e0]" /><Input id="training_location" value={formData.training_location || ''} onChange={(event) => updateField('training_location', event.target.value)} placeholder="City, country or venue" className={`${fieldClass} pl-10`} /></div>
          </div>
          {(formData.training_mode === 'online' || formData.training_mode === 'hybrid') && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="delivery_platform" className="font-semibold text-[#0d1f4e] dark:text-sky-100">Online delivery platform <span className="font-normal text-slate-400">(optional)</span></Label>
              <Input id="delivery_platform" value={formData.delivery_platform || ''} onChange={(event) => updateField('delivery_platform', event.target.value)} placeholder="e.g. Microsoft Teams, Zoom, or delivery link" className={fieldClass} />
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/70">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0d1f4e]/10 text-[#0d1f4e] dark:text-sky-100"><UsersRound className="h-4.5 w-4.5" /></span>
          <div>
            <h2 className="text-sm font-bold text-[#0d1f4e] dark:text-sky-100">Facilitation & capacity</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Optional for opening the record and useful later for internal planning and analysis.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="trainer_id" className="font-semibold text-[#0d1f4e] dark:text-sky-100">Assigned trainer <span className="font-normal text-slate-400">(optional)</span></Label>
            <Select value={formData.trainer_id || 'none'} onValueChange={(value) => updateField('trainer_id', value === 'none' ? null : value)}>
              <SelectTrigger id="trainer_id" className={fieldClass}><SelectValue placeholder="Select trainer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No trainer assigned yet</SelectItem>
                {trainers?.map((trainer) => <SelectItem key={trainer.id} value={trainer.id}>{trainer.first_name} {trainer.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_capacity" className="font-semibold text-[#0d1f4e] dark:text-sky-100">Planning capacity <span className="font-normal text-slate-400">(optional)</span></Label>
            <Input id="max_capacity" type="number" min={1} max={100} value={formData.max_capacity} onChange={(event) => updateField('max_capacity', Number(event.target.value) || 30)} className={fieldClass} />
            <p className="text-xs text-slate-500 dark:text-slate-400">Used for internal planning only; default capacity is 30.</p>
          </div>
        </div>
      </section>

      {validationError && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{validationError}</p>}

      <div className="flex flex-col-reverse gap-3 border-t border-blue-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-sky-900/60">
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">The batch is saved as a draft and has no effect on exam, voucher, or candidate workflows.</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="border-blue-200 text-[#1c4a8b] hover:bg-[#f0f6ff] hover:text-[#0d1f4e]" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" className="bg-[#0f91e0] font-semibold text-white hover:bg-[#0d7bc4]" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Save changes' : 'Create training batch'}
          </Button>
        </div>
      </div>
    </form>
  );
}
