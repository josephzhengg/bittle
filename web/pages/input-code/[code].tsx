import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { getQuestions } from '@/utils/supabase/queries/question';
import { useSupabase } from '@/lib/supabase';
import {
  createFormSubmission,
  createQuestionResponse,
  createReponseOptionSelection,
  getFormIdByCode
} from '@/utils/supabase/queries/form';
import { Question } from '@/utils/supabase/models/question';
import QuestionnaireCard from '@/components/questionnaire-components/questionnaire-card';
import { useState } from 'react';

export default function QuestionnairePage() {
  const supabase = useSupabase();
  const router = useRouter();
  const { code: formCode } = router.query;

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const {
    data: formId,
    isLoading: isLoadingForm,
    error: formError
  } = useQuery({
    queryKey: ['questionnaireForm', formCode],
    queryFn: async () => {
      if (typeof formCode !== 'string') throw new Error('Invalid form code');
      return getFormIdByCode(supabase, formCode);
    },
    enabled: typeof formCode === 'string'
  });

  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
    error: questionsError
  } = useQuery({
    queryKey: ['questionnaireQuestions', formId],
    queryFn: async () => {
      if (!formId) return [];
      return getQuestions(supabase, formId);
    },
    enabled: !!formId
  });

  const handleAnswerChange = (
    questionId: string,
    answer: string | string[]
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (!formId || !questionsData) return;

    setSubmitting(true);
    try {
      const submissionData = await createFormSubmission(supabase, formId);
      const form_submission_id = submissionData.id;

      for (const [questionId, answer] of Object.entries(answers)) {
        const question = questionsData.find((q) => q.id === questionId);
        if (!question) continue;

        if (question.type === 'FREE_RESPONSE') {
          await createQuestionResponse(
            supabase,
            formId,
            questionId,
            answer as string,
            form_submission_id
          );
        } else {
          const response = await createQuestionResponse(
            supabase,
            formId,
            questionId,
            null,
            form_submission_id
          );

          const response_id = response.id;
          const selectedOptions = Array.isArray(answer) ? answer : [answer];

          for (const optionId of selectedOptions) {
            await createReponseOptionSelection(
              supabase,
              response_id,
              optionId,
              form_submission_id
            );
          }
        }
      }

      alert('Form submitted successfully!');
      setAnswers({});
    } catch (error) {
      console.error('Submission failed:', error);
      alert('There was an error submitting the form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoadingForm || isLoadingQuestions) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading form and questions...</div>
      </div>
    );
  }

  if (formError || questionsError) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-500">
        {formError && <div>Error loading form: {formError.message}</div>}
        {questionsError && (
          <div>Error loading questions: {questionsError.message}</div>
        )}
      </div>
    );
  }

  if (!questionsData || questionsData.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        No questions found for this form.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {questionsData.map((question: Question) => (
          <QuestionnaireCard
            key={question.id}
            question={question}
            onAnswerChange={handleAnswerChange}
          />
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600 mb-4">
          Progress: {Object.keys(answers).length} of {questionsData.length}{' '}
          questions answered
        </p>

        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
