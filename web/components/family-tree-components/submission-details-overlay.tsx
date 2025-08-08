import React, { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  X,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Paperclip
} from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const getResponseForQuestion = (questionId: string, questionType: string) => {
    if (questionType === 'SECTION_HEADER') {
      return { text: '', hasResponse: true };
    }
    const response = responses.find((r) => r.question_id === questionId);
    if (!response) {
      return { text: 'No response', hasResponse: false };
    }
    if (response.free_text) {
      return { text: response.free_text, hasResponse: true };
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
    return {
      text: selections.length > 0 ? selections.join(', ') : 'No response',
      hasResponse: selections.length > 0
    };
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'FREE_RESPONSE':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'MULTIPLE_CHOICE':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'SELECT_ALL':
        return <CheckCircle2 className="w-4 h-4 text-purple-600" />;
      case 'SECTION_HEADER':
        return <Paperclip className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'FREE_RESPONSE':
        return 'Text Response';
      case 'MULTIPLE_CHOICE':
        return 'Multiple Choice';
      case 'SELECT_ALL':
        return 'Select All';
      case 'SECTION_HEADER':
        return 'Section Header';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col">
      {/* Floating Panel */}
      <div
        className={`bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-2xl transition-all duration-300 ease-out ${
          isCollapsed ? 'w-14' : 'w-96'
        }`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Submission Details
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  ID: {formSubmissionId?.slice(-8)}
                </p>
              </div>
            </div>
          )}
          <div
            className={`flex items-center ${
              isCollapsed ? 'justify-center w-full' : 'space-x-1'
            }`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`rounded-full hover:bg-gray-100 transition-colors ${
                isCollapsed ? 'p-6' : 'p-1.5'
              }`}>
              <GripVertical
                className={`text-gray-500 ${
                  isCollapsed ? 'w-8 h-8' : 'w-4 h-4'
                }`}
              />
            </Button>
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </Button>
            )}
          </div>
        </div>
        {/* Content */}
        <div
          className={`transition-all duration-300 ${
            isCollapsed ? 'h-0 overflow-hidden' : 'h-auto'
          }`}>
          {!isCollapsed && <div className="border-t border-gray-100/50"></div>}
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-4">
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-3/4 bg-gray-200" />
                      <Skeleton className="h-16 w-full bg-gray-100" />
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="w-12 h-12 mb-3 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2 text-center">
                  Error Loading Details
                </h3>
                <p className="text-xs text-gray-600 text-center">{error}</p>
              </div>
            ) : questions.length > 0 ? (
              <div className="p-4 space-y-4">
                {questions.map((question, index) => {
                  const response = getResponseForQuestion(
                    question.id,
                    question.type
                  );
                  return (
                    <div
                      key={question.id}
                      className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 hover:shadow-md transition-all duration-200">
                      {/* Question Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-medium">
                            {index + 1}
                          </span>
                          <div className="flex items-center space-x-1">
                            {getQuestionTypeIcon(question.type)}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 text-gray-600 font-medium border border-gray-200">
                              {getQuestionTypeLabel(question.type)}
                            </span>
                          </div>
                        </div>
                        {question.type !== 'SECTION_HEADER' && (
                          <div className="flex-shrink-0">
                            {response.hasResponse ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-orange-400" />
                            )}
                          </div>
                        )}
                      </div>
                      {/* Question Text */}
                      <h4 className="text-xs font-medium text-gray-900 mb-3 leading-relaxed">
                        {question.prompt}
                      </h4>
                      {/* Response */}
                      {question.type !== 'SECTION_HEADER' && (
                        <div
                          className={`p-3 rounded-lg border transition-all duration-200 ${
                            response.hasResponse
                              ? 'bg-green-50/80 border-green-200 text-gray-800'
                              : 'bg-orange-50/80 border-orange-200 text-gray-600'
                          }`}>
                          {response.hasResponse ? (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">
                              {response.text}
                            </p>
                          ) : (
                            <p className="text-xs italic text-gray-500">
                              No response provided
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="w-12 h-12 mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2 text-center">
                  No Responses Found
                </h3>
                <p className="text-xs text-gray-600 text-center">
                  This submission doesn&apos;t contain any responses yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetailsOverlay;
