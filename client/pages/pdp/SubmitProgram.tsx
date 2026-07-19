/**
 * PDP Submit Program Page
 *
 * Form for submitting new programs for accreditation
 * Includes BoCK competency mapping and program details
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  Award,
  Target,
  Clock,
  Users,
  GraduationCap,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Upload,
  FileText,
  X,
  Globe,
} from "lucide-react";
import { useCreateProgram, useSubmitProgram, useBockCompetencies, useProgramSlotStatus } from "@/entities/pdp";
import type { ActivityType, DeliveryMode, CreateProgramDTO, BockCompetency } from "@/entities/pdp";
import { Skeleton } from "@/components/ui/skeleton";

const activityTypes: { value: ActivityType; label: string; description: string }[] = [
  { value: "training_course", label: "Training Course", description: "Structured learning program with instructor" },
  { value: "conference", label: "Conference", description: "Professional gathering with speakers and sessions" },
  { value: "workshop", label: "Workshop", description: "Hands-on interactive learning session" },
  { value: "webinar", label: "Webinar", description: "Online seminar or presentation" },
  { value: "self_study", label: "Self Study", description: "Self-paced learning materials" },
  { value: "teaching", label: "Teaching", description: "Teaching or instructing others" },
  { value: "publication", label: "Publication", description: "Writing articles, books, or papers" },
  { value: "volunteer_work", label: "Volunteer Work", description: "Professional volunteer activities" },
  { value: "other", label: "Other", description: "Other professional development activity" },
];

const deliveryModes: { value: DeliveryMode; label: string }[] = [
  { value: "in_person", label: "In Person" },
  { value: "online", label: "Online (Live)" },
  { value: "hybrid", label: "Hybrid" },
  { value: "self_paced", label: "Self-Paced" },
];

// Available languages for program delivery
const programLanguages = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Chinese (Mandarin)" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ru", label: "Russian" },
  { value: "hi", label: "Hindi" },
  { value: "other", label: "Other" },
];

type CompetencySelection = {
  id: string;
  level: "primary" | "secondary" | "supporting";
};

export default function SubmitProgram() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Form state
  const [formData, setFormData] = useState<Partial<CreateProgramDTO> & { delivery_language?: string }>({
    program_name: "",
    program_name_ar: "",
    description: "",
    description_ar: "",
    max_pdc_credits: 1,
    activity_type: "training_course",
    delivery_mode: "in_person",
    delivery_language: "en",
    duration_hours: 1,
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    target_audience: "",
    prerequisites: "",
    learning_outcomes: [],
  });

  const [selectedCompetencies, setSelectedCompetencies] = useState<CompetencySelection[]>([]);
  const [learningOutcome, setLearningOutcome] = useState("");
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  // File upload state
  const [contentAgendaFile, setContentAgendaFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Check license and slot status
  const { data: slotStatus, isLoading: slotLoading, error: slotError } = useProgramSlotStatus();

  // Fetch BoCK competencies
  const { data: competencies, isLoading: competenciesLoading } = useBockCompetencies();

  // Create mutation
  const createProgram = useCreateProgram();
  const submitProgram = useSubmitProgram();

  // Check if user can submit programs
  const canSubmit = slotStatus?.can_submit === true;
  const hasAvailableSlots = slotStatus?.remaining_slots !== undefined && slotStatus.remaining_slots > 0;

  const handleInputChange = (field: keyof CreateProgramDTO | "delivery_language", value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (!file) {
      return;
    }

    // Validate file type
    const allowedTypes = ["application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Only PDF files are allowed");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError("File size must be less than 10MB");
      return;
    }

    setContentAgendaFile(file);
  };

  const removeFile = () => {
    setContentAgendaFile(null);
    setUploadError(null);
  };

  const addLearningOutcome = () => {
    if (learningOutcome.trim()) {
      setFormData((prev) => ({
        ...prev,
        learning_outcomes: [...(prev.learning_outcomes || []), learningOutcome.trim()],
      }));
      setLearningOutcome("");
    }
  };

  const removeLearningOutcome = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      learning_outcomes: prev.learning_outcomes?.filter((_, i) => i !== index),
    }));
  };

  const toggleCompetency = (competency: BockCompetency, level: "primary" | "secondary" | "supporting") => {
    setSelectedCompetencies((prev) => {
      const existing = prev.find((c) => c.id === competency.id);
      if (existing) {
        if (existing.level === level) {
          // Remove if same level clicked
          return prev.filter((c) => c.id !== competency.id);
        } else {
          // Update level
          return prev.map((c) => (c.id === competency.id ? { ...c, level } : c));
        }
      } else {
        // Add new
        return [...prev, { id: competency.id, level }];
      }
    });
  };

  const getCompetencyLevel = (competencyId: string): "primary" | "secondary" | "supporting" | null => {
    return selectedCompetencies.find((c) => c.id === competencyId)?.level || null;
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    setSaveAsDraft(asDraft);

    const dto: CreateProgramDTO = {
      program_name: formData.program_name!,
      program_name_ar: formData.program_name_ar || undefined,
      description: formData.description || undefined,
      description_ar: formData.description_ar || undefined,
      max_pdc_credits: formData.max_pdc_credits!,
      activity_type: formData.activity_type!,
      delivery_mode: formData.delivery_mode,
      duration_hours: formData.duration_hours,
      target_audience: formData.target_audience || undefined,
      prerequisites: formData.prerequisites || undefined,
      learning_outcomes: formData.learning_outcomes,
      competency_ids: selectedCompetencies,
    };

    const result = await createProgram.mutateAsync(dto);
    if (!result.error && result.data) {
      // If not saving as draft, auto-approve and activate the program
      if (!asDraft) {
        await submitProgram.mutateAsync(result.data.id);
      }
      navigate("/pdp/programs");
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.program_name &&
          formData.activity_type &&
          formData.max_pdc_credits &&
          formData.max_pdc_credits > 0 &&
          true
        );
      case 2:
        return selectedCompetencies.length > 0;
      case 3:
        return true; // Summary step
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps && isStepValid(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Group competencies by domain
  const competenciesByDomain = competencies?.reduce((acc, comp) => {
    if (!acc[comp.domain]) {
      acc[comp.domain] = [];
    }
    acc[comp.domain].push(comp);
    return acc;
  }, {} as Record<string, BockCompetency[]>);

  // Show loading state while checking license
  if (slotLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Show error or restriction if no license or submissions disabled
  if (slotError || !canSubmit) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/pdp/programs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Programs
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit New Program</h1>
          <p className="text-gray-600 mt-1">
            Submit a professional development program for BDA accreditation
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Program Submission Not Available</AlertTitle>
          <AlertDescription>
            {slotError ? (
              "Unable to verify your license status. Please try again later."
            ) : slotStatus?.reason ? (
              slotStatus.reason
            ) : !hasAvailableSlots && slotStatus?.max_programs ? (
              <>
                You have reached your maximum program limit ({slotStatus.max_programs} programs).
                Please contact BDA administration to request additional program slots.
              </>
            ) : (
              "You are not authorised to submit programs at this time. Please contact BDA administration to set up your PDP license."
            )}
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">Need Help?</h3>
              <p className="text-gray-600 mb-4">
                Contact BDA support to activate your PDP license or request additional program slots.
              </p>
              <Button variant="outline" onClick={() => navigate("/pdp/support")}>
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/pdp/programs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Programs
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submit New Program</h1>
        <p className="text-gray-600 mt-1">
          Submit a professional development program for BDA accreditation
        </p>
      </div>

      {/* Slot Status Banner */}
      {slotStatus && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Program Slots</AlertTitle>
          <AlertDescription>
            You have {slotStatus.remaining_slots} of {slotStatus.max_programs} program slots available.
            {slotStatus.remaining_slots <= 2 && slotStatus.remaining_slots > 0 && (
              <span className="text-orange-600 ml-1">Consider requesting more slots soon.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step < currentStep
                  ? "bg-green-600 border-green-600 text-white"
                  : step === currentStep
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              {step < currentStep ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span>{step}</span>
              )}
            </div>
            <div className="flex-1 mx-4">
              <p
                className={`text-sm font-medium ${
                  step <= currentStep ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {step === 1 && "Program Details"}
                {step === 2 && "BoCK Alignment"}
                {step === 3 && "Review & Activate"}
              </p>
            </div>
            {step < 3 && (
              <div
                className={`h-0.5 flex-1 ${
                  step < currentStep ? "bg-green-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Program Details */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Program Details
            </CardTitle>
            <CardDescription>
              Provide basic information about your program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Program Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="program_name">Program Name (English) *</Label>
                <Input
                  id="program_name"
                  value={formData.program_name}
                  onChange={(e) => handleInputChange("program_name", e.target.value)}
                  placeholder="e.g., Advanced Business Analysis Workshop"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program_name_ar">Program Name (Arabic)</Label>
                <Input
                  id="program_name_ar"
                  value={formData.program_name_ar}
                  onChange={(e) => handleInputChange("program_name_ar", e.target.value)}
                  placeholder="اسم البرنامج"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Program Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe your program, its objectives, and what participants will learn..."
                rows={4}
              />
            </div>

            {/* Activity Type & Delivery */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Activity Type *</Label>
                <Select
                  value={formData.activity_type}
                  onValueChange={(value) => handleInputChange("activity_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Delivery Mode</Label>
                <Select
                  value={formData.delivery_mode}
                  onValueChange={(value) => handleInputChange("delivery_mode", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryModes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Delivery Language *</Label>
                <Select
                  value={formData.delivery_language}
                  onValueChange={(value) => handleInputChange("delivery_language", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {programLanguages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          {lang.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration & Credits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration_hours">Duration (Hours)</Label>
                <Input
                  id="duration_hours"
                  type="number"
                  min={1}
                  value={formData.duration_hours}
                  onChange={(e) => handleInputChange("duration_hours", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_pdc_credits">PDC Credits *</Label>
                <Input
                  id="max_pdc_credits"
                  type="number"
                  min={1}
                  max={40}
                  value={formData.max_pdc_credits}
                  onChange={(e) => handleInputChange("max_pdc_credits", parseInt(e.target.value))}
                />
                <p className="text-xs text-gray-500">Maximum PDC credits that can be earned</p>
              </div>
            </div>

            {/* Target Audience & Prerequisites */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_audience">Target Audience</Label>
                <Input
                  id="target_audience"
                  value={formData.target_audience}
                  onChange={(e) => handleInputChange("target_audience", e.target.value)}
                  placeholder="e.g., Business Analysts, Project Managers"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prerequisites">Prerequisites</Label>
                <Input
                  id="prerequisites"
                  value={formData.prerequisites}
                  onChange={(e) => handleInputChange("prerequisites", e.target.value)}
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
                  onChange={(e) => setLearningOutcome(e.target.value)}
                  placeholder="Add a learning outcome..."
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addLearningOutcome())}
                />
                <Button type="button" variant="outline" onClick={addLearningOutcome}>
                  Add
                </Button>
              </div>
              {formData.learning_outcomes && formData.learning_outcomes.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.learning_outcomes.map((outcome, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm">{outcome}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLearningOutcome(index)}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Content/Agenda PDF Upload */}
            <div className="space-y-2">
              <Label>Program Content/Agenda (PDF)</Label>
              <p className="text-sm text-gray-500 mb-2">
                Upload a detailed course outline, agenda, or content description (PDF, max 10MB)
              </p>
              {contentAgendaFile ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="font-medium text-sm">{contentAgendaFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(contentAgendaFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="content-agenda-upload"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="content-agenda-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF files only, max 10MB
                    </p>
                  </label>
                </div>
              )}
              {uploadError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {uploadError}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: BoCK Alignment */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              BoCK Competency Alignment
            </CardTitle>
            <CardDescription>
              Select the BDA BoCK® competencies that your program addresses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Competency Levels</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1 text-sm">
                  <li><strong>Primary:</strong> Core focus of the program</li>
                  <li><strong>Secondary:</strong> Significantly addressed</li>
                  <li><strong>Supporting:</strong> Touched upon or reinforced</li>
                </ul>
              </AlertDescription>
            </Alert>

            {competenciesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : competenciesByDomain ? (
              <div className="space-y-6">
                {Object.entries(competenciesByDomain).map(([domain, comps]) => (
                  <div key={domain} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">{domain}</h3>
                    <div className="space-y-3">
                      {comps.map((comp) => {
                        const level = getCompetencyLevel(comp.id);
                        return (
                          <div
                            key={comp.id}
                            className={`p-3 rounded-lg border ${
                              level ? "border-blue-200 bg-blue-50" : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {comp.code}
                                  </Badge>
                                  <span className="font-medium">{comp.name}</span>
                                </div>
                                {comp.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {comp.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={level === "primary" ? "default" : "outline"}
                                  onClick={() => toggleCompetency(comp, "primary")}
                                  className="text-xs px-2"
                                >
                                  Primary
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={level === "secondary" ? "default" : "outline"}
                                  onClick={() => toggleCompetency(comp, "secondary")}
                                  className="text-xs px-2"
                                >
                                  Secondary
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={level === "supporting" ? "default" : "outline"}
                                  onClick={() => toggleCompetency(comp, "supporting")}
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
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Unable to load BoCK competencies. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {/* Selected Summary */}
            {selectedCompetencies.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">
                  Selected Competencies ({selectedCompetencies.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCompetencies.map((sel) => {
                    const comp = competencies?.find((c) => c.id === sel.id);
                    return comp ? (
                      <Badge
                        key={sel.id}
                        className={
                          sel.level === "primary"
                            ? "bg-blue-600"
                            : sel.level === "secondary"
                            ? "bg-purple-600"
                            : "bg-gray-600"
                        }
                      >
                        {comp.code} - {sel.level}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Activate */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Review & Activate
            </CardTitle>
            <CardDescription>
              Review your program details before activation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Program Summary */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-lg">{formData.program_name}</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <GraduationCap className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium">
                    {activityTypes.find((t) => t.value === formData.activity_type)?.label}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Award className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                  <p className="text-sm text-gray-600">PDCs</p>
                  <p className="font-medium">{formData.max_pdc_credits}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-6 w-6 mx-auto mb-1 text-orange-600" />
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{formData.duration_hours} hours</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Target className="h-6 w-6 mx-auto mb-1 text-green-600" />
                  <p className="text-sm text-gray-600">Competencies</p>
                  <p className="font-medium">{selectedCompetencies.length}</p>
                </div>
              </div>

              {formData.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Description</h4>
                  <p className="text-gray-900">{formData.description}</p>
                </div>
              )}

              {formData.learning_outcomes && formData.learning_outcomes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Learning Outcomes</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {formData.learning_outcomes.map((outcome, index) => (
                      <li key={index} className="text-gray-900">{outcome}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Language:</span>{" "}
                  <span className="font-medium">
                    {programLanguages.find((l) => l.value === formData.delivery_language)?.label || formData.delivery_language}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Delivery:</span>{" "}
                  <span className="font-medium">
                    {deliveryModes.find((m) => m.value === formData.delivery_mode)?.label}
                  </span>
                </div>
              </div>

              {/* Uploaded File */}
              {contentAgendaFile && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Attached Document</p>
                    <p className="text-xs text-blue-700">{contentAgendaFile.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* BoCK Alignment Summary */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">BoCK Competency Alignment</h4>
              <div className="space-y-2">
                {["primary", "secondary", "supporting"].map((level) => {
                  const comps = selectedCompetencies.filter((c) => c.level === level);
                  if (comps.length === 0) return null;
                  return (
                    <div key={level} className="flex items-start gap-2">
                      <Badge
                        className={
                          level === "primary"
                            ? "bg-blue-600"
                            : level === "secondary"
                            ? "bg-purple-600"
                            : "bg-gray-600"
                        }
                      >
                        {level}
                      </Badge>
                      <div className="flex flex-wrap gap-1">
                        {comps.map((sel) => {
                          const comp = competencies?.find((c) => c.id === sel.id);
                          return comp ? (
                            <span key={sel.id} className="text-sm text-gray-600">
                              {comp.code}{comps.indexOf(sel) < comps.length - 1 ? "," : ""}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Options */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Submission Options</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  <strong>Save as Draft:</strong> Save your progress and activate later
                </p>
                <p>
                  <strong>Activate Program:</strong> Your program will be immediately available in the Accredited Programs directory
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentStep === totalSteps ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={createProgram.isPending}
              >
                {createProgram.isPending && saveAsDraft ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={createProgram.isPending}
              >
                {createProgram.isPending && !saveAsDraft ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Activate Program
              </Button>
            </>
          ) : (
            <Button onClick={nextStep} disabled={!isStepValid(currentStep)}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
