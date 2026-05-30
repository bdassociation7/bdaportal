/**
 * Lesson Table Component
 * Lesson display table with actions
 */

import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  CheckCircle,
  Circle,
  FileQuestion,
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
              <TableHead className="w-20 text-center">{t('curriculum.quiz')}</TableHead>
              <TableHead className="w-24 text-center">{t('common.status')}</TableHead>
              <TableHead className="w-32">{t('common.created')}</TableHead>
              <TableHead className="w-40 text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.map((lesson) => (
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
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
