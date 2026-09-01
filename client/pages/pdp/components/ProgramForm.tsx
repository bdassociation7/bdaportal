/**
 * ProgramForm Component
 * Reusable form for creating and editing PDP programs
 * - In limitedEdit mode: program name is locked, everything else is editable
 * - Supports session_start_date / session_end_date for public display
 * - Supports agenda PDF upload / replacement
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BookOpen,
  Award,
  Target,
  Clock,
  Calendar,
  AlertCircle,
  X,
  Plus,
  Info,
  Upload,
  FileText,
  Lock,
} from 'lucide-react';
import { useBockCompetencies, useUploadAgendaPDF } from '@/entities/pdp';
import type { CreateProgramDTO, ActivityType, DeliveryMode, BockCompetency, PDPProgram } from '@/entities/pdp';

const activityTypes: { value: ActivityType; label: string }[] = [
  { value: 'training_course', label: 'Training Course' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'self_study', label: 'Self Study' },
  { value: 'teaching', label: 'Teaching' },
  { value: 'publication', label: 'Publication' },
  { value: 'volunteer_work', label: 'Volunteer Work' },
  { value: 'other', label: 'Other' },
];

const deliveryModes: { value: DeliveryMode; label: string }[] = [
  { value: 'in_person', label: 'In Person' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'self_paced', label: 'Self-Paced' },
];

type CompetencySelection = {
  id: string;
  level: 'primary' | 'secondary' | 'supporting';
};

interface ProgramFormProps {
  initialData?: PDPProgram;
  onSubmit: (data: CreateProgramDTO) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  /**
   * When true, only the program name fields are locked.
   * All other fields (description, dates, PDF, etc.) remain editable.
   */
  limitedEdit?: boolean;
}

