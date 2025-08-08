import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Eye, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import React from 'react';

/**
 * Displays statistics cards for a form, including total questions, form code, deadline, and question type breakdown.
 * @param formCode The unique code of the form
 * @param formData Optional form data containing deadline
 * @param stats Optional statistics including total questions and type breakdown
 * @param isPageLoading Boolean indicating if the page is loading
 */
interface FormStatsCardsProps {
  formCode: string;
  formData?: {
    deadline?: string;
  };
  stats?: {
    total: number;
    typeBreakdown: Record<string, number>;
  } | null;
  isPageLoading: boolean;
}

export function FormStatsCards({
  formCode,
  formData,
  stats,
  isPageLoading
}: FormStatsCardsProps) {
  // Helper function to format question type for display
  const formatQuestionType = (type: string) => {
    const typeMap: Record<string, string> = {
      FREE_RESPONSE: 'Free Response',
      MULTIPLE_CHOICE: 'Multiple Choice',
      SELECT_ALL: 'Select All',
      SECTION_HEADER: 'Section Header'
    };
    return typeMap[type] || type;
  };

  // Handle formCode as a string, defaulting to 'N/A' if undefined
  const displayFormCode = typeof formCode === 'string' ? formCode : 'N/A';

  // Safely handle deadline date
  const safeDeadline = formData?.deadline ? new Date(formData.deadline) : null;
  const isValidDate =
    safeDeadline instanceof Date && !isNaN(safeDeadline.getTime());
  const formattedDeadline = isValidDate
    ? format(safeDeadline, 'MMM d, yyyy')
    : 'No deadline';
  const formattedTime = isValidDate ? format(safeDeadline, 'h:mm a') : '';

  return (
    <>
      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText
                className="w-5 h-5 text-purple-600"
                aria-label="Total Questions Icon"
              />
              Total Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPageLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats?.total || 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye
                className="w-5 h-5 text-blue-600"
                aria-label="Form Code Icon"
              />
              Form Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-mono">
              {isPageLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                displayFormCode
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar
                className="w-5 h-5 text-pink-600"
                aria-label="Deadline Icon"
              />
              Deadline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {isPageLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                formattedDeadline
              )}
            </div>
            {formData?.deadline && isValidDate && (
              <div className="text-xs text-muted-foreground mt-1">
                {formattedTime}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Question Types Breakdown Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users
              className="w-5 h-5 text-pink-600"
              aria-label="Question Types Icon"
            />
            Question Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isPageLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : stats?.typeBreakdown ? (
              Object.entries(stats?.typeBreakdown || {}).map(
                ([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {formatQuestionType(type)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  </div>
                )
              )
            ) : (
              <span className="text-sm text-muted-foreground">
                No questions
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
