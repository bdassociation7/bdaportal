/**
 * Lesson Table Component
 * Lesson display table with actions
 */

import { useState } from 'react';
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  FileQuestion,
  Copy,
  Check,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Lesson } from '@/entities/curriculum';
import { formatDate } from '@/lib/utils';

interface LessonTableProps {
  lessons: Lesson[];
  onEdit: (lessonId: string) => void;
  onDelete: (lessonId: string) => void;
  onTogglePublished: (lessonId: string, isPublished: boolean) => void;
}

/**
 * Compute the expected Word filename for a lesson.
 * Format: M<module_order_padded2>_L<lesson_order>_<EN|AR>.docx
 * e.g.  M09_L1_EN.docx  |  M01_L3_AR.docx
 */
function getExpectedFilename(lesson: Lesson): string | null {
  const moduleOrder = lesson.module?.order_index;
  const lessonOrder = lesson.order_index;
  const lang = (lesson.exam_language ?? lesson.module?.exam_language ?? 'en').toUpperCase();
  if (!moduleOrder) return null;
  return `M${String(moduleOrder).padStart(2, '0')}_L${lessonOrder}_${lang}.docx`;
}

/** Small inline copy-to-clipboard button */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy filename"
      className="ml-1 p-0.5 rounded text-gray-400 hover:text-gray-700 transition-colors"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function LessonTable({
  lessons,
  onEdit,
  onDelete,
  onTogglePublished,
}: LessonTableProps) {
  const { t } = useLanguage();

  const getOrderBadgeColor = (order: number) => {
    switch (order) {
      case 1:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 2:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 3:
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getSectionBadge = (sectionType: string) => {
    if (sectionType === 'knowledge_based') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          {t('curriculum.knowledgeShort')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
        {t('curriculum.behaviouralShort')}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t('lessons.order')}</TableHead>
              <TableHead>{t('lessons.lessonTitle')}</TableHead>
              <TableHead>{t('lessons.moduleCompetency')}</TableHead>
              <TableHead className="w-24">{t('curriculum.section')}</TableHead>
              {/* Expected Word Filename column */}
              <TableHead className="w-44">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted">
                      Expected File
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Expected Word filename for auto-import.<br />
                    Format: <code>M&lt;module&gt;_L&lt;lesson&gt;_&lt;EN|AR&gt;.docx</code>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="w-20 text-center">{t('curriculum.quiz')}</TableHead>
              <TableHead className="w-24 text-center">{t('common.status')}</TableHead>
              <TableHead className="w-32">{t('common.created')}</TableHead>
              <TableHead className="w-40 text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.map((lesson) => {
              const expectedFile = getExpectedFilename(lesson);
              return (
                <TableRow key={lesson.id}>
                  {/* Order */}
                  <TableCell>
                    <Badge className={getOrderBadgeColor(lesson.order_index)}>
                      {lesson.order_index}
                    </Badge>
                  </TableCell>

                  {/* Title */}
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm">{lesson.title}</span>
                      {lesson.title_ar && (
                        <span className="text-xs text-muted-foreground" dir="rtl">
                          {lesson.title_ar}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Module */}
                  <TableCell>
                    {lesson.module ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {lesson.module.competency_name}
                        </span>
                        {lesson.module.competency_name_ar && (
                          <span className="text-xs text-muted-foreground" dir="rtl">
                            {lesson.module.competency_name_ar}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Section */}
                  <TableCell>
                    {lesson.module ? getSectionBadge(lesson.module.section_type) : '-'}
                  </TableCell>

                  {/* Expected Filename */}
                  <TableCell>
                    {expectedFile ? (
                      <div className="flex items-center gap-0.5">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono">
                          {expectedFile}
                        </code>
                        <CopyButton text={expectedFile} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Quiz */}
                  <TableCell className="text-center">
                    {lesson.lesson_quiz_id ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('lessons.quizConfigured')}</p>
                          {lesson.quiz && <p className="text-xs">{lesson.quiz.title}</p>}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger>
                          <FileQuestion className="h-5 w-5 text-yellow-600 mx-auto" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('lessons.noQuizConfigured')}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>

                  {/* Publication Status */}
                  <TableCell className="text-center">
                    {lesson.is_published ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {t('curriculum.published')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                        {t('curriculum.draft')}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Creation date */}
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(lesson.created_at)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(lesson.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('lessons.editLesson')}</TooltipContent>
                      </Tooltip>

                      {/* Toggle Publication */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onTogglePublished(lesson.id, lesson.is_published)
                            }
                          >
                            {lesson.is_published ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {lesson.is_published ? t('curriculum.unpublish') : t('curriculum.publish')}
                        </TooltipContent>
                      </Tooltip>

                      {/* Delete */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(lesson.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('lessons.deleteLesson')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
