import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { getQuestions } from '@/utils/supabase/queries/question';
import { useSupabase } from '@/lib/supabase';
import {
  createFormSubmission,
  createQuestionResponse,
  createResponseOptionSelection,
  getFormByCode
} from '@/utils/supabase/queries/form';
import QuestionnaireCard from '@/components/questionnaire-components/questionnaire-card';
import { useState } from 'react';
import { getOrganization } from '@/utils/supabase/queries/organization';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle,
  RotateCcw,
  MoveRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function QuestionnairePage() {
  const supabase = useSupabase();
  const router = useRouter();
  const { code: formCode } = router.query;
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    data: formData,
    isLoading: isLoadingForm,
    error: formError
  } = useQuery({
    queryKey: ['questionnaireForm', formCode],
    queryFn: async () => {
      if (typeof formCode !== 'string') throw new Error('Invalid form code');
      return getFormByCode(supabase, formCode);
    },
    enabled: typeof formCode === 'string'
  });

  const { data: authorData } = useQuery({
    queryKey: ['authorData', formCode],
    queryFn: async () => {
      if (typeof formData?.author !== 'string')
        throw new Error('Invalid author');
      return getOrganization(supabase, formData.author);
    },
    enabled: typeof formData?.author === 'string'
  });

  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
    error: questionsError
  } = useQuery({
    queryKey: ['questionnaireQuestions', formData?.id],
    queryFn: async () => {
      if (!formData?.id) return [];
      const questions = await getQuestions(supabase, formData.id);

      return questions.sort((a, b) => a.index - b.index);
    },
    enabled: !!formData?.id
  });

  const isQuestionAnswered = (questionId: string, questionType: string) => {
    if (questionType === 'SECTION_HEADER') {
      return true;
    }
    const answer = answers[questionId];
    if (!answer) return false;
    if (questionType === 'FREE_RESPONSE') {
      return typeof answer === 'string' && answer.trim().length > 0;
    }
    if (questionType === 'MULTIPLE_CHOICE') {
      return typeof answer === 'string' && answer.length > 0;
    }
    if (questionType === 'SELECT_ALL') {
      return Array.isArray(answer) && answer.length > 0;
    }
    return false;
  };

  const handleAnswerChange = (
    questionId: string,
    answer: string | string[]
  ) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev };
      if (
        !answer ||
        (typeof answer === 'string' && answer.trim().length === 0) ||
        (Array.isArray(answer) && answer.length === 0)
      ) {
        delete newAnswers[questionId];
      } else {
        newAnswers[questionId] = answer;
      }
      return newAnswers;
    });
  };

  const handleNext = () => {
    if (questionsData && currentQuestionIndex < questionsData.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitAgain = () => {
    setShowSuccess(false);
    setAnswers({});
    setCurrentQuestionIndex(0);
  };

  const handleSubmit = async () => {
    if (!formData?.id || !questionsData) return;
    const unansweredQuestions = questionsData.filter(
      (question) => !isQuestionAnswered(question.id, question.type)
    );
    if (unansweredQuestions.length > 0) {
      alert(
        `Please answer all questions before submitting. ${unansweredQuestions.length} question(s) remain unanswered.`
      );
      return;
    }
    setSubmitting(true);
    try {
      const submissionData = await createFormSubmission(supabase, formData.id);
      const form_submission_id = submissionData.id;
      for (const [questionId, answer] of Object.entries(answers)) {
        const question = questionsData.find((q) => q.id === questionId);
        if (!question || question.type === 'SECTION_HEADER') continue;
        if (question.type === 'FREE_RESPONSE') {
          await createQuestionResponse(
            supabase,
            formData.id,
            questionId,
            answer as string,
            form_submission_id
          );
        } else {
          const response = await createQuestionResponse(
            supabase,
            formData.id,
            questionId,
            null,
            form_submission_id
          );
          const response_id = response.id;
          const selectedOptions = Array.isArray(answer) ? answer : [answer];
          for (const optionId of selectedOptions) {
            await createResponseOptionSelection(
              supabase,
              response_id,
              optionId,
              form_submission_id
            );
          }
        }
      }
      setShowSuccess(true);
    } catch {
      toast.error('There was an error submitting the form.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderProgressDots = () => {
    if (!questionsData) return null;
    const totalQuestions = questionsData.length;
    if (totalQuestions > 15) {
      const answeredCount = questionsData.filter((question) =>
        isQuestionAnswered(question.id, question.type)
      ).length;
      return (
        <div className="flex items-center space-x-2">
          <div className="text-xs text-blue-100 font-medium">
            {answeredCount} / {totalQuestions} completed
          </div>
          <div className="w-16 bg-white/20 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="flex space-x-1.5">
        {questionsData.map((question, index) => (
          <div
            key={question.id}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              question.type === 'SECTION_HEADER'
                ? 'bg-blue-400'
                : index === currentQuestionIndex
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 scale-125'
                : isQuestionAnswered(question.id, question.type)
                ? 'bg-green-400'
                : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoadingForm || isLoadingQuestions) {
    return (
      <div className="animated-bg-container">
        <div className="animated-bg-elements">
          <div className="bg-blob-1"></div>
          <div className="bg-blob-2"></div>
          <div className="bg-blob-3"></div>
        </div>
        <div className="relative z-10 h-screen flex items-center justify-center">
          <div className="text-center animate-fade-in-up">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
            <p className="text-xl text-white font-medium">
              Loading your questionnaire...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (formError || questionsError) {
    return (
      <div className="animated-bg-container">
        <div className="animated-bg-elements">
          <div className="bg-blob-1"></div>
          <div className="bg-blob-2"></div>
          <div className="bg-blob-3"></div>
        </div>
        <div className="relative z-10 h-screen flex items-center justify-center">
          <div className="text-center text-red-200 max-w-md animate-fade-in-up">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-red-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            {formError && (
              <div className="mb-2">
                Error loading form: {formError.message}
              </div>
            )}
            {questionsError && (
              <div>Error loading questions: {questionsError.message}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!questionsData || questionsData.length === 0) {
    return (
      <div className="animated-bg-container">
        <div className="animated-bg-elements">
          <div className="bg-blob-1"></div>
          <div className="bg-blob-2"></div>
          <div className="bg-blob-3"></div>
        </div>
        <div className="relative z-10 h-screen flex items-center justify-center px-4">
          <div className="text-center text-white max-w-lg animate-fade-in-up">
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-blue-200 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h1 className="text-3xl font-bold text-white mb-2">
                Oops! No Questions Found
              </h1>
              <div className="h-1 w-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto mb-4"></div>
            </div>
            <p className="text-lg text-blue-100 mb-6 leading-relaxed">
              This form appears to be empty or hasn&#39;t been set up yet.
            </p>
            {authorData && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
                <p className="text-base text-blue-100 leading-relaxed">
                  Please contact{' '}
                  <span className="font-semibold text-white">
                    {authorData.name}
                  </span>
                  {authorData.affiliation && (
                    <>
                      {' '}
                      from{' '}
                      <span className="font-medium text-blue-200">
                        {authorData.affiliation}
                      </span>
                    </>
                  )}
                  <br />
                  if you think this is a mistake!
                </p>
              </div>
            )}
            <button
              onClick={() => {
                router.back();
              }}
              className="flex items-center px-6 py-3 mx-auto rounded-xl font-semibold bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <RotateCcw className="w-5 h-5 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage =
    ((currentQuestionIndex + 1) / questionsData.length) * 100;
  const currentQuestion = questionsData[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questionsData.length - 1;
  const hasAnsweredCurrent =
    currentQuestion &&
    isQuestionAnswered(currentQuestion.id, currentQuestion.type);
  const allQuestionsAnswered = questionsData.every((question) =>
    isQuestionAnswered(question.id, question.type)
  );

  if (showSuccess) {
    return (
      <div className="animated-bg-container">
        <div className="animated-bg-elements">
          <div className="bg-blob-1"></div>
          <div className="bg-blob-2"></div>
          <div className="bg-blob-3"></div>
        </div>
        <div className="relative z-10 h-screen flex items-center justify-center">
          <div className="text-center animate-bounce-in">
            <div className="mb-8">
              <CheckCircle className="w-24 h-24 text-green-400 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-white mb-4">Thank You!</h1>
              <p className="text-xl text-blue-100 mb-8">
                Your responses have been submitted successfully.
              </p>
              <button
                onClick={handleSubmitAgain}
                className="flex items-center px-6 py-3 mx-auto rounded-xl font-semibold bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 mb-4">
                <RotateCcw className="w-5 h-5 mr-2" />
                Submit Again
              </button>
              <button
                onClick={() => router.push('/input-code')}
                className="flex items-center px-6 py-3 mx-auto rounded-xl font-semibold border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                <MoveRight className="w-5 h-5 mr-2" />
                Back to Start
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animated-bg-container">
      <div className="animated-bg-elements">
        <div className="bg-blob-1"></div>
        <div className="bg-blob-2"></div>
        <div className="bg-blob-3"></div>
      </div>
      <div className="relative z-10 w-full max-w-4xl h-screen flex flex-col px-4 py-6 mx-auto">
        <div className="text-center mb-4 animate-fade-in-up flex-shrink-0">
          <div className="mb-3">
            <h1 className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">
              {formData?.title || 'BtL'}
            </h1>
            <div className="h-1.5 w-24 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto mb-3"></div>
            {authorData && (
              <p className="text-sm text-blue-200 font-medium mb-2">
                by {authorData.name}
                {authorData.affiliation && ` – ${authorData.affiliation}`}
              </p>
            )}
          </div>
          <div className="max-w-2xl mx-auto">
            {formData?.description ? (
              <p
                className="text-lg text-blue-100 mb-3 leading-relaxed"
                style={{ whiteSpace: 'pre-wrap' }}>
                {formData.description}
              </p>
            ) : (
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-2 leading-tight">
                Share Your{' '}
                <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Experience
                </span>
              </h2>
            )}
            {currentQuestion.type !== 'SECTION_HEADER' ? (
              <p className="text-base text-blue-100 leading-relaxed">
                Question{' '}
                {
                  questionsData
                    .slice(0, currentQuestionIndex + 1)
                    .filter((q) => q.type !== 'SECTION_HEADER').length
                }{' '}
                of{' '}
                {
                  questionsData.filter((q) => q.type !== 'SECTION_HEADER')
                    .length
                }
              </p>
            ) : (
              <p className="text-base text-blue-100 leading-relaxed">
                Section: {currentQuestion.prompt}
              </p>
            )}
          </div>
        </div>
        <div className="mb-4 animate-slide-in-left flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-100">Progress</span>
            <span className="text-sm font-medium text-blue-100">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center mb-4 overflow-hidden">
          <div className="w-full max-w-2xl h-full flex items-center justify-center">
            {currentQuestion && (
              <div
                key={currentQuestion.id}
                className="animate-question-slide-in w-full max-h-full overflow-auto">
                <QuestionnaireCard
                  question={currentQuestion}
                  onAnswerChange={handleAnswerChange}
                  currentAnswer={answers[currentQuestion.id]}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center animate-fade-in-up flex-shrink-0 pt-2 min-h-[40px]">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className={`flex items-center px-3 sm:px-4 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 text-sm flex-shrink-0 ${
              currentQuestionIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'bg-white/10 backdrop-blur-lg text-white border border-white/20 hover:bg-white/20'
            }`}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </button>
          <div className="flex-1 flex justify-center px-2 sm:px-4">
            {renderProgressDots()}
          </div>
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !allQuestionsAnswered}
              className={`flex items-center px-4 sm:px-6 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 text-sm flex-shrink-0 ${
                allQuestionsAnswered && !submitting
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg hover:shadow-xl'
                  : 'opacity-50 cursor-not-allowed bg-white/10 text-white border border-white/20'
              }`}>
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  <span className="hidden sm:inline">Submitting...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!hasAnsweredCurrent}
              className={`flex items-center px-3 sm:px-4 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 text-sm flex-shrink-0 ${
                hasAnsweredCurrent
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg hover:shadow-xl'
                  : 'opacity-50 cursor-not-allowed bg-white/10 text-white border border-white/20'
              }`}>
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
