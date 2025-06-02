import { Question } from '@/utils/supabase/models/question';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOptions } from '@/utils/supabase/queries/question';
import { useSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  deleteQuestion,
  getQuestions,
  reorderQuestions
} from '@/utils/supabase/queries/question';
import { toast } from 'sonner';

export type QuestionCardProps = {
  question: Question;
  onAnswerChange?: (questionId: string, answer: string | string[]) => void;
};

export default function QuestionCard({
  question,
  onAnswerChange
}: QuestionCardProps) {
  const queryUtils = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState<string>('');

  const supabase = useSupabase();

  const {
    data: questionOption,
    isLoading,
    error
  } = useQuery({
    queryKey: ['options', question.id],
    queryFn: () => getOptions(supabase, question.id),
    enabled:
      !!question.id &&
      (question.type === 'MULTIPLE_CHOICE' || question.type === 'SELECT_ALL')
  });

  const handleDelete = async () => {
    try {
      await deleteQuestion(supabase, question.id);

      const remainingQuestions = await getQuestions(supabase, question.form_id);

      remainingQuestions.sort((a, b) => a.index - b.index);

      await reorderQuestions(supabase, remainingQuestions);

      toast.success('Question deleted and reordered successfully.');
    } catch {
      toast.error('Error deleting or reordering questions, please try again');
    } finally {
      await queryUtils.refetchQueries({ queryKey: ['questions'] });
    }
  };

  if (
    isLoading &&
    (question.type === 'MULTIPLE_CHOICE' || question.type === 'SELECT_ALL')
  ) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>
              Question {question.index}: {question.prompt}
            </CardTitle>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              aria-label="Delete question">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p>Loading options...</p>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Question {question.index}: {question.prompt}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading options</p>
        </CardContent>
      </Card>
    );
  }

  // Multiple Choice Implementation
  if (question.type === 'MULTIPLE_CHOICE') {
    const handleRadioChange = (value: string) => {
      setSelectedValue(value);
      onAnswerChange?.(question.id, value);
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>
              Question {question.index}: {question.prompt}
            </CardTitle>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              aria-label="Delete question">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedValue} onValueChange={handleRadioChange}>
            {questionOption?.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    );
  }

  // Select All Implementation (using combobox)
  else if (question.type === 'SELECT_ALL') {
    const toggleOption = (optionId: string) => {
      let newSelectedValues: string[];

      if (selectedValues.includes(optionId)) {
        newSelectedValues = selectedValues.filter((id) => id !== optionId);
      } else {
        newSelectedValues = [...selectedValues, optionId];
      }

      setSelectedValues(newSelectedValues);
      onAnswerChange?.(question.id, newSelectedValues);
    };

    const getSelectedLabels = () => {
      if (selectedValues.length === 0) return 'Select options...';
      if (selectedValues.length === 1) {
        const option = questionOption?.find(
          (opt) => opt.id === selectedValues[0]
        );
        return option?.label || '1 selected';
      }
      return `${selectedValues.length} selected`;
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>
              Question {question.index}: {question.prompt}
            </CardTitle>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              aria-label="Delete question">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between">
                {getSelectedLabels()}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search options..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No options found.</CommandEmpty>
                  <CommandGroup>
                    {questionOption?.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={option.id}
                        onSelect={() => toggleOption(option.id)}>
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedValues.includes(option.id)
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Show selected items */}
          {selectedValues.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedValues.map((valueId) => {
                const option = questionOption?.find(
                  (opt) => opt.id === valueId
                );
                return (
                  <span
                    key={valueId}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md">
                    {option?.label}
                    <button
                      onClick={() => toggleOption(valueId)}
                      className="ml-1 text-blue-600 hover:text-blue-800">
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Free Response Implementation
  else if (question.type === 'FREE_RESPONSE') {
    const handleTextChange = (value: string) => {
      setTextAnswer(value);
      onAnswerChange?.(question.id, value);
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>
              Question {question.index}: {question.prompt}
            </CardTitle>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              aria-label="Delete question">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Textarea
            placeholder="Write your response here..."
            value={textAnswer}
            onChange={(e) => handleTextChange(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>
    );
  }

  // Fallback for unknown question types
  else {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unknown Question Type</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Question type &quot;{question.type}&quot; is not supported.</p>
        </CardContent>
      </Card>
    );
  }
}
