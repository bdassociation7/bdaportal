/**
 * InlineQuizBuilder
 * ─────────────────
 * Renders directly inside the Lesson Editor's Quiz Panel.
 * Lets the admin create / edit a lesson quiz without leaving the page.
 *
 * Flow:
 *  1. If the lesson already has a linked quiz  → load its questions and show them.
 *  2. If no quiz yet                           → show "Build Quiz" button.
 *  3. When the admin clicks "Build Quiz"       → show the question builder inline.
 *  4. On "Save Quiz"                           → create quiz + questions in Supabase,
 *     then call onQuizSaved(quizId) so the parent can store the quiz id in the lesson.
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2, Circle, Loader2, BookOpen, Edit3, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QuizService } from '@/entities/quiz/quiz.service';
import type { QuestionWithAnswers } from '@/entities/quiz/quiz.types';
import { useToast } from '@/hooks/use-toast';

// ─── types ────────────────────────────────────────────────────────────────────

interface DraftAnswer {
  id: string;           // local uuid for React key
  text: string;
  isCorrect: boolean;
}

interface DraftQuestion {
  id: string;           // local uuid for React key
  text: string;
  answers: DraftAnswer[];
  expanded: boolean;
}

interface InlineQuizBuilderProps {
  /** ID of the existing linked quiz (if any) */
  quizId?: string;
  /** Language of the lesson – used to label the quiz automatically */
  language: 'en' | 'ar';
  /** Lesson title – used to auto-name the quiz */
  lessonTitle?: string;
  /** Called after a quiz is created/updated with the new quiz ID */
  onQuizSaved: (quizId: string) => void;
  /** Called when the user removes the quiz link */
  onQuizRemoved?: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyAnswer(): DraftAnswer {
  return { id: uid(), text: '', isCorrect: false };
}

function emptyQuestion(): DraftQuestion {
  return {
    id: uid(),
    text: '',
    answers: [emptyAnswer(), emptyAnswer(), emptyAnswer(), emptyAnswer()],
    expanded: true,
  };
}

// ─── component ────────────────────────────────────────────────────────────────

