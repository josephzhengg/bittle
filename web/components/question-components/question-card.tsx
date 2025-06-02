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

  // Editing states
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(question.prompt);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editedOptionLabel, setEditedOptionLabel] = useState('');
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState('');

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
    // Prevent deleting if only one option remains
    if (questionOption && questionOption.length <= 2) {
      toast.error(
        'Cannot delete more options. Questions must have at least two options.'
      );
      return;
    }

    try {
      await deleteOption(supabase, optionId);

      // Remove from selected values if it was selected
      if (selectedValues.includes(optionId)) {
        const newSelectedValues = selectedValues.filter(
          (id) => id !== optionId
        );
        setSelectedValues(newSelectedValues);
        onAnswerChange?.(question.id, newSelectedValues);
      }

      // Clear single selection if it was the selected option
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
                  <CardTitle className="flex-1">
                    Question {question.index}: {question.prompt}
                  </CardTitle>
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
              <div
                key={option.id}
                className="flex items-center space-x-2 group">
                <RadioGroupItem value={option.id} id={option.id} />
                {editingOptionId === option.id ? (
                  <div className="flex-1 flex items-center gap-2">
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
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between">
                    <Label
                      htmlFor={option.id}
                      className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
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
                  </div>
                )}
              </div>
            ))}
          </RadioGroup>

          {/* Add new option */}
          {isAddingOption ? (
            <div className="mt-4 flex items-center gap-2">
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
              onClick={() => setIsAddingOption(true)}
              className="mt-4">
              <Plus className="w-3 h-3 mr-1" />
              Add Option
            </Button>
          )}
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
                  <CardTitle className="flex-1">
                    Question {question.index}: {question.prompt}
                  </CardTitle>
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

          {/* Edit options section */}
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

            {/* Add new option */}
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
                  <CardTitle className="flex-1">
                    Question {question.index}: {question.prompt}
                  </CardTitle>
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
