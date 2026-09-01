import { describe, expect, it } from 'vitest';
import {
  buildExamResultDocumentFilename,
  formatCertificationType,
  formatExamLanguage,
  getExamResultDocumentKind,
  getPriorityCompetencies,
  getStrengthCompetencies,
  isResultDocumentAvailable,
  type ExamResultReportData,
} from './examResultReportModel';

const baseData: ExamResultReportData = {
  attempt: {
    id: 'attempt-123',
    score: 87,
    passed: true,
    total_points_earned: 104,
    total_points_possible: 120,
    time_spent_minutes: 139,
    completed_at: '2026-09-01T10:08:00.000Z',
    passing_score_percentage: 70,
    integrity_review_status: 'not_required',
  },
  candidate: { email: 'candidate@example.com', first_name: 'Sample', last_name: 'Candidate' },
  exam: { title: 'BDA-CP Official Exam', certification_type: 'cp', exam_language: 'ar' },
  domain_performance: [],
  competency_performance: [
    { competency_name: 'Business Acumen', competency_section: 'knowledge_based', score_percentage: 50, total_questions: 8, correct_answers: 4, performance_level: 'weak' },
    { competency_name: 'Strategic Leadership', competency_section: 'behavioral', score_percentage: 65, total_questions: 8, correct_answers: 5, performance_level: 'adequate' },
    { competency_name: 'Project Management', competency_section: 'knowledge_based', score_percentage: 85, total_questions: 8, correct_answers: 7, performance_level: 'strong' },
  ],
};

describe('exam result report model', () => {
  it('creates a one-page success document only for a passed attempt', () => {
    expect(getExamResultDocumentKind(baseData.attempt)).toBe('success');
    expect(getExamResultDocumentKind({ ...baseData.attempt, passed: false })).toBe('development');
  });

  it('does not make a report available while an integrity review is pending or voided', () => {
    expect(isResultDocumentAvailable('not_required')).toBe(true);
    expect(isResultDocumentAvailable('approved')).toBe(true);
    expect(isResultDocumentAvailable('pending')).toBe(false);
    expect(isResultDocumentAvailable('voided')).toBe(false);
  });

  it('uses the lowest competency scores for preparation priorities and the highest for strengths', () => {
    expect(getPriorityCompetencies(baseData.competency_performance).map((item) => item.competency_name))
      .toEqual(['Business Acumen', 'Strategic Leadership', 'Project Management']);
    expect(getStrengthCompetencies(baseData.competency_performance).map((item) => item.competency_name))
      .toEqual(['Project Management', 'Strategic Leadership']);
  });

  it('formats report metadata and filename deterministically', () => {
    expect(formatCertificationType('scp')).toBe('BDA-SCP');
    expect(formatExamLanguage('ar')).toBe('Arabic');
    expect(buildExamResultDocumentFilename(baseData)).toBe('BDA-CP-Examination-Result-2026-09-01.pdf');
  });
});