export const InlineQuizBuilder: React.FC<InlineQuizBuilderProps> = ({
  quizId,
  language,
  lessonTitle,
  onQuizSaved,
  onQuizRemoved,
}) => {
  const { toast } = useToast();

  // UI state
  const [mode, setMode] = useState<'idle' | 'building' | 'saving'>('idle');
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [existingQuestions, setExistingQuestions] = useState<QuestionWithAnswers[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [editingExisting, setEditingExisting] = useState(false);

  // ── load existing questions when quizId changes ──────────────────────────
  useEffect(() => {
    if (!quizId) {
      setExistingQuestions([]);
      return;
    }
    setLoadingExisting(true);
    QuizService.getQuizQuestions(quizId).then(({ data }) => {
      setExistingQuestions(data || []);
      setLoadingExisting(false);
    });
  }, [quizId]);

  // ── question CRUD helpers ────────────────────────────────────────────────

  const addQuestion = () =>
    setQuestions((qs) => [...qs, emptyQuestion()]);

  const removeQuestion = (qid: string) =>
    setQuestions((qs) => qs.filter((q) => q.id !== qid));

  const toggleExpand = (qid: string) =>
    setQuestions((qs) =>
      qs.map((q) => (q.id === qid ? { ...q, expanded: !q.expanded } : q))
    );

  const updateQuestionText = (qid: string, text: string) =>
    setQuestions((qs) =>
      qs.map((q) => (q.id === qid ? { ...q, text } : q))
    );

  const updateAnswer = (qid: string, aid: string, patch: Partial<DraftAnswer>) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid
          ? {
              ...q,
              answers: q.answers.map((a) =>
                a.id === aid ? { ...a, ...patch } : a
              ),
            }
          : q
      )
    );

  const setCorrectAnswer = (qid: string, aid: string) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid
          ? {
              ...q,
              answers: q.answers.map((a) => ({
                ...a,
                isCorrect: a.id === aid,
              })),
            }
          : q
      )
    );

  const addAnswer = (qid: string) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid ? { ...q, answers: [...q.answers, emptyAnswer()] } : q
      )
    );

  const removeAnswer = (qid: string, aid: string) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qid
          ? { ...q, answers: q.answers.filter((a) => a.id !== aid) }
          : q
      )
    );

  // ── validation ───────────────────────────────────────────────────────────

  const validate = (): string | null => {
    for (const q of questions) {
      if (!q.text.trim()) return 'All questions must have text.';
      const nonEmpty = q.answers.filter((a) => a.text.trim());
      if (nonEmpty.length < 2) return 'Each question needs at least 2 answer options.';
      const hasCorrect = q.answers.some((a) => a.isCorrect && a.text.trim());
      if (!hasCorrect) return 'Each question must have one correct answer selected.';
    }
    return null;
  };

  // ── save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast({ title: 'Validation Error', description: err, variant: 'destructive' });
      return;
    }

    setMode('saving');

    try {
      let targetQuizId = quizId;

      // 1. Create quiz if not exists
      if (!targetQuizId) {
        const autoTitle = lessonTitle
          ? `${lessonTitle} – Quiz`
          : `Lesson Quiz`;
        const { data: newQuiz, error: quizErr } = await QuizService.createQuiz({
          title: language === 'en' ? autoTitle : `${autoTitle} (EN)`,
          title_ar: language === 'ar' ? autoTitle : undefined,
          certification_type: 'CP',  // lesson quizzes are not certification exams
          difficulty_level: 'medium',
          time_limit_minutes: 10,
          passing_score_percentage: 70,
          is_active: true,
        });
        if (quizErr || !newQuiz) {
          toast({ title: 'Error', description: 'Failed to create quiz.', variant: 'destructive' });
          setMode('building');
          return;
        }
        targetQuizId = newQuiz.id;
      }

      // 2. Save questions
      let allOk = true;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const validAnswers = q.answers.filter((a) => a.text.trim());
        const { error } = await QuizService.createQuestion({
          quiz_id: targetQuizId!,
          question_text: q.text.trim(),
          question_type: 'multiple_choice',
          difficulty: 'medium',
          points: 1,
          order_index: i + 1,
          answers: validAnswers.map((a, idx) => ({
            answer_text: a.text.trim(),
            is_correct: a.isCorrect,
            order_index: idx + 1,
          })),
        });
        if (error) { allOk = false; break; }
      }

      if (!allOk) {
        toast({ title: 'Error', description: 'Some questions failed to save.', variant: 'destructive' });
        setMode('building');
        return;
      }

      // 3. Reload existing questions
      const { data: fresh } = await QuizService.getQuizQuestions(targetQuizId!);
      setExistingQuestions(fresh || []);
      setQuestions([emptyQuestion()]);
      setMode('idle');
      setEditingExisting(false);
      onQuizSaved(targetQuizId!);

      toast({ title: 'Quiz saved!', description: `${questions.length} question(s) saved successfully.` });
    } catch {
      toast({ title: 'Error', description: 'Unexpected error saving quiz.', variant: 'destructive' });
      setMode('building');
    }
  };

  // ─── render: existing quiz summary ─────────────────────────────────────

  if (quizId && !editingExisting) {
    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Quiz Linked
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => {
                setEditingExisting(true);
                setMode('building');
              }}
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Add Questions
            </Button>
            {onQuizRemoved && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 text-red-500 hover:text-red-700"
                onClick={onQuizRemoved}
              >
                Unlink
              </Button>
            )}
          </div>
        </div>

        {/* Questions list */}
        {loadingExisting ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading questions…
          </div>
        ) : existingQuestions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center">
            <AlertCircle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">No questions yet.</p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-xs h-auto p-0 mt-1"
              onClick={() => { setEditingExisting(true); setMode('building'); }}
            >
              Add questions now
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">{existingQuestions.length} question(s)</p>
            {existingQuestions.map((q, i) => (
              <div key={q.id} className="rounded border bg-gray-50 px-3 py-2">
                <p className="text-xs font-medium text-gray-700 line-clamp-2">
                  {i + 1}. {q.question_text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── render: idle (no quiz yet) ─────────────────────────────────────────

  if (mode === 'idle') {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center space-y-2">
        <BookOpen className="h-5 w-5 text-gray-300 mx-auto" />
        <p className="text-xs text-gray-500">No quiz attached to this lesson yet.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setMode('building')}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Build Quiz
        </Button>
      </div>
    );
  }

  // ─── render: builder ────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Builder header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">
          {editingExisting ? 'Add More Questions' : 'Build Lesson Quiz'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 text-gray-400"
          onClick={() => { setMode('idle'); setEditingExisting(false); setQuestions([emptyQuestion()]); }}
        >
          Cancel
        </Button>
      </div>

      {/* Questions */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {questions.map((q, qi) => (
          <div key={q.id} className="rounded-lg border bg-white shadow-sm">
            {/* Question header */}
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
              onClick={() => toggleExpand(q.id)}
            >
              <span className="text-xs font-bold text-gray-400 w-4">Q{qi + 1}</span>
              <span className="flex-1 text-xs text-gray-600 truncate">
                {q.text || <span className="italic text-gray-300">Question text…</span>}
              </span>
              <div className="flex items-center gap-1">
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeQuestion(q.id); }}
                    className="text-red-400 hover:text-red-600 p-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                {q.expanded
                  ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                  : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                }
              </div>
            </div>

            {/* Question body */}
            {q.expanded && (
              <div className="px-3 pb-3 space-y-2 border-t pt-2">
                <Textarea
                  placeholder="Enter question text…"
                  value={q.text}
                  onChange={(e) => updateQuestionText(q.id, e.target.value)}
                  className="text-xs min-h-[60px] resize-none"
                />

                {/* Answers */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Answer Options — click circle to mark correct
                  </p>
                  {q.answers.map((a, ai) => (
                    <div key={a.id} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(q.id, a.id)}
                        className={`flex-shrink-0 ${a.isCorrect ? 'text-green-500' : 'text-gray-300'}`}
                      >
                        {a.isCorrect
                          ? <CheckCircle2 className="h-4 w-4" />
                          : <Circle className="h-4 w-4" />
                        }
                      </button>
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + ai)}`}
                        value={a.text}
                        onChange={(e) => updateAnswer(q.id, a.id, { text: e.target.value })}
                        className="text-xs h-7 flex-1"
                      />
                      {q.answers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeAnswer(q.id, a.id)}
                          className="text-gray-300 hover:text-red-400 flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {q.answers.length < 6 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-6 px-2 text-gray-400"
                      onClick={() => addAnswer(q.id)}
                    >
                      <Plus className="h-3 w-3 mr-0.5" /> Add Option
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add question */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-xs border-dashed"
        onClick={addQuestion}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add Another Question
      </Button>

      {/* Save */}
      <Button
        type="button"
        size="sm"
        className="w-full text-xs bg-green-600 hover:bg-green-700 text-white"
        onClick={handleSave}
        disabled={mode === 'saving'}
      >
        {mode === 'saving'
          ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Saving…</>
          : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Save Quiz ({questions.length} Q)</>
        }
      </Button>
    </div>
  );
};

export default InlineQuizBuilder;
