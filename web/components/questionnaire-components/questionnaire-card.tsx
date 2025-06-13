import { useSupabase } from '@/lib/supabase';
import { Question } from '@/utils/supabase/models/question';
import { useQuery } from '@tanstack/react-query';
import { getOptions } from '@/utils/supabase/queries/question';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ChevronsUpDown, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export type QuestionnaireCardProps = {
  question: Question;
  onAnswerChange?: (questionId: string, answer: string | string[]) => void;
  currentAnswer?: string | string[];
};

export default function QuestionnaireCard({
  question,
  onAnswerChange,
  currentAnswer
}: QuestionnaireCardProps) {
  const supabase = useSupabase();
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState<string>('');

  // Sync with current answer prop
  useEffect(() => {
    if (currentAnswer !== undefined) {
      if (question.type === 'MULTIPLE_CHOICE') {
        setSelectedValue((currentAnswer as string) || '');
      } else if (question.type === 'SELECT_ALL') {
        setSelectedValues((currentAnswer as string[]) || []);
      } else if (question.type === 'FREE_RESPONSE') {
        setTextAnswer((currentAnswer as string) || '');
      }
    }
  }, [currentAnswer, question.type]);

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

  // Helper function to format question type for display
  const getQuestionTypeDisplay = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return 'Choose one option';
      case 'SELECT_ALL':
        return 'Select all that apply';
      case 'FREE_RESPONSE':
        return 'Write your response';
      default:
        return type;
    }
  };

  if (
    isLoading &&
    (question.type === 'MULTIPLE_CHOICE' || question.type === 'SELECT_ALL')
  ) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-white/20 rounded w-3/4"></div>
          <div className="h-4 bg-white/20 rounded w-1/2"></div>
          <div className="space-y-3">
            <div className="h-12 bg-white/20 rounded"></div>
            <div className="h-12 bg-white/20 rounded"></div>
            <div className="h-12 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <div className="text-center text-white">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-red-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Error loading options</h3>
          <p className="text-red-200">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // Multiple Choice Implementation
  if (question.type === 'MULTIPLE_CHOICE') {
    const handleRadioChange = (value: string) => {
      setSelectedValue(value);
      onAnswerChange?.(question.id, value);
    };

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-semibold text-white mb-2">
              {question.prompt}
            </h3>
            <Badge
              variant="outline"
              className="border-blue-400/40 text-blue-200 bg-blue-500/10">
              {getQuestionTypeDisplay(question.type)}
            </Badge>
          </div>

          <RadioGroup value={selectedValue} onValueChange={handleRadioChange}>
            {questionOption?.map((option) => {
              const isSelected = selectedValue === option.id;
              return (
                <div
                  key={option.id}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-blue-400/60 shadow-lg'
                      : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
                  }`}
                  onClick={() => handleRadioChange(option.id)}>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label
                      htmlFor={option.id}
                      className="text-lg text-white cursor-pointer flex-1">
                      {option.label}
                    </Label>
                    {isSelected && <Check className="h-5 w-5 text-blue-300" />}
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      </div>
    );
  }

  // Enhanced Select All Implementation with cohesive blue-purple theme
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
      return `${selectedValues.length} options selected`;
    };

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-semibold text-white mb-2">
              {question.prompt}
            </h3>
            <Badge
              variant="outline"
              className="border-blue-400/40 text-blue-200 bg-blue-500/10">
              {getQuestionTypeDisplay(question.type)}
            </Badge>
          </div>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={`w-full justify-between text-left h-auto py-4 px-4 ${
                  selectedValues.length > 0
                    ? 'bg-gradient-to-r from-blue-500/25 to-purple-500/25 border-blue-400/50 text-white shadow-md hover:shadow-lg hover:from-blue-500/30 hover:to-purple-500/30'
                    : 'bg-white/10 border-white/30 text-white/80 hover:bg-white/20 hover:border-white/40'
                }`}>
                <div className="flex items-center gap-2">
                  {selectedValues.length > 0 && (
                    <Badge className="bg-blue-500/80 text-white border-blue-400/50 text-xs px-2 py-1">
                      {selectedValues.length}
                    </Badge>
                  )}
                  <span className="truncate">{getSelectedLabels()}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-slate-900/95 backdrop-blur-lg border border-blue-400/30">
              <Command className="bg-transparent">
                <CommandInput
                  placeholder="Search options..."
                  className="text-white placeholder:text-blue-200/60 border-b border-blue-400/20"
                />
                <CommandEmpty className="text-blue-200/80 py-6 text-center">
                  No options found.
                </CommandEmpty>
                <CommandGroup>
                  <CommandList className="max-h-64">
                    {questionOption?.map((option) => (
                      <CommandItem
                        key={option.id}
                        onSelect={() => toggleOption(option.id)}
                        className={`text-lg py-4 px-4 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedValues.includes(option.id)
                            ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white border border-blue-400/40 shadow-md'
                            : 'text-blue-100/90 hover:bg-blue-500/15 hover:text-white'
                        }`}>
                        <div className="flex items-center justify-between w-full">
                          <span>{option.label}</span>
                          {selectedValues.includes(option.id) && (
                            <Check className="h-4 w-4 text-blue-300" />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandList>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Cohesive selected items display with blue-purple theme */}
          {selectedValues.length > 0 && (
            <div className="space-y-4">
              <div className="bg-blue-900/40 backdrop-blur-sm rounded-xl p-4 border border-blue-400/40 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-white font-semibold text-sm">
                    Selected options:
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedValues([]);
                      onAnswerChange?.(question.id, []);
                    }}
                    className="text-white bg-blue-600/80 hover:text-white hover:bg-blue-500 text-xs px-3 py-1.5 h-auto border border-blue-400/60 shadow-sm font-medium">
                    Clear all
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedValues.map((valueId) => {
                    const option = questionOption?.find(
                      (opt) => opt.id === valueId
                    );
                    return (
                      <Badge
                        key={valueId}
                        variant="secondary"
                        className="bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white border-blue-400/60 hover:from-blue-500/90 hover:to-purple-500/90 transition-all duration-200 px-3 py-1.5 text-sm font-semibold shadow-md">
                        {option?.label}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOption(valueId);
                          }}
                          className="text-blue-100 hover:text-white transition-colors ml-2 hover:bg-white/30 rounded-full p-0.5">
                          <X className="h-3 w-3 stroke-2" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Free Response Implementation
  else if (question.type === 'FREE_RESPONSE') {
    const handleTextChange = (value: string) => {
      setTextAnswer(value);
      onAnswerChange?.(question.id, value);
    };

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-semibold text-white mb-2">
              {question.prompt}
            </h3>
            <Badge
              variant="outline"
              className="border-blue-400/40 text-blue-200 bg-blue-500/10">
              {getQuestionTypeDisplay(question.type)}
            </Badge>
          </div>

          <div className="space-y-3">
            <Textarea
              placeholder="Type your response here..."
              value={textAnswer}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-[120px] text-lg bg-white/5 border-white/20 text-white placeholder:text-blue-200/60 focus:border-pink-300/50 focus:ring-pink-300/20 resize-none"
            />
            {textAnswer && (
              <div className="mt-3 text-right animate-fade-in">
                <Badge
                  variant="outline"
                  className="border-blue-400/40 text-blue-200 bg-blue-500/10">
                  {textAnswer.length} characters
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unknown question types
  else {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <div className="text-center text-white">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-blue-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Unknown Question Type</h3>
          <p className="text-blue-200">
            Question type &quot;{question.type}&quot; is not supported.
          </p>
        </div>
      </div>
    );
  }
}
