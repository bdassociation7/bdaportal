/**
 * Question Set Editor - Admin Page — English Only
 * Manage individual questions within a question set
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useQuestionSet,
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useBulkCreateQuestions,
} from '@/entities/question-bank';
import type {
  PracticeQuestion,
  PracticeQuestionInsert,
  PracticeQuestionUpdate,
  QuestionOption,
} from '@/entities/question-bank';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  Check,
  MoreHorizontal,
  Upload,
  Search,
  Filter,
  HelpCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// ─── mammoth (browser build) ────────────────────────────────────────────────
// mammoth is listed in root package.json and its browser field is mapped
// automatically by Vite, so we can import it directly.
import mammoth from 'mammoth';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ParsedQuestion {
  question_text: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  rationale: string;
  difficulty: 'easy' | 'medium' | 'hard';
  certification_target: 'CP' | 'SCP' | null;
}

interface ImportPreview {
  questions: ParsedQuestion[];
  fileName: string;
  certType: string;
  totalParsed: number;
  errors: string[];
}

// ─── Word Parser ─────────────────────────────────────────────────────────────
function parseWordContent(rawText: string, fileName: string): ImportPreview {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const errors: string[] = [];

  // Detect cert type from filename or first few lines
  let certType = 'Unknown';
  let certTarget: 'CP' | 'SCP' | null = null;
  const headerText = [fileName, ...lines.slice(0, 5)].join(' ');
  if (/BDA-SCP/i.test(headerText)) {
    certType = 'BDA-SCP';
    certTarget = 'SCP';
  } else if (/BDA-CP/i.test(headerText)) {
    certType = 'BDA-CP';
    certTarget = 'CP';
  }

  // Detect difficulty from header
  let defaultDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
  const headerFull = lines.slice(0, 5).join(' ');
  if (/Direct Knowledge/i.test(headerFull)) defaultDifficulty = 'easy';
  else if (/Advanced|Very High/i.test(headerFull)) defaultDifficulty = 'hard';

  const questions: ParsedQuestion[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Match "Question N" or "Question N text"
    const qMatch = line.match(/^Question\s+(\d+)\s*(.*)/i);
    if (!qMatch) { i++; continue; }

    let qText = qMatch[2].trim();

    // If question text is on next line
    if (!qText && i + 1 < lines.length && !/^[A-D][.)]/i.test(lines[i + 1]) && !/^Question\s+\d+/i.test(lines[i + 1])) {
      i++;
      qText = lines[i].trim();
    }

    // Collect multi-line question text (until we hit an option line A.)
    while (i + 1 < lines.length && !/^[A-D][.)]/i.test(lines[i + 1]) && !/^Question\s+\d+/i.test(lines[i + 1]) && !/^Correct Answer:/i.test(lines[i + 1])) {
      i++;
      qText += ' ' + lines[i].trim();
    }

    // Parse options A B C D
    const opts: Record<string, string> = {};
    let currentOptKey = '';
    let currentOptVal: string[] = [];

    const flushOpt = () => {
      if (currentOptKey) opts[currentOptKey] = currentOptVal.join(' ').trim();
    };

    while (i + 1 < lines.length) {
      i++;
      const optLine = lines[i];

      // Check for option start
      const optMatch = optLine.match(/^([A-D])[.)]\s*(.*)/i);
      if (optMatch) {
        flushOpt();
        currentOptKey = optMatch[1].toUpperCase();
        currentOptVal = [optMatch[2].trim()];
      } else if (/^Correct Answer:/i.test(optLine)) {
        flushOpt();
        // Parse correct answer + optional inline rationale
        let correctAnswer = '';
        let rationale = '';
        const caMatch = optLine.match(/^Correct Answer:\s*([A-D])\s*(?:Rationale:\s*(.*))?$/i);
        if (caMatch) {
          correctAnswer = caMatch[1].toUpperCase();
          rationale = caMatch[2]?.trim() || '';
        }

        // Check next line for rationale if not inline
        if (!rationale && i + 1 < lines.length && /^Rationale:/i.test(lines[i + 1])) {
          i++;
          rationale = lines[i].replace(/^Rationale:\s*/i, '').trim();
          // Collect multi-line rationale
          while (i + 1 < lines.length && !/^Question\s+\d+/i.test(lines[i + 1])) {
            i++;
            rationale += ' ' + lines[i].trim();
          }
        }

        if (qText && Object.keys(opts).length === 4 && correctAnswer) {
          questions.push({
            question_text: qText.trim(),
            options: {
              A: opts['A'] || '',
              B: opts['B'] || '',
              C: opts['C'] || '',
              D: opts['D'] || '',
            },
            correct_answer: correctAnswer as 'A' | 'B' | 'C' | 'D',
            rationale: rationale.trim(),
            difficulty: defaultDifficulty,
            certification_target: certTarget,
          });
        } else {
          if (!qText) errors.push(`Question ${questions.length + 1}: missing question text`);
          else if (Object.keys(opts).length !== 4) errors.push(`Question ${questions.length + 1}: found ${Object.keys(opts).length} options (expected 4)`);
          else if (!correctAnswer) errors.push(`Question ${questions.length + 1}: missing correct answer`);
        }
        break; // move to next question
      } else if (currentOptKey) {
        // continuation of current option
        currentOptVal.push(optLine);
      }
    }

    i++;
  }

  return {
    questions,
    fileName,
    certType,
    totalParsed: questions.length,
    errors,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function QuestionSetEditor() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PracticeQuestion | null>(null);
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState<PracticeQuestion | null>(null);

  // Import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: questionSet, isLoading: isLoadingSet } = useQuestionSet(setId);
  const { data: questions, isLoading: isLoadingQuestions } = useQuestions(setId, {
    difficulty_level: difficultyFilter !== 'all' ? (difficultyFilter as any) : undefined,
  });

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const bulkCreateQuestions = useBulkCreateQuestions();

  const filteredQuestions = questions?.filter((q) => {
    if (searchTerm) {
      return q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const handleCreate = async (data: PracticeQuestionInsert) => {
    try {
      await createQuestion.mutateAsync(data);
      toast.success('Question created successfully');
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error('Failed to create question');
    }
  };

  const handleUpdate = async (questionId: string, data: PracticeQuestionUpdate) => {
    try {
      await updateQuestion.mutateAsync({ questionId, updates: data });
      toast.success('Question updated successfully');
      setEditingQuestion(null);
    } catch (error) {
      toast.error('Failed to update question');
    }
  };

  const handleDelete = async (questionId: string) => {
    try {
      await deleteQuestion.mutateAsync({ questionId, questionSetId: setId! });
      toast.success('Question deleted successfully');
      setDeleteConfirmQuestion(null);
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  const handleTogglePublish = async (question: PracticeQuestion) => {
    try {
      await updateQuestion.mutateAsync({
        questionId: question.id,
        updates: { is_published: !question.is_published },
      });
      toast.success(question.is_published ? 'Question unpublished' : 'Question published');
    } catch (error) {
      toast.error('Failed to update publish status');
    }
  };

  // ── Import handlers ──────────────────────────────────────────────────────
  const handleImportButtonClick = () => {
    setImportPreview(null);
    setIsImportDialogOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      toast.error('Only .docx files are supported');
      return;
    }

    setIsParsingFile(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawText = result.value;
      const preview = parseWordContent(rawText, file.name);
      setImportPreview(preview);
    } catch (err) {
      toast.error('Failed to read file. Make sure it is a valid .docx file.');
      console.error(err);
    } finally {
      setIsParsingFile(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview || !setId) return;
    setIsImporting(true);

    try {
      const currentCount = questions?.length || 0;
      const toInsert: PracticeQuestionInsert[] = importPreview.questions.map((q, idx) => ({
        question_set_id: setId,
        question_text: q.question_text,
        question_text_ar: null,
        question_type: 'multiple_choice',
        options: [
          { id: 'a', text: q.options.A },
          { id: 'b', text: q.options.B },
          { id: 'c', text: q.options.C },
          { id: 'd', text: q.options.D },
        ] as QuestionOption[],
        correct_option_id: q.correct_answer.toLowerCase(),
        explanation: q.rationale || null,
        explanation_ar: null,
        difficulty_level: q.difficulty,
        order_index: currentCount + idx + 1,
        tags: [],
        points: 1,
        is_published: true,
        certification_target: q.certification_target,
      }));

      await bulkCreateQuestions.mutateAsync(toInsert);
      toast.success(`Successfully imported ${toInsert.length} questions!`);
      setIsImportDialogOpen(false);
      setImportPreview(null);
    } catch (err) {
      toast.error('Import failed. Please try again.');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoadingSet || isLoadingQuestions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/question-bank')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Question Bank
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{questionSet?.title}</h1>
            <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700">🇬🇧 English</span>
          </div>
          <p className="text-gray-600 mt-1">
            {questions?.length || 0} questions • Passing score: {questionSet?.passing_score}%
          </p>
        </div>
        <div className="flex gap-3">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button variant="outline" onClick={handleImportButtonClick}>
            <Upload className="w-4 h-4 mr-2" />
            Import Questions
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions?.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index + 1}
            onEdit={() => setEditingQuestion(question)}
            onDelete={() => setDeleteConfirmQuestion(question)}
            onTogglePublish={() => handleTogglePublish(question)}
          />
        ))}

        {filteredQuestions?.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No questions found</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Question
            </Button>
          </div>
        )}
      </div>

      {/* ── Import Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => { if (!isImporting) { setIsImportDialogOpen(open); if (!open) setImportPreview(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-600" />
              Import Questions from Word
            </DialogTitle>
            <DialogDescription>
              Upload a <strong>.docx</strong> file containing questions in BDA format. The file will be parsed automatically.
            </DialogDescription>
          </DialogHeader>

          {/* File format guide */}
          {!importPreview && !isParsingFile && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Expected File Format
                </h4>
                <pre className="text-xs text-blue-700 whitespace-pre-wrap font-mono leading-relaxed">
{`Question 1
What is the primary goal of business development?

A. Increase operational costs
B. Build long-term value through partnerships
C. Reduce workforce
D. Avoid market expansion

Correct Answer: B Rationale: Business development focuses on...

Question 2
...`}
                </pre>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• File name should include <strong>BDA-CP</strong> or <strong>BDA-SCP</strong> to auto-detect certification type</p>
                <p>• Include <strong>Direct Knowledge</strong> in header for easy questions, <strong>Advanced</strong> for hard</p>
                <p>• Each question needs 4 options (A, B, C, D) and a Correct Answer line</p>
              </div>
              <Button
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose .docx File
              </Button>
            </div>
          )}

          {/* Parsing indicator */}
          {isParsingFile && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
              <p className="text-gray-600">Parsing Word file...</p>
            </div>
          )}

          {/* Preview */}
          {importPreview && !isParsingFile && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">
                    {importPreview.totalParsed} questions parsed from "{importPreview.fileName}"
                  </span>
                </div>
                <div className="text-sm text-green-700 grid grid-cols-2 gap-1">
                  <span>Certification: <strong>{importPreview.certType}</strong></span>
                  <span>Questions: <strong>{importPreview.totalParsed}</strong></span>
                </div>
              </div>

              {/* Errors */}
              {importPreview.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="font-semibold text-yellow-800">{importPreview.errors.length} parsing warnings</span>
                  </div>
                  <ul className="text-xs text-yellow-700 space-y-1 max-h-24 overflow-y-auto">
                    {importPreview.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Question preview list */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <span className="text-sm font-medium text-gray-700">Preview (first 3 questions)</span>
                </div>
                <div className="divide-y max-h-64 overflow-y-auto">
                  {importPreview.questions.slice(0, 3).map((q, idx) => (
                    <div key={idx} className="p-4">
                      <p className="text-sm font-medium text-gray-800 mb-2">
                        <span className="text-gray-400 mr-2">#{idx + 1}</span>
                        {q.question_text.length > 120 ? q.question_text.slice(0, 120) + '…' : q.question_text}
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                          <div
                            key={letter}
                            className={`text-xs px-2 py-1 rounded ${
                              q.correct_answer === letter
                                ? 'bg-green-100 text-green-700 font-semibold'
                                : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {letter}. {q.options[letter].length > 50 ? q.options[letter].slice(0, 50) + '…' : q.options[letter]}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          q.difficulty === 'easy' ? 'bg-green-100 text-green-700'
                          : q.difficulty === 'hard' ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>{q.difficulty}</span>
                        {q.certification_target && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            q.certification_target === 'CP' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>BDA-{q.certification_target}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {importPreview.questions.length > 3 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      + {importPreview.questions.length - 3} more questions
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => { setImportPreview(null); fileInputRef.current?.click(); }}
              >
                Choose Different File
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsImportDialogOpen(false); setImportPreview(null); }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            {importPreview && (
              <Button
                onClick={handleConfirmImport}
                disabled={isImporting || importPreview.totalParsed === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Import {importPreview.totalParsed} Questions
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <QuestionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={(data) => handleCreate({ ...data, question_set_id: setId! })}
        title="Create Question"
        nextOrderIndex={(questions?.length || 0) + 1}
      />

      {/* Edit Dialog */}
      <QuestionDialog
        open={!!editingQuestion}
        onOpenChange={(open) => !open && setEditingQuestion(null)}
        onSubmit={(data) => editingQuestion && handleUpdate(editingQuestion.id, data)}
        title="Edit Question"
        defaultValues={editingQuestion || undefined}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmQuestion} onOpenChange={(open) => !open && setDeleteConfirmQuestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmQuestion(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmQuestion && handleDelete(deleteConfirmQuestion.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Safely parse options
 */
function safeParseOptions(options: QuestionOption[] | string | null | undefined): QuestionOption[] {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Question Card Component
interface QuestionCardProps {
  question: PracticeQuestion;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}

function QuestionCard({ question, index, onEdit, onDelete, onTogglePublish }: QuestionCardProps) {
  const options: QuestionOption[] = safeParseOptions(question.options);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <GripVertical className="w-4 h-4" />
            <span className="font-mono text-sm">#{index}</span>
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-medium">{question.question_text}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Certification Target Badge */}
          {(question as any).certification_target && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              (question as any).certification_target === 'CP'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {(question as any).certification_target === 'CP' ? 'BDA-CP' : 'BDA-SCP'}
            </span>
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            question.difficulty_level === 'easy' ? 'bg-green-100 text-green-700'
            : question.difficulty_level === 'hard' ? 'bg-red-100 text-red-700'
            : 'bg-yellow-100 text-yellow-700'
          }`}>
            {question.difficulty_level}
          </span>
          <button
            onClick={onTogglePublish}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
              question.is_published
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {question.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2 ml-12">
        {options.map((option) => (
          <div
            key={option.id}
            className={`flex items-center gap-2 p-2 rounded ${
              option.id === question.correct_option_id
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50'
            }`}
          >
            <span className="font-semibold text-gray-600 uppercase text-sm">{option.id}.</span>
            <span className="text-sm text-gray-700">{option.text}</span>
            {option.id === question.correct_option_id && (
              <Check className="w-4 h-4 text-green-600 ml-auto" />
            )}
          </div>
        ))}
      </div>

      {/* Explanation */}
      {question.explanation && (
        <div className="mt-4 ml-12 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Explanation:</strong> {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

// Question Dialog Component
interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PracticeQuestionInsert | PracticeQuestionUpdate) => void;
  title: string;
  defaultValues?: Partial<PracticeQuestion>;
  nextOrderIndex?: number;
}

function QuestionDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
  nextOrderIndex = 1,
}: QuestionDialogProps) {
  const getDefaultOptions = (): QuestionOption[] => {
    const parsedOptions = safeParseOptions(defaultValues?.options);
    if (parsedOptions.length > 0) return parsedOptions;
    return [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ];
  };

  const [formData, setFormData] = useState({
    question_text: defaultValues?.question_text || '',
    question_type: defaultValues?.question_type || 'multiple_choice',
    options: getDefaultOptions(),
    correct_option_id: defaultValues?.correct_option_id || 'a',
    explanation: defaultValues?.explanation || '',
    difficulty_level: defaultValues?.difficulty_level || 'medium',
    order_index: defaultValues?.order_index || nextOrderIndex,
    tags: defaultValues?.tags || [],
    points: defaultValues?.points || 1,
    is_published: defaultValues?.is_published ?? true,
    certification_target: (defaultValues as any)?.certification_target ?? null as 'CP' | 'SCP' | null,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        question_text: defaultValues?.question_text || '',
        question_type: defaultValues?.question_type || 'multiple_choice',
        options: getDefaultOptions(),
        correct_option_id: defaultValues?.correct_option_id || 'a',
        explanation: defaultValues?.explanation || '',
        difficulty_level: defaultValues?.difficulty_level || 'medium',
        order_index: defaultValues?.order_index || nextOrderIndex,
        tags: defaultValues?.tags || [],
        certification_target: (defaultValues as any)?.certification_target ?? null as 'CP' | 'SCP' | null,
        points: defaultValues?.points || 1,
        is_published: defaultValues?.is_published ?? true,
      });
    }
  }, [open, defaultValues, nextOrderIndex]);

  const updateOption = (index: number, text: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], text };
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = () => {
    if (!formData.question_text) {
      toast.error('Question text is required');
      return;
    }
    if (!formData.options.every((opt) => opt.text)) {
      toast.error('All options must have text');
      return;
    }

    const submitData: PracticeQuestionInsert = {
      question_text: formData.question_text,
      question_text_ar: null,
      question_type: formData.question_type as any,
      options: formData.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        text_ar: undefined,
      })),
      correct_option_id: formData.correct_option_id,
      explanation: formData.explanation || null,
      explanation_ar: null,
      difficulty_level: formData.difficulty_level as any,
      order_index: formData.order_index,
      tags: formData.tags,
      points: formData.points,
      is_published: formData.is_published,
      certification_target: formData.certification_target,
    };

    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700">🇬🇧 English</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question Text */}
          <div>
            <Label>Question Text *</Label>
            <Textarea
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              placeholder="Enter question text"
              rows={3}
            />
          </div>

          {/* Options */}
          <div>
            <Label>Answer Options *</Label>
            <div className="space-y-2 mt-2">
              {formData.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, correct_option_id: option.id })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      formData.correct_option_id === option.id
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {option.id.toUpperCase()}
                  </button>
                  <Input
                    value={option.text}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${option.id.toUpperCase()}`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Click the letter to mark as correct answer</p>
          </div>

          {/* Explanation */}
          <div>
            <Label>Explanation (shown after answering)</Label>
            <Textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Explain why the correct answer is correct"
              rows={2}
            />
          </div>

          {/* Certification Target */}
          <div>
            <Label>Certification Target</Label>
            <Select
              value={formData.certification_target ?? 'both'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  certification_target: value === 'both' ? null : (value as 'CP' | 'SCP'),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select certification target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both CP &amp; SCP</SelectItem>
                <SelectItem value="CP">BDA-CP Only</SelectItem>
                <SelectItem value="SCP">BDA-SCP Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              &quot;Both&quot; means the question appears for all certification levels.
            </p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Difficulty</Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Points</Label>
              <Input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Order</Label>
              <Input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
            />
            <Label>Published</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {defaultValues?.question_text ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
