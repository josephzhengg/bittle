import { Question } from '@/utils/supabase/models/question';
import { QuestionOption } from '@/utils/supabase/models/question-option';
import { QuestionResponse } from '@/utils/supabase/models/question-response';
import {
  Card,
  CardHeader,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type QuestionCardProps = {
  question: Question;
  questionOption: QuestionOption[];
  questionResponse: QuestionResponse;
};

export default function QuestionCard({
  question,
  questionOption,
  questionResponse
}: QuestionCardProps) {
  if (question.type === 'MULTIPLE_CHOICE') {
    return (
      <Card>
        <CardTitle>
          Question {question.index}: {question.prompt}
        </CardTitle>
        <CardContent>
          <RadioGroup>
            {questionOption.map((question) => (
              <>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={question.label} id={question.label} />
                  <Label htmlFor={question.label}>{question.label}</Label>
                </div>
              </>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    );
  }
}
