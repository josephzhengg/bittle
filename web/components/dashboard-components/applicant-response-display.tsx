import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { Question } from '@/utils/supabase/models/question';
import { ProcessedSubmission } from './[form-code]';
import React from 'react';

interface ApplicantResponseDisplayProps {
  submissions: ProcessedSubmission[];
  questions: Question[];
  onToggleSubmission?: (submissionId: string) => void;
}

const ApplicantResponseDisplay = ({ submissions, questions, onToggleSubmission }: ApplicantResponseDisplayProps) => {
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());

  const toggleSubmission = useCallback((submissionId: string) => {
    setExpandedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
    if (onToggleSubmission) onToggleSubmission(submissionId);
  }, [onToggleSubmission]);

  const formatQuestionType = (type: string) => {
    const typeMap: Record<string, string> = {
      FREE_RESPONSE: 'Free Response',
      MULTIPLE_CHOICE: 'Multiple Choice',
      SELECT_ALL: 'Select All',
    };
    return typeMap[type] || type;
  };

  const MobileResponseCard = ({ submission, index }: { submission: ProcessedSubmission; index: number }) => {
    const isExpanded = expandedSubmissions.has(submission.id);

    return (
      <Card className="w-full">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSubmission(submission.id)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div>
                <div className="font-medium text-sm">{format(new Date(submission.submittedAt), 'MMM d, yyyy')}</div>
                <div className="text-muted-foreground text-xs">{format(new Date(submission.submittedAt), 'h:mm a')}</div>
              </div>
            </div>
            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground leading-tight">{question.prompt}</div>
                      <Badge className={`text-xs mt-1 ${
                        question.type === 'MULTIPLE_CHOICE' ? 'bg-blue-100 text-blue-800'
                        : question.type === 'SELECT_ALL' ? 'bg-red-100 text-red-800'
                        : 'bg-purple-100 text-purple-800'
                      }`}>{formatQuestionType(question.type)}</Badge>
                    </div>
                  </div>
                  <div className="ml-0">
                    {submission.responses[question.id] ? (
                      question.type === 'FREE_RESPONSE' ? (
                        <div className="text-sm p-3 bg-muted/30 rounded-md break-words whitespace-pre-wrap">
                          {submission.responses[question.id]}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {submission.responses[question.id].split(', ').filter((option) => option.trim()).map((option, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{option.trim()}</Badge>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="text-muted-foreground text-xs italic p-2 bg-muted/20 rounded-md text-center">No response</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block w-full overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/80 border-b-2">
                <TableHead className="w-16 text-center font-semibold py-4">#</TableHead>
                <TableHead className="w-40 font-semibold py-4">
                  <div className="flex items-center gap-2"><span className="w-4 h-4" />Date</div>
                </TableHead>
                {questions.map((question) => (
                  <TableHead key={question.id} className="min-w-[200px] font-semibold py-4">
                    <div className="space-y-2">
                      <div className="font-medium text-sm leading-tight break-words">{question.prompt}</div>
                      <Badge className={`text-xs px-2 py-1 rounded font-medium ${
                        question.type === 'MULTIPLE_CHOICE' ? 'bg-blue-100 text-blue-800'
                        : question.type === 'SELECT_ALL' ? 'bg-red-100 text-red-800'
                        : 'bg-purple-100 text-purple-800'
                      }`}>{formatQuestionType(question.type)}</Badge>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission, index) => (
                <TableRow key={submission.id} className="hover:bg-muted/20 transition-colors border-b border-border/50 last:border-b-0">
                  <TableCell className="text-center font-medium text-muted-foreground py-6">{index + 1}</TableCell>
                  <TableCell className="p-6">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{format(new Date(submission.submittedAt), 'MMM d, yyyy')}</div>
                      <div className="text-muted-foreground text-xs">{format(new Date(submission.submittedAt), 'h:mm a')}</div>
                    </div>
                  </TableCell>
                  {questions.map((question) => (
                    <TableCell key={question.id} className="p-6 align-top">
                      <div className="min-h-[50px] flex items-start">
                        {submission.responses[question.id] ? (
                          <div className="w-full">
                            {question.type === 'FREE_RESPONSE' ? (
                              <div className="text-sm leading-relaxed break-words whitespace-pre-wrap max-h-32 overflow-y-auto p-3 bg-muted/30 rounded-md">
                                {submission.responses[question.id]}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {submission.responses[question.id].split(', ').filter((option) => option.trim()).map((option, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">{option.trim()}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full flex items-center justify-center text-muted-foreground text-xs italic py-4 bg-muted/20 rounded-md">No response</div>
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {submissions.map((submission, index) => (
          <MobileResponseCard key={submission.id} submission={submission} index={index} />
        ))}
      </div>
    </>
  );
};

export default ApplicantResponseDisplay;