/**
 * Admin PDP Program Review
 *
 * Program accreditation review workflow including:
 * - Pending program submissions review
 * - BoCK competency alignment verification
 * - PDC credit approval
 * - Partner program management
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap,
  Search,
  MoreHorizontal,
  Clock,
  Eye,
  Download,
  MessageSquare,
  History,
  FileText,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Types
interface ProgramSubmission {
  id: string;
  program_id: string;
  program_name: string;
  partner_id: string;
  partner_name: string;
  activity_type: string;
  delivery_mode: string;
  delivery_language: string;
  duration_hours: number;
  pdc_requested: number;
  status: "pending" | "under_review" | "approved" | "rejected" | "revision_requested";
  submitted_at: string;
  competencies: Array<{
    code: string;
    name: string;
    level: "primary" | "secondary" | "supporting";
  }>;
  description: string;
  learning_outcomes: string[];
  has_attachment: boolean;
}

interface ReviewHistory {
  id: string;
  action: string;
  reviewer: string;
  timestamp: string;
  notes?: string;
}

// Mock data
const mockSubmissions: ProgramSubmission[] = [
  {
    id: "1",
    program_id: "PDP-US-001-2024-001",
    program_name: "Advanced Business Analysis Workshop",
    partner_id: "p1",
    partner_name: "Academy of Business Excellence",
    activity_type: "training_course",
    delivery_mode: "hybrid",
    delivery_language: "English",
    duration_hours: 16,
    pdc_requested: 16,
    status: "pending",
    submitted_at: "2024-02-15",
    competencies: [
      { code: "BA1", name: "BA Planning & Monitoring", level: "primary" },
      { code: "BA2", name: "Elicitation & Collabouration", level: "primary" },
      { code: "BA3", name: "Requirements Life Cycle", level: "secondary" },
    ],
    description:
      "Comprehensive workshop covering advanced business analysis techniques for senior professionals.",
    learning_outcomes: [
      "Apply advanced elicitation techniques in complex scenarios",
      "Develop comprehensive BA plans for enterprise projects",
      "Evaluate and select appropriate modeling approaches",
    ],
    has_attachment: true,
  },
  {
    id: "2",
    program_id: "PDP-EG-002-2024-003",
    program_name: "Strategic Requirements Engineering",
    partner_id: "p2",
    partner_name: "Cairo Training Center",
    activity_type: "workshop",
    delivery_mode: "in_person",
    delivery_language: "Arabic",
    duration_hours: 8,
    pdc_requested: 8,
    status: "under_review",
    submitted_at: "2024-02-12",
    competencies: [
      { code: "BA5", name: "Requirements Analysis & Design", level: "primary" },
      { code: "BA4", name: "Strategy Analysis", level: "secondary" },
    ],
    description:
      "Hands-on workshop focused on requirements engineering best practices.",
    learning_outcomes: [
      "Define and document strategic requirements",
      "Apply structured analysis techniques",
    ],
    has_attachment: true,
  },
  {
    id: "3",
    program_id: "PDP-SA-003-2024-001",
    program_name: "Agile BA Fundamentals",
    partner_id: "p3",
    partner_name: "Saudi Professional Institute",
    activity_type: "training_course",
    delivery_mode: "online",
    delivery_language: "English",
    duration_hours: 12,
    pdc_requested: 12,
    status: "revision_requested",
    submitted_at: "2024-02-08",
    competencies: [
      { code: "BA10", name: "Agile Analysis", level: "primary" },
      { code: "BA2", name: "Elicitation & Collabouration", level: "supporting" },
    ],
    description: "Introduction to agile business analysis practices.",
    learning_outcomes: ["Understand agile BA role", "Apply user story techniques"],
    has_attachment: false,
  },
];

const mockReviewHistory: ReviewHistory[] = [
  {
    id: "1",
    action: "Submitted for Review",
    reviewer: "Partner",
    timestamp: "2024-02-15 09:30 AM",
  },
  {
    id: "2",
    action: "Assigned for Review",
    reviewer: "Admin System",
    timestamp: "2024-02-15 10:15 AM",
  },
];

const reviewChecklist = [
  { id: "content", label: "Content aligns with stated learning objectives" },
  { id: "competencies", label: "BoCK competency mapping is accurate" },
  { id: "pdc", label: "PDC credits are appropriate for duration and content" },
  { id: "audience", label: "Target audience is clearly defined" },
  { id: "materials", label: "Program materials/agenda provided" },
  { id: "instructor", label: "Instructor qualifications verified" },
];

export default function PDPProgramReview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch programs from database
  const { data: programsData, isLoading } = useQuery({
    queryKey: ['admin', 'pdp-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdp_programs')
        .select(`
          *,
          users!pdp_programs_provider_id_fkey(
            id,
            email,
            first_name,
            last_name,
            company_name
          ),
          pdp_program_competencies(
            relevance_level,
            bock_competencies(
              code,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching programs:', error);
        throw error;
      }
      return data || [];
    },
  });


  // Map database programs to UI interface
  const submissions: ProgramSubmission[] = programsData?.map((prog: any) => {
    const provider = prog.users || null;
    return {
      id: prog.id,
      program_id: prog.program_id,
      program_name: prog.program_name,
      partner_id: prog.provider_id || '',
      partner_name: prog.provider_name || provider?.company_name || `${provider?.first_name || ''} ${provider?.last_name || ''}`.trim() || 'Unknown Partner',
      activity_type: prog.activity_type,
      delivery_mode: prog.delivery_mode || 'in_person',
      delivery_language: prog.delivery_language || 'English',
      duration_hours: prog.duration_hours || 0,
      pdc_requested: prog.max_pdc_credits,
      status: prog.status,
      submitted_at: new Date(prog.created_at).toISOString().split('T')[0],
      competencies: (prog.pdp_program_competencies || []).map((c: any) => ({
        code: c.bock_competencies?.code || '',
        name: c.bock_competencies?.name || '',
        level: c.relevance_level || 'supporting',
      })),
      description: prog.description || '',
      learning_outcomes: prog.learning_outcomes || [],
      has_attachment: !!(prog.agenda_url || prog.brochure_url),
    };
  }) || [];

  // Stats
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const underReviewCount = submissions.filter((s) => s.status === "under_review").length;
  const revisionCount = submissions.filter((s) => s.status === "revision_requested").length;


  const getStatusBadge = (status: ProgramSubmission["status"]) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700">{t('pdpPrograms.pending')}</Badge>;
      case "under_review":
        return <Badge className="bg-blue-100 text-blue-700">{t('pdpPrograms.underReview')}</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-700">{t('pdp.approved')}</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">{t('pdp.rejected')}</Badge>;
      case "revision_requested":
        return <Badge className="bg-orange-100 text-orange-700">{t('pdpPrograms.revisionRequested')}</Badge>;
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.program_name.toLowerCase().includes(search.toLowerCase()) ||
      s.partner_name.toLowerCase().includes(search.toLowerCase()) ||
      s.program_id.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || s.activity_type === typeFilter;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" && s.status === "pending") ||
      (activeTab === "review" && s.status === "under_review") ||
      (activeTab === "revision" && s.status === "revision_requested");
    return matchesSearch && matchesType && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">{t('pdpPrograms.title')}</h1>
            <p className="mt-2 opacity-90">
              {t('pdpPrograms.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pdpPrograms.pendingReview')}</p>
                <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pdpPrograms.underReview')}</p>
                <p className="text-3xl font-bold text-blue-600">{underReviewCount}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pdpPrograms.awaitingRevision')}</p>
                <p className="text-3xl font-bold text-orange-600">{revisionCount}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pdpPrograms.totalPrograms')}</p>
                <p className="text-3xl font-bold">{submissions.length}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('pdpPrograms.programSubmissions')}</CardTitle>
              <CardDescription>{t('pdpPrograms.programSubmissionsDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="pending">
                {t('pdpPrograms.pending')}
                {pendingCount > 0 && (
                  <Badge className="ml-2 bg-amber-500">{pendingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="review">
                {t('pdpPrograms.underReview')}
                {underReviewCount > 0 && (
                  <Badge className="ml-2 bg-blue-500">{underReviewCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="revision">
                {t('pdpPrograms.revisionRequested')}
                {revisionCount > 0 && (
                  <Badge className="ml-2 bg-orange-500">{revisionCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">{t('pdpPrograms.all')}</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('pdpPrograms.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('pdpPrograms.activityType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('pdpPrograms.allTypes')}</SelectItem>
                <SelectItem value="training_course">{t('pdpPrograms.trainingCourse')}</SelectItem>
                <SelectItem value="workshop">{t('pdpPrograms.workshop')}</SelectItem>
                <SelectItem value="webinar">{t('pdpPrograms.webinar')}</SelectItem>
                <SelectItem value="conference">{t('pdpPrograms.conference')}</SelectItem>
                <SelectItem value="self_study">{t('pdpPrograms.selfStudy')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pdpPrograms.program')}</TableHead>
                <TableHead>{t('pdpPrograms.partner')}</TableHead>
                <TableHead>{t('pdpPrograms.type')}</TableHead>
                <TableHead>{t('pdpPrograms.pdcs')}</TableHead>
                <TableHead>{t('pdpPrograms.competencies')}</TableHead>
                <TableHead>{t('pdpPrograms.submitted')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {t('pdpPrograms.loadingPrograms')}
                  </TableCell>
                </TableRow>
              ) : filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{submission.program_name}</p>
                        <p className="text-xs text-gray-500">{submission.program_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{submission.partner_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {submission.activity_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{submission.pdc_requested}</span>
                      <span className="text-gray-500 text-sm"> / {submission.duration_hours}h</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {submission.competencies.slice(0, 2).map((c) => (
                          <Badge
                            key={c.code}
                            variant="outline"
                            className={
                              c.level === "primary"
                                ? "border-blue-500 text-blue-700"
                                : c.level === "secondary"
                                ? "border-purple-500 text-purple-700"
                                : "border-gray-400 text-gray-600"
                            }
                          >
                            {c.code}
                          </Badge>
                        ))}
                        {submission.competencies.length > 2 && (
                          <Badge variant="outline">+{submission.competencies.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{submission.submitted_at}</TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/pdp-programs/${submission.id}/review`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('pdpPrograms.reviewDetails')}
                          </DropdownMenuItem>
                          {submission.has_attachment && (
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              {t('pdpPrograms.downloadMaterials')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <History className="h-4 w-4 mr-2" />
                            {t('pdpPrograms.viewHistory')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {t('pdpPrograms.noPrograms')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
