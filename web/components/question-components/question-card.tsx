import { Question } from '@/utils/supabase/models/question';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import {
  ChevronsUpDown,
  Check,
  Edit,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOptions, createOption } from '@/utils/supabase/queries/question';
import { useSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  deleteQuestion,
  getQuestions,
  reorderQuestions,
  updateOption,
  updateQuestion,
  deleteOption
} from '@/utils/supabase/queries/question';
import { toast } from 'sonner';

export type QuestionCardProps = {
  question: Question;
  displayNumber: number | null;
  onAnswerChange?: (questionId: string, answer: string | string[]) => void;
};

export default function QuestionCard({
  question,
  displayNumber,
  onAnswerChange
}: QuestionCardProps) {
  const queryUtils = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState<string>('');

  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(question.prompt);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editedOptionLabel, setEditedOptionLabel] = useState('');
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState('');

  const supabase = useSupabase();

  const { data: questionOption, isLoading } = useQuery({
    queryKey: ['options', question.id],
    queryFn: () => getOptions(supabase, question.id),
    enabled:
      !!question.id &&
      (question.type === 'MULTIPLE_CHOICE' || question.type === 'SELECT_ALL')
  });

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

  const handleSavePrompt = async () => {
    try {
      await updateQuestion(supabase, question.id, editedPrompt);
      setIsEditingPrompt(false);
      toast.success('Question updated successfully.');
      await queryUtils.refetchQueries({ queryKey: ['questions'] });
    } catch {
      toast.error('Error updating question, please try again');
    }
  };

  const handleCancelPromptEdit = () => {
    setEditedPrompt(question.prompt);
    setIsEditingPrompt(false);
  };

  const handleEditOption = (optionId: string, currentLabel: string) => {
    setEditingOptionId(optionId);
    setEditedOptionLabel(currentLabel);
  };

  const handleSaveOption = async (optionId: string) => {
    try {
      await updateOption(supabase, optionId, editedOptionLabel);
      setEditingOptionId(null);
      setEditedOptionLabel('');
      toast.success('Option updated successfully.');
      await queryUtils.refetchQueries({ queryKey: ['options', question.id] });
    } catch {
      toast.error('Error updating option, please try again');
    }
  };

  const handleCancelOptionEdit = () => {
    setEditingOptionId(null);
    setEditedOptionLabel('');
  };

  const handleDeleteOption = async (optionId: string) => {
    if (questionOption && questionOption.length <= 2) {
      toast.error(
        'Cannot delete more options. Questions must have at least two options.'
      );
      return;
    }

    try {
      await deleteOption(supabase, optionId);
      if (selectedValues.includes(optionId)) {
        const newSelectedValues = selectedValues.filter(
          (id) => id !== optionId
        );
        setSelectedValues(newSelectedValues);
        onAnswerChange?.(question.id, newSelectedValues);
      }
      if (selectedValue === optionId) {
        setSelectedValue('');
        onAnswerChange?.(question.id, '');
      }
      toast.success('Option deleted successfully.');
      await queryUtils.refetchQueries({ queryKey: ['options', question.id] });
    } catch {
      toast.error('Error deleting option, please try again');
    }
  };

  const handleAddOption = async () => {
    if (!newOptionLabel.trim()) return;

    try {
      const nextIndex = (questionOption?.length || 0) + 1;
      await createOption(supabase, question.id, [
        {
          question_id: question.id,
          label: newOptionLabel.trim(),
          index: nextIndex
        }
      ]);
      setIsAddingOption(false);
      setNewOptionLabel('');
      toast.success('Option added successfully.');
      await queryUtils.refetchQueries({ queryKey: ['options', question.id] });
    } catch {
      toast.error('Error adding option, please try again');
    }
  };

  const handleCancelAddOption = () => {
    setIsAddingOption(false);
    setNewOptionLabel('');
  };

  if (question.type === 'SECTION_HEADER') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{question.prompt}</CardTitle>
          {question.description && (
            <CardDescription>{question.description}</CardDescription>
          )}
        </CardHeader>
      </Card>
    );
  }

  if (
    isLoading &&
    (question.type === 'MULTIPLE_CHOICE' || question.type === 'SELECT_ALL')
  ) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (question.type === 'MULTIPLE_CHOICE') {
    const handleRadioChange = (value: string) => {
      setSelectedValue(value);
      onAnswerChange?.(question.id, value);
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              {isEditingPrompt ? (
                <div className="space-y-2">
                  <Input
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSavePrompt}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelPromptEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <CardTitle>
                      Question {displayNumber}: {question.prompt}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {getQuestionTypeDisplay(question.type)}
                    </CardDescription>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsEditingPrompt(true)}
                    className="h-6 w-6">
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
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
                <Label htmlFor={option.id}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Edit Options:</h4>
            {questionOption?.map((option) => (
              <div key={option.id} className="flex items-center gap-2 group">
                {editingOptionId === option.id ? (
                  <>
                    <Input
                      value={editedOptionLabel}
                      onChange={(e) => setEditedOptionLabel(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveOption(option.id)}>
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelOptionEdit}>
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{option.label}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleEditOption(option.id, option.label)
                        }
                        className="h-6 w-6">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteOption(option.id)}
                        disabled={questionOption && questionOption.length <= 2}
                        className={cn(
                          'h-6 w-6',
                          questionOption && questionOption.length <= 2
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-500 hover:text-red-700'
                        )}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {isAddingOption ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New option label"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddOption}>
                  <Save className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelAddOption}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingOption(true)}>
                <Plus className="w-3 h-3 mr-1" />
                Add Option
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (question.type === 'SELECT_ALL') {
    const toggleOption = (value: string) => {
      const newSelectedValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      setSelectedValues(newSelectedValues);
      onAnswerChange?.(question.id, newSelectedValues);
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              {isEditingPrompt ? (
                <div className="space-y-2">
                  <Input
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSavePrompt}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelPromptEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <CardTitle>
                      Question {displayNumber}: {question.prompt}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {getQuestionTypeDisplay(question.type)}
                    </CardDescription>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsEditingPrompt(true)}
                    className="h-6 w-6">
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
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
                {selectedValues.length > 0
                  ? `${selectedValues.length} selected`
                  : 'Select options...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Search options..." />
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
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Edit Options:</h4>
            {questionOption?.map((option) => (
              <div key={option.id} className="flex items-center gap-2 group">
                {editingOptionId === option.id ? (
                  <>
                    <Input
                      value={editedOptionLabel}
                      onChange={(e) => setEditedOptionLabel(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveOption(option.id)}>
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelOptionEdit}>
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{option.label}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleEditOption(option.id, option.label)
                        }
                        className="h-6 w-6">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteOption(option.id)}
                        disabled={questionOption && questionOption.length <= 2}
                        className={cn(
                          'h-6 w-6',
                          questionOption && questionOption.length <= 2
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-500 hover:text-red-700'
                        )}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {isAddingOption ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New option label"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddOption}>
                  <Save className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelAddOption}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingOption(true)}>
                <Plus className="w-3 h-3 mr-1" />
                Add Option
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (question.type === 'FREE_RESPONSE') {
    const handleTextChange = (value: string) => {
      setTextAnswer(value);
      onAnswerChange?.(question.id, value);
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              {isEditingPrompt ? (
                <div className="space-y-2">
                  <Input
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSavePrompt}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelPromptEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <CardTitle>
                      Question {displayNumber}: {question.prompt}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {getQuestionTypeDisplay(question.type)}
                    </CardDescription>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsEditingPrompt(true)}
                    className="h-6 w-6">
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle>Unknown Question Type</CardTitle>
            <CardDescription className="mt-1">
              {getQuestionTypeDisplay(question.type)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p>Question type &quot;{question.type}&quot; is not supported.</p>
      </CardContent>
    </Card>
  );
}
