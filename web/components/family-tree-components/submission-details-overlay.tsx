import React, { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, User, FileText } from 'lucide-react';
import {
  getQuestionResponse,
  getResponseOptionSelection
} from '@/utils/supabase/queries/response';
import { getQuestions } from '@/utils/supabase/queries/question';
import { Question } from '@/utils/supabase/models/question';
import { QuestionResponse } from '@/utils/supabase/models/question-response';
import { ResponseOptionSelection } from '@/utils/supabase/models/response-option-selection';
import { QuestionOption } from '@/utils/supabase/models/question-option';
import { toast } from 'sonner';

interface SubmissionDetailsOverlayProps {
  formSubmissionId: string | null;
  formId: string;
  allOptions: Record<string, QuestionOption[]>;
  onClose: () => void;
}

const SubmissionDetailsOverlay: React.FC<SubmissionDetailsOverlayProps> = ({
  formSubmissionId,
  formId,
  allOptions,
  onClose
}) => {
  const supabase = useSupabase();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [optionSelections, setOptionSelections] = useState<
    ResponseOptionSelection[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissionDetails = async () => {
      if (!formSubmissionId || !formId) {
        setError('Invalid submission or form ID');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [questionsData, responsesData, selectionsData] =
          await Promise.all([
            getQuestions(supabase, formId),
            getQuestionResponse(supabase, formSubmissionId),
            getResponseOptionSelection(supabase, formSubmissionId)
          ]);

        setQuestions(questionsData.sort((a, b) => a.index - b.index));
        setResponses(responsesData);
        setOptionSelections(selectionsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast.error('Failed to load submission details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissionDetails();
  }, [supabase, formSubmissionId, formId]);

  const getResponseForQuestion = (questionId: string) => {
    const response = responses.find((r) => r.question_id === questionId);
    if (!response) {
      return 'No response';
    }
    if (response.free_text) {
      return response.free_text;
    }
    const selections = optionSelections
      .filter((s) => s.response_id === response.id)
      .map((s) => {
        const option = allOptions[questionId]?.find(
          (opt) => opt.id === s.option_id
        );
        return option?.label || 'Unknown option';
      })
      .filter((label) => label.trim());
    return selections.length > 0 ? selections.join(', ') : 'No response';
  };

  //   const getQuestionTypeIcon = (type: string) => {
  //     switch (type) {
  //       case 'FREE_RESPONSE':
  //         return <FileText className="w-4 h-4" />;
  //       case 'MULTIPLE_CHOICE':
  //         return <CheckCircle className="w-4 h-4" />;
  //       case 'SELECT_ALL':
  //         return <CheckCircle className="w-4 h-4" />;
  //       default:
  //         return <FileText className="w-4 h-4" />;
  //     }
  //   };

  //   const getQuestionTypeLabel = (type: string) => {
  //     switch (type) {
  //       case 'FREE_RESPONSE':
  //         return 'Text Response';
  //       case 'MULTIPLE_CHOICE':
  //         return 'Multiple Choice';
  //       case 'SELECT_ALL':
  //         return 'Select All';
  //       default:
  //         return 'Unknown';
  //     }
  //   };

  return (
    <div className="submission-box" onClick={(e) => e.stopPropagation()}>
      <div className="submission-box-content">
        <Button
          className="submission-box-close hover:bg-gray-200 transition-all duration-300"
          onClick={onClose}>
          <X className="w-4 h-4 text-gray-700" />
        </Button>
        <Card className="submission-box-card">
          <CardHeader className="submission-box-card-header">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-800">
                  Submission Details
                </CardTitle>
                <p className="text-gray-600 text-xs mt-1">
                  Response ID: {formSubmissionId?.slice(-8)}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="submission-box-card-content p-4 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="submission-box-table">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {[...Array(3)].map((_, i) => (
                        <th
                          key={i}
                          className="text-left p-2 text-gray-700 font-medium">
                          <Skeleton className="h-4 w-20 bg-gray-200" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[...Array(3)].map((_, i) => (
                        <td key={i} className="p-2 text-gray-600 text-sm">
                          <Skeleton className="h-4 w-24 bg-gray-200" />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : error ? (
              <div className="submission-box-error text-center py-6">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : questions.length > 0 ? (
              <div className="submission-box-table">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {questions.map((question, index) => (
                        <th
                          key={question.id}
                          className="text-left p-2 text-gray-700 font-medium text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full">
                              #{index + 1}
                            </span>
                            <span className="truncate">{question.prompt}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {questions.map((question) => {
                        const response = getResponseForQuestion(question.id);
                        const hasResponse = response !== 'No response';

                        return (
                          <td
                            key={question.id}
                            className="p-2 text-gray-700 text-sm align-top">
                            <div
                              className={`p-2 rounded-lg border transition-all duration-300 ${
                                hasResponse
                                  ? 'bg-green-50 border-green-200 text-gray-800'
                                  : 'bg-red-50 border-red-200 text-gray-500'
                              }`}>
                              {hasResponse ? (
                                <span className="whitespace-pre-wrap">
                                  {response}
                                </span>
                              ) : (
                                <span className="italic">No response</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-gray-800 text-sm font-medium mb-1">
                  No Responses Found
                </h3>
                <p className="text-gray-600 text-xs">
                  This submission doesn&apos;t contain any responses yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubmissionDetailsOverlay;