export function ProgramForm({ initialData, onSubmit, onCancel, isSubmitting, limitedEdit = false }: ProgramFormProps) {
  const [formData, setFormData] = useState<CreateProgramDTO>({
    program_name: initialData?.program_name || '',
    program_name_ar: initialData?.program_name_ar || '',
    public_display_name: initialData?.public_display_name || '',
    public_display_name_ar: initialData?.public_display_name_ar || '',
    description: initialData?.description || '',
    description_ar: initialData?.description_ar || '',
    max_pdc_credits: initialData?.max_pdc_credits || 1,
    activity_type: initialData?.activity_type || 'training_course',
    delivery_mode: initialData?.delivery_mode || 'in_person',
    duration_hours: initialData?.duration_hours || 1,
    valid_from: initialData?.valid_from?.split('T')[0] || new Date().toISOString().split('T')[0],
    valid_until: initialData?.valid_until?.split('T')[0] || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    target_audience: initialData?.target_audience || '',
    prerequisites: initialData?.prerequisites || '',
    learning_outcomes: initialData?.learning_outcomes || [],
    competency_ids: [],
    session_start_date: initialData?.session_start_date || '',
    session_end_date: initialData?.session_end_date || '',
    agenda_url: initialData?.agenda_url || null,
  });

  const [selectedCompetencies, setSelectedCompetencies] = useState<CompetencySelection[]>([]);
  const [learningOutcome, setLearningOutcome] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showCompetencies, setShowCompetencies] = useState(false);

  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: competencies } = useBockCompetencies();
  const uploadAgendaPDF = useUploadAgendaPDF();

  useEffect(() => {
    if (initialData?.competencies) {
      const mapped = initialData.competencies.map(pc => ({
        id: pc.competency_id,
        level: pc.relevance_level,
      }));
      setSelectedCompetencies(mapped);
    }
  }, [initialData]);

  const handleInputChange = (field: keyof CreateProgramDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addLearningOutcome = () => {
    if (learningOutcome.trim()) {
      setFormData(prev => ({
        ...prev,
        learning_outcomes: [...(prev.learning_outcomes || []), learningOutcome.trim()],
      }));
      setLearningOutcome('');
    }
  };

  const removeLearningOutcome = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learning_outcomes: prev.learning_outcomes?.filter((_, i) => i !== index),
    }));
  };

  const toggleCompetency = (competency: BockCompetency, level: 'primary' | 'secondary' | 'supporting') => {
    setSelectedCompetencies(prev => {
      const existing = prev.find(c => c.id === competency.id);
      if (existing) {
        if (existing.level === level) {
          return prev.filter(c => c.id !== competency.id);
        } else {
          return prev.map(c => (c.id === competency.id ? { ...c, level } : c));
        }
      } else {
        return [...prev, { id: competency.id, level }];
      }
    });
  };

  const getCompetencyLevel = (competencyId: string): 'primary' | 'secondary' | 'supporting' | null => {
    return selectedCompetencies.find(c => c.id === competencyId)?.level || null;
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPdfError(null);
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setPdfError('Only PDF files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPdfError('File size must be less than 10MB');
      return;
    }
    setPdfFile(file);
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.program_name?.trim()) {
      errors.program_name = 'Program name is required';
    }

    if (!formData.activity_type) {
      errors.activity_type = 'Activity type is required';
    }

    if (!formData.max_pdc_credits || formData.max_pdc_credits < 1 || formData.max_pdc_credits > 40) {
      errors.max_pdc_credits = 'PDC credits must be between 1 and 40';
    }

    if (formData.session_start_date && formData.session_end_date) {
      const start = new Date(formData.session_start_date);
      const end = new Date(formData.session_end_date);
      if (end < start) {
        errors.session_end_date = 'Session end date must be on or after start date';
      }
    }

    if (formData.duration_hours && (formData.duration_hours < 0.5 || formData.duration_hours > 1000)) {
      errors.duration_hours = 'Duration must be between 0.5 and 1000 hours';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // If there's a new PDF to upload and we have an existing program ID, upload it first
    if (pdfFile && initialData?.id) {
      setPdfUploading(true);
      await uploadAgendaPDF.mutateAsync({ programId: initialData.id, file: pdfFile });
      setPdfUploading(false);
      setPdfFile(null);
    }

    const cleanedData: CreateProgramDTO = {
      ...formData,
      program_name_ar: formData.program_name_ar?.trim() || undefined,
      public_display_name: formData.public_display_name?.trim() || null,
      public_display_name_ar: formData.public_display_name_ar?.trim() || null,
      description: formData.description?.trim() || undefined,
      description_ar: formData.description_ar?.trim() || undefined,
      target_audience: formData.target_audience?.trim() || undefined,
      prerequisites: formData.prerequisites?.trim() || undefined,
      session_start_date: formData.session_start_date?.trim() || null,
      session_end_date: formData.session_end_date?.trim() || null,
      competency_ids: selectedCompetencies.length > 0 ? selectedCompetencies : undefined,
    };

    await onSubmit(cleanedData);
  };

  const competenciesByDomain = competencies?.reduce((acc, comp) => {
    if (!acc[comp.domain]) {
      acc[comp.domain] = [];
    }
    acc[comp.domain].push(comp);
    return acc;
  }, {} as Record<string, BockCompetency[]>);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Program Details
          </CardTitle>
          <CardDescription>
            {limitedEdit
              ? 'The accredited programme name is locked after approval. You may update its public directory title and other details.'
              : 'Provide basic information about your program'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Program Names — locked in limitedEdit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="program_name" className="flex items-center gap-1">
                Program Name (English) <span className="text-red-500">*</span>
                {limitedEdit && <Lock className="h-3 w-3 text-gray-400 ml-1" />}
              </Label>
              <Input
                id="program_name"
                value={formData.program_name}
                onChange={e => handleInputChange('program_name', e.target.value)}
                placeholder="e.g., Advanced Business Analysis Workshop"
                disabled={limitedEdit}
                className={limitedEdit ? 'opacity-60 bg-gray-50' : ''}
              />
              {limitedEdit && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Program name cannot be changed after approval
                </p>
              )}
              {validationErrors.program_name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.program_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="program_name_ar" className="flex items-center gap-1">
                Program Name (Arabic)
                {limitedEdit && <Lock className="h-3 w-3 text-gray-400 ml-1" />}
              </Label>
              <Input
                id="program_name_ar"
                value={formData.program_name_ar}
                onChange={e => handleInputChange('program_name_ar', e.target.value)}
                placeholder="اسم البرنامج"
                dir="rtl"
                disabled={limitedEdit}
                className={limitedEdit ? 'opacity-60 bg-gray-50' : ''}
              />
            </div>
          </div>

          {initialData && (
            <div className="rounded-lg border border-[#bfdbfe] bg-[#f0f6ff] p-4 space-y-4">
              <div>
                <p className="font-medium text-[#0d1f4e]">Public Directory Display</p>
                <p className="mt-1 text-sm text-[#1c4a8b]">
                  This title appears only on the public programmes directory. It does not change the approved programme name, programme ID, URL, or detail page.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="public_display_name">Public Display Name (English)</Label>
                  <Input
                    id="public_display_name"
                    value={formData.public_display_name || ''}
                    onChange={e => handleInputChange('public_display_name', e.target.value)}
                    placeholder={initialData.program_name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="public_display_name_ar">Public Display Name (Arabic)</Label>
                  <Input
                    id="public_display_name_ar"
                    value={formData.public_display_name_ar || ''}
                    onChange={e => handleInputChange('public_display_name_ar', e.target.value)}
                    placeholder={initialData.program_name_ar || 'اسم العرض العام'}
                    dir="rtl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder="Describe your program, its objectives, and what participants will learn..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description_ar">Description (Arabic)</Label>
              <Textarea
                id="description_ar"
                value={formData.description_ar}
                onChange={e => handleInputChange('description_ar', e.target.value)}
                placeholder="وصف البرنامج"
                dir="rtl"
                rows={4}
              />
            </div>
          </div>

          {/* Activity Type & Delivery Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Activity Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.activity_type}
                onValueChange={value => handleInputChange('activity_type', value as ActivityType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.activity_type && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.activity_type}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Delivery Mode</Label>
              <Select
                value={formData.delivery_mode}
                onValueChange={value => handleInputChange('delivery_mode', value as DeliveryMode)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery mode" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryModes.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration & PDC Credits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration_hours">Duration (Hours)</Label>
              <Input
                id="duration_hours"
                type="number"
                min={0.5}
                step={0.5}
                max={1000}
                value={formData.duration_hours}
                onChange={e => handleInputChange('duration_hours', parseFloat(e.target.value))}
              />
              {validationErrors.duration_hours && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.duration_hours}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_pdc_credits">
                PDC Credits <span className="text-red-500">*</span>
              </Label>
              <Input
                id="max_pdc_credits"
                type="number"
                min={1}
                max={40}
                value={formData.max_pdc_credits}
                onChange={e => handleInputChange('max_pdc_credits', parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500">Maximum PDC credits that can be earned (1-40)</p>
              {validationErrors.max_pdc_credits && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.max_pdc_credits}
                </p>
              )}
            </div>
          </div>



          {/* Session / Event Dates */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Calendar className="h-4 w-4" /> Session / Event Dates
              <span className="text-xs font-normal text-gray-400 ml-1">(shown publicly on the programmes directory)</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session_start_date">Session Start Date</Label>
                <Input
                  id="session_start_date"
                  type="date"
                  value={formData.session_start_date || ''}
                  onChange={e => handleInputChange('session_start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session_end_date">Session End Date</Label>
                <Input
                  id="session_end_date"
                  type="date"
                  value={formData.session_end_date || ''}
                  onChange={e => handleInputChange('session_end_date', e.target.value)}
                />
                {validationErrors.session_end_date && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.session_end_date}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Target Audience & Prerequisites */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Input
                id="target_audience"
                value={formData.target_audience}
                onChange={e => handleInputChange('target_audience', e.target.value)}
                placeholder="e.g., Business Analysts, Project Managers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prerequisites">Prerequisites</Label>
              <Input
                id="prerequisites"
                value={formData.prerequisites}
                onChange={e => handleInputChange('prerequisites', e.target.value)}
                placeholder="e.g., 2+ years BA experience"
              />
            </div>
          </div>

          {/* Learning Outcomes */}
          <div className="space-y-2">
            <Label>Learning Outcomes</Label>
            <div className="flex gap-2">
              <Input
                value={learningOutcome}
                onChange={e => setLearningOutcome(e.target.value)}
                placeholder="Add a learning outcome..."
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLearningOutcome();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addLearningOutcome}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.learning_outcomes && formData.learning_outcomes.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.learning_outcomes.map((outcome, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border"
                  >
                    <span className="text-sm">{outcome}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLearningOutcome(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agenda / Syllabus PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Program Agenda / Syllabus
          </CardTitle>
          <CardDescription>
            Upload a PDF outlining the programme content, schedule, or syllabus (max 10 MB).
            {initialData?.agenda_url && ' A file is already attached — uploading a new one will replace it.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Existing file indicator */}
          {initialData?.agenda_url && !pdfFile && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <FileText className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-800">Current agenda file</p>
                <a
                  href={initialData.agenda_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline truncate block"
                >
                  {initialData.agenda_url.split('/').pop()}
                </a>
              </div>
            </div>
          )}

          {/* New file selected */}
          {pdfFile ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <FileText className="h-5 w-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">{pdfFile.name}</p>
                <p className="text-xs text-green-600">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={removePdf}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label
              htmlFor="agenda-pdf-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Upload className="h-6 w-6 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400 mt-1">PDF only, max 10 MB</p>
              <input
                id="agenda-pdf-upload"
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfChange}
              />
            </label>
          )}

          {pdfError && (
            <p className="text-sm text-red-500 flex items-center gap-1 mt-2">
              <AlertCircle className="h-3 w-3" />
              {pdfError}
            </p>
          )}

          {/* Note: for new programs, PDF is uploaded after the program is created */}
          {!initialData?.id && pdfFile && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              The PDF will be attached after the program is created.
            </p>
          )}
        </CardContent>
      </Card>

      {/* BoCK Competency Mapping */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                BoCK Competency Mapping
              </CardTitle>
              <CardDescription>
                Map this program to relevant BDA BoCK® competencies (optional)
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCompetencies(!showCompetencies)}
            >
              {showCompetencies ? 'Hide' : 'Show'} Competencies
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCompetencies.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">
                Selected Competencies ({selectedCompetencies.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedCompetencies.map(sel => {
                  const comp = competencies?.find(c => c.id === sel.id);
                  return comp ? (
                    <Badge
                      key={sel.id}
                      className={
                        sel.level === 'primary'
                          ? 'bg-blue-600'
                          : sel.level === 'secondary'
                          ? 'bg-purple-600'
                          : 'bg-gray-600'
                      }
                    >
                      {comp.code} - {sel.level}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {showCompetencies && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Primary:</strong> Core focus • <strong>Secondary:</strong> Significantly
                  addressed • <strong>Supporting:</strong> Touched upon or reinforced
                </AlertDescription>
              </Alert>

              {competenciesByDomain && (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(competenciesByDomain).map(([domain, comps]) => (
                    <div key={domain} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">{domain}</h3>
                      <div className="space-y-2">
                        {comps.map(comp => {
                          const level = getCompetencyLevel(comp.id);
                          return (
                            <div
                              key={comp.id}
                              className={`p-3 rounded-lg border ${
                                level ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {comp.code}
                                    </Badge>
                                    <span className="font-medium text-sm">{comp.name}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={level === 'primary' ? 'default' : 'outline'}
                                    onClick={() => toggleCompetency(comp, 'primary')}
                                    className="text-xs px-2"
                                  >
                                    Primary
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={level === 'secondary' ? 'default' : 'outline'}
                                    onClick={() => toggleCompetency(comp, 'secondary')}
                                    className="text-xs px-2"
                                  >
                                    Secondary
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={level === 'supporting' ? 'default' : 'outline'}
                                    onClick={() => toggleCompetency(comp, 'supporting')}
                                    className="text-xs px-2"
                                  >
                                    Supporting
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitting || pdfUploading}>
          {isSubmitting || pdfUploading ? 'Saving...' : initialData ? 'Update Program' : 'Create Program'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || pdfUploading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
