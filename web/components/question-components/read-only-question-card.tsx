import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getOptions } from '@/utils/supabase/queries/question';
import { useSupabase } from '@/lib/supabase';
import type { Question } from '@/utils/supabase/models/question';

export type ReadOnlyQuestionCardProps = {
  question: Question;
  displayNumber: number | null;
};

export default function ReadOnlyQuestionCard({
  question,
  displayNumber
}: ReadOnlyQuestionCardProps) {
  const supabase = useSupabase();

  const getQuestionTypeDisplay = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return 'Multiple Choice';
      case 'SELECT_ALL':
        return 'Select All That Apply';
      case 'FREE_RESPONSE':
        return 'Free Response';
      case 'SECTION_HEADER':
        return 'Section Header';
      default:
        return type;
    }
  };

  const { data: questionOptions } = useQuery({
    queryKey: ['options', question.id],
    queryFn: () => getOptions(supabase, question.id),
    enabled:
      !!question.id &&
      (question.type === 'MULTIPLE_CHOICE' || question.type === 'SELECT_ALL')
  });

  if (question.type === 'SECTION_HEADER') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {displayNumber
              ? `Section ${displayNumber}: ${question.prompt}`
              : question.prompt}
          </CardTitle>
          {question.description && (
            <CardDescription
              className="mt-1"
              style={{ whiteSpace: 'pre-wrap' }}>
              {question.description}
            </CardDescription>
          )}
        </CardHeader>
      </Card>
    );
  }

  if (question.type === 'MULTIPLE_CHOICE') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Question {displayNumber}: {question.prompt}
          </CardTitle>
          <CardDescription className="mt-1">
            {getQuestionTypeDisplay(question.type)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup disabled>
            {questionOptions?.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={option.id} disabled />
                <Label htmlFor={option.id} className="text-gray-600">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    );
  }

  if (question.type === 'SELECT_ALL') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Question {displayNumber}: {question.prompt}
          </CardTitle>
          <CardDescription className="mt-1">
            {getQuestionTypeDisplay(question.type)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between cursor-not-allowed bg-gray-50"
              disabled>
              Select options...
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (question.type === 'FREE_RESPONSE') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Question {displayNumber}: {question.prompt}
          </CardTitle>
          <CardDescription className="mt-1">
            {getQuestionTypeDisplay(question.type)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Write your response here..."
            disabled
            className="min-h-[100px] bg-gray-50"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unknown Question Type</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Question type `{question.type}` is not supported.</p>
      </CardContent>
    </Card>
  );
}
