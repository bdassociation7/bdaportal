import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AdminFilterCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  onReset?: () => void;
  showReset?: boolean;
}

/**
 * Standardised filter card component for admin pages
 * Provides consistent styling and reset functionality
 */
export function AdminFilterCard({
  title,
  description,
  children,
  onReset,
  showReset = true,
}: AdminFilterCardProps) {
  const { t } = useLanguage();

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title || t('common.filters')}</CardTitle>
            <CardDescription>{description || t('common.filterDescription')}</CardDescription>
          </div>
          {showReset && onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {t('common.reset')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
