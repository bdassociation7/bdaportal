/**
 * TrainerForm Component
 * Reusable form for creating and editing ECP trainers.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BriefcaseBusiness,
  AlertCircle,
  Mail,
  Phone,
  Linkedin,
  FileText,
  Send,
  MapPin,
  Languages,
  UserRound,
  X,
} from 'lucide-react';
import type { CreateTrainerDTO, Trainer } from '@/entities/ecp';

interface TrainerFormProps {
  initialData?: Trainer;
  onSubmit: (data: CreateTrainerDTO, sendInvite: boolean) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  showInviteOption?: boolean;
}

const expertiseOptions = [
  'Business Analysis',
  'Strategic Planning',
  'Stakeholder Engagement',
  'Business Transformation',
  'Change Management',
  'Project Management',
  'Product Management',
  'Digital Transformation',
  'Data & Analytics',
  'Leadership & Management',
];

const languageOptions = ['English', 'Arabic', 'French', 'Spanish', 'Portuguese', 'German', 'Chinese', 'Hindi'];

const fieldErrorClass = 'flex items-center gap-1 text-sm text-red-600';

export function TrainerForm({ initialData, onSubmit, onCancel, isSubmitting, showInviteOption }: TrainerFormProps) {
  const [formData, setFormData] = useState<CreateTrainerDTO>({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    certifications: initialData?.certifications || [],
    trainer_certification_date: initialData?.trainer_certification_date || '',
    trainer_certification_expiry: initialData?.trainer_certification_expiry || '',
    job_title: initialData?.job_title || '',
    organisation: initialData?.organisation || '',
    country_code: initialData?.country_code || '',
    professional_experience_years: initialData?.professional_experience_years,
    training_experience_years: initialData?.training_experience_years,
    expertise_areas: initialData?.expertise_areas || [],
    delivery_languages: initialData?.delivery_languages || [],
    bio: initialData?.bio || '',
    linkedin_url: initialData?.linkedin_url || '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [sendInvite, setSendInvite] = useState(true);
  const [customExpertise, setCustomExpertise] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');

  const handleInputChange = (field: keyof CreateTrainerDTO, value: CreateTrainerDTO[keyof CreateTrainerDTO]) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((previous) => ({ ...previous, [field]: '' }));
    }
  };

  const toggleCollectionValue = (field: 'expertise_areas' | 'delivery_languages', value: string) => {
    const currentValues = formData[field] || [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    handleInputChange(field, nextValues);
  };

  const addCustomCollectionValue = (field: 'expertise_areas' | 'delivery_languages') => {
    const inputValue = field === 'expertise_areas' ? customExpertise : customLanguage;
    const value = inputValue.trim();
    const currentValues = formData[field] || [];

    if (!value || currentValues.some((item) => item.toLowerCase() === value.toLowerCase())) return;

    handleInputChange(field, [...currentValues, value]);
    if (field === 'expertise_areas') setCustomExpertise('');
    else setCustomLanguage('');
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.first_name?.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name?.trim()) errors.last_name = 'Last name is required';

    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }

    if (!formData.job_title?.trim()) errors.job_title = 'Professional title is required';
    if (!formData.organisation?.trim()) errors.organisation = 'Organisation or independent practice is required';
    if (!formData.country_code?.trim()) errors.country_code = 'Primary professional country is required';

    if (formData.professional_experience_years === undefined || formData.professional_experience_years < 0) {
      errors.professional_experience_years = 'Enter years of professional experience';
    }

    if (formData.training_experience_years === undefined || formData.training_experience_years < 0) {
      errors.training_experience_years = 'Enter years of training experience';
    }

    if (!formData.expertise_areas?.length) errors.expertise_areas = 'Select at least one area of expertise';
    if (!formData.delivery_languages?.length) errors.delivery_languages = 'Select at least one delivery language';

    if (!formData.bio?.trim() || formData.bio.trim().length < 60) {
      errors.bio = 'Provide a concise professional summary of at least 60 characters';
    }

    if (formData.linkedin_url?.trim()) {
      try {
        new URL(formData.linkedin_url);
      } catch {
        errors.linkedin_url = 'Enter a valid full URL';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    const cleanedData: CreateTrainerDTO = {
      ...formData,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone?.trim() || undefined,
      job_title: formData.job_title?.trim(),
      organisation: formData.organisation?.trim(),
      country_code: formData.country_code?.trim(),
      professional_experience_years: formData.professional_experience_years,
      training_experience_years: formData.training_experience_years,
      expertise_areas: formData.expertise_areas || [],
      delivery_languages: formData.delivery_languages || [],
      trainer_certification_date: formData.trainer_certification_date || undefined,
      trainer_certification_expiry: formData.trainer_certification_expiry || undefined,
      bio: formData.bio?.trim(),
      linkedin_url: formData.linkedin_url?.trim() || undefined,
    };

    await onSubmit(cleanedData, sendInvite);
  };

  const renderCollection = (
    field: 'expertise_areas' | 'delivery_languages',
    options: string[],
    inputValue: string,
    setInputValue: (value: string) => void,
    label: string,
    description: string,
  ) => (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <Label className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label} <span className="text-red-600">*</span></Label>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = formData[field]?.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleCollectionValue(field, option)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? 'border-[#0f91e0] bg-[#0f91e0] text-white shadow-sm'
                  : 'border-blue-100 bg-white text-[#1c4a8b] hover:border-[#0f91e0] hover:bg-[#f0f6ff] dark:border-slate-700 dark:bg-slate-950 dark:text-blue-200 dark:hover:border-sky-500 dark:hover:bg-slate-800'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCustomCollectionValue(field);
            }
          }}
          placeholder={`Add another ${field === 'expertise_areas' ? 'expertise area' : 'delivery language'}`}
          className="h-10"
        />
        <Button type="button" variant="outline" onClick={() => addCustomCollectionValue(field)} className="border-blue-200 text-[#1c4a8b] hover:bg-[#f0f6ff] hover:text-[#0d1f4e]">
          Add
        </Button>
      </div>
      {(formData[field] || []).length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl bg-[#f0f6ff] p-3 dark:bg-slate-800/70">
          {(formData[field] || []).map((value) => (
            <span key={value} className="inline-flex items-center gap-1 rounded-full bg-[#dbeafe] px-3 py-1 text-xs font-semibold text-[#0d1f4e] dark:bg-blue-950 dark:text-blue-100">
              {value}
              <button type="button" onClick={() => toggleCollectionValue(field, value)} className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-900" aria-label={`Remove ${value}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {validationErrors[field] && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors[field]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-7 pb-10">
      <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-700">
        <CardHeader className="border-b border-blue-100 bg-[#f0f6ff]/75 px-6 py-6 dark:border-slate-700 dark:bg-slate-900 sm:px-8">
          <CardTitle className="flex items-center gap-3 text-xl text-[#0d1f4e] dark:text-blue-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d1f4e] text-white"><UserRound className="h-5 w-5" /></span>
            Trainer identity and contact
          </CardTitle>
          <CardDescription className="pl-[52px]">The details BDA and your organisation use to identify and contact this trainer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name <span className="text-red-600">*</span></Label>
              <Input id="first_name" value={formData.first_name} onChange={(event) => handleInputChange('first_name', event.target.value)} placeholder="e.g. Alex" className="h-11" />
              {validationErrors.first_name && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors.first_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name <span className="text-red-600">*</span></Label>
              <Input id="last_name" value={formData.last_name} onChange={(event) => handleInputChange('last_name', event.target.value)} placeholder="e.g. Morgan" className="h-11" />
              {validationErrors.last_name && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors.last_name}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Professional email <span className="text-red-600">*</span></Label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f91e0]" /><Input id="email" type="email" value={formData.email} onChange={(event) => handleInputChange('email', event.target.value)} placeholder="trainer@organisation.com" className="h-11 pl-10" /></div>
              {validationErrors.email && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile or direct phone <span className="text-slate-400">(optional)</span></Label>
              <div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f91e0]" /><Input id="phone" value={formData.phone} onChange={(event) => handleInputChange('phone', event.target.value)} placeholder="Include country code" className="h-11 pl-10" /></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-700">
        <CardHeader className="border-b border-blue-100 bg-[#f0f6ff]/75 px-6 py-6 dark:border-slate-700 dark:bg-slate-900 sm:px-8">
          <CardTitle className="flex items-center gap-3 text-xl text-[#0d1f4e] dark:text-blue-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c4a8b] text-white"><BriefcaseBusiness className="h-5 w-5" /></span>
            Professional profile
          </CardTitle>
          <CardDescription className="pl-[52px]">Capture the trainer’s relevant professional and facilitation background.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="job_title">Professional title <span className="text-red-600">*</span></Label>
              <Input id="job_title" value={formData.job_title} onChange={(event) => handleInputChange('job_title', event.target.value)} placeholder="e.g. Senior Business Analyst" className="h-11" />
              {validationErrors.job_title && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors.job_title}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="organisation">Organisation or independent practice <span className="text-red-600">*</span></Label>
              <Input id="organisation" value={formData.organisation} onChange={(event) => handleInputChange('organisation', event.target.value)} placeholder="e.g. Northstar Consulting or Independent" className="h-11" />
              {validationErrors.organisation && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors.organisation}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="country_code">Primary professional country <span className="text-red-600">*</span></Label>
              <div className="relative"><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f91e0]" /><Input id="country_code" value={formData.country_code} onChange={(event) => handleInputChange('country_code', event.target.value)} placeholder="e.g. Saudi Arabia" className="h-11 pl-10" /></div>
              {validationErrors.country_code && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors.country_code}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="professional_experience_years">Relevant professional experience <span className="text-red-600">*</span></Label>
              <Input id="professional_experience_years" type="number" min={0} max={70} value={formData.professional_experience_years ?? ''} onChange={(event) => handleInputChange('professional_experience_years', event.target.value === '' ? undefined : Number(event.target.value))} placeholder="Years" className="h-11" />
              {validationErrors.professional_experience_years && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors.professional_experience_years}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="training_experience_years">Training or facilitation experience <span className="text-red-600">*</span></Label>
              <Input id="training_experience_years" type="number" min={0} max={70} value={formData.training_experience_years ?? ''} onChange={(event) => handleInputChange('training_experience_years', event.target.value === '' ? undefined : Number(event.target.value))} placeholder="Years" className="h-11" />
              {validationErrors.training_experience_years && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors.training_experience_years}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn profile <span className="text-slate-400">(optional)</span></Label>
            <div className="relative"><Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f91e0]" /><Input id="linkedin_url" value={formData.linkedin_url} onChange={(event) => handleInputChange('linkedin_url', event.target.value)} placeholder="https://www.linkedin.com/in/trainer-name" className="h-11 pl-10" /></div>
            {validationErrors.linkedin_url && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors.linkedin_url}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3"><Label htmlFor="bio" className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#0f91e0]" />Professional summary <span className="text-red-600">*</span></Label><span className="text-xs text-slate-500">{formData.bio?.length || 0} characters</span></div>
            <Textarea id="bio" value={formData.bio} onChange={(event) => handleInputChange('bio', event.target.value)} placeholder="Summarise the trainer’s relevant domain experience, facilitation background, and the value they bring to BDA learners." rows={5} />
            <p className="text-xs text-slate-500">Use a concise professional profile; this information is kept in the partner’s trainer register.</p>
            {validationErrors.bio && <p className={fieldErrorClass}><AlertCircle className="h-3.5 w-3.5" />{validationErrors.bio}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-700">
        <CardHeader className="border-b border-blue-100 bg-[#f0f6ff]/75 px-6 py-6 dark:border-slate-700 dark:bg-slate-900 sm:px-8">
          <CardTitle className="flex items-center gap-3 text-xl text-[#0d1f4e] dark:text-blue-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f91e0] text-white"><Languages className="h-5 w-5" /></span>
            Delivery profile
          </CardTitle>
          <CardDescription className="pl-[52px]">Identify the subjects and delivery languages this trainer can support.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-7 p-6 sm:p-8">
          {renderCollection('expertise_areas', expertiseOptions, customExpertise, setCustomExpertise, 'Areas of expertise', 'Select all that apply')}
          {renderCollection('delivery_languages', languageOptions, customLanguage, setCustomLanguage, 'Delivery languages', 'Select all that apply')}
        </CardContent>
      </Card>

      {showInviteOption && (
        <Card className="border-blue-200 bg-[#f0f6ff] shadow-sm dark:border-sky-900/70 dark:bg-slate-900">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Checkbox id="send_invite" checked={sendInvite} onCheckedChange={(value) => setSendInvite(!!value)} className="mt-0.5 border-[#0f91e0] data-[state=checked]:bg-[#0f91e0]" />
              <div className="space-y-1.5">
                <label htmlFor="send_invite" className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#0d1f4e] dark:text-blue-100"><Send className="h-4 w-4 text-[#0f91e0]" />Send portal invite after saving</label>
                <p className="max-w-3xl text-sm leading-6 text-[#1c4a8b] dark:text-blue-200">The trainer will receive a one-time activation link and, once activated, can access the Learning System with Instructor View.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-end dark:border-slate-700 dark:bg-slate-900/95">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="border-slate-300">Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-[#0d1f4e] px-6 text-white hover:bg-[#1c4a8b]">
          {isSubmitting ? 'Saving trainer profile...' : initialData ? 'Save trainer profile' : sendInvite && showInviteOption ? 'Add trainer and send invite' : 'Add trainer'}
        </Button>
      </div>
    </form>
  );
}
