import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExamResultPdfDocument } from './examResultPdf';
import type { ExamResultReportData } from './examResultReportModel';

const competencyNames = [
  'Strategic Leadership',
  'Effective Communication',
  'Consultative Mindset',
  'Business Acumen',
  'Critical Thinking and Problem-Solving',
  'Emotional Intelligence',
  'Negotiation and Relationship Management',
  'Growth and Expansion Strategies',
];

function createReportData(passed: boolean): ExamResultReportData {
  return {
    attempt: {
      id: 'attempt-123',
      score: passed ? 87 : 64,
      passed,
      total_points_earned: passed ? 104 : 77,
      total_points_possible: 120,
      time_spent_minutes: 139,
      completed_at: '2026-09-01T10:08:00.000Z',
      passing_score_percentage: 70,
      integrity_review_status: 'not_required',
    },
    candidate: { email: 'candidate@example.com', first_name: 'Sample', last_name: 'Candidate' },
    exam: { title: 'BDA Certified Professional (BDA-CP) - Arabic Exam', certification_type: 'CP', exam_language: 'AR' },
    domain_performance: [
      { domain: 'behavioral', score_percentage: passed ? 88 : 58, total_questions: 54, correct_answers: passed ? 48 : 31 },
      { domain: 'knowledge_based', score_percentage: passed ? 86 : 64, total_questions: 66, correct_answers: passed ? 56 : 42 },
    ],
    competency_performance: competencyNames.map((competency_name, index) => ({
      competency_name,
      competency_section: index < 3 ? 'behavioral' : 'knowledge_based',
      score_percentage: passed ? 76 + index : 44 + index * 4,
      total_questions: 8,
      correct_answers: passed ? 6 : 4,
      performance_level: passed ? 'strong' as const : index < 2 ? 'weak' as const : 'needs_improvement' as const,
    })),
  };
}

describe('exam result PDF generator', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a one-page official result for a passed attempt', async () => {
    const result = await createExamResultPdfDocument(createReportData(true));

    expect(result.kind).toBe('success');
    expect(result.pageCount).toBe(1);
    expect(result.doc.output('arraybuffer').byteLength).toBeGreaterThan(1200);
  });

  it('creates a two-page development report for an unsuccessful attempt', async () => {
    const result = await createExamResultPdfDocument(createReportData(false));

    expect(result.kind).toBe('development');
    expect(result.pageCount).toBe(2);
    expect(result.doc.output('arraybuffer').byteLength).toBeGreaterThan(1800);
  });
});
