export type IntegrityReviewStatus = 'not_required' | 'pending' | 'approved' | 'voided' | null | undefined;

export interface ExamResultReportAttempt {
  id: string;
  score: number | null;
  passed: boolean | null;
  total_points_earned: number | null;
  total_points_possible: number | null;
  time_spent_minutes: number | null;
  started_at?: string | null;
  completed_at: string | null;
  passing_score_percentage: number | null;
  integrity_review_status?: IntegrityReviewStatus;
}

export interface ExamResultReportCandidate {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface ExamResultReportExam {
  title: string;
  certification_type: string;
  exam_language?: string | null;
}

export interface ExamResultReportDomain {
  domain: string;
  score_percentage: number;
  total_questions: number;
  correct_answers: number;
}

export interface ExamResultReportCompetency {
  competency_name: string;
  competency_section: string;
  score_percentage: number;
  total_questions: number;
  correct_answers: number;
  performance_level: 'strong' | 'adequate' | 'needs_improvement' | 'weak';
}

export interface ExamResultReportData {
  attempt: ExamResultReportAttempt;
  candidate: ExamResultReportCandidate;
  exam: ExamResultReportExam;
  domain_performance: ExamResultReportDomain[];
  competency_performance: ExamResultReportCompetency[];
}

export type ExamResultDocumentKind = 'success' | 'development';

export const DOMAIN_LABELS: Record<string, string> = {
  behavioral: 'Behavioural Domain',
  behavioural: 'Behavioural Domain',
  knowledge_based: 'Knowledge Domain',
  untagged: 'General',
};

export function getCandidateDisplayName(candidate: ExamResultReportCandidate): string {
  const name = [candidate.first_name, candidate.last_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ');

  return name || candidate.email;
}

export function isResultDocumentAvailable(status: IntegrityReviewStatus): boolean {
  return status !== 'pending' && status !== 'voided';
}

export function getExamResultDocumentKind(attempt: ExamResultReportAttempt): ExamResultDocumentKind {
  return attempt.passed ? 'success' : 'development';
}

export function formatCertificationType(certificationType: string): string {
  const value = certificationType.trim().replace(/^BDA-/i, '').toUpperCase();
  return `BDA-${value || 'CP'}`;
}

export function formatExamLanguage(examLanguage?: string | null): string {
  const value = examLanguage?.trim().toLowerCase();
  if (value === 'ar' || value === 'arabic') return 'Arabic';
  if (value === 'en' || value === 'english') return 'English';
  return examLanguage?.trim() || 'English';
}

export function formatDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes} min`;
}

export function getPriorityCompetencies(
  competencies: ExamResultReportCompetency[],
  limit = 6,
): ExamResultReportCompetency[] {
  return [...competencies]
    .filter((competency) => competency.total_questions > 0)
    .sort((a, b) => a.score_percentage - b.score_percentage || a.competency_name.localeCompare(b.competency_name))
    .slice(0, limit);
}

export function getStrengthCompetencies(
  competencies: ExamResultReportCompetency[],
  limit = 2,
): ExamResultReportCompetency[] {
  return [...competencies]
    .filter((competency) => competency.total_questions > 0)
    .sort((a, b) => b.score_percentage - a.score_percentage || a.competency_name.localeCompare(b.competency_name))
    .slice(0, limit);
}

export function getPreparationFocus(level: ExamResultReportCompetency['performance_level']): string {
  switch (level) {
    case 'weak':
      return 'Priority review';
    case 'needs_improvement':
      return 'Focused review';
    case 'adequate':
      return 'Reinforce';
    case 'strong':
      return 'Maintain';
  }
}

export function buildExamResultDocumentFilename(data: ExamResultReportData): string {
  const kind = getExamResultDocumentKind(data.attempt) === 'success' ? 'Examination-Result' : 'Development-Report';
  const certificate = formatCertificationType(data.exam.certification_type).replace(/[^A-Za-z0-9-]/g, '');
  const date = data.attempt.completed_at ? data.attempt.completed_at.slice(0, 10) : 'result';
  return `${certificate}-${kind}-${date}.pdf`;
}
