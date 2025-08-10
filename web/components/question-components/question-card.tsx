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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogDescription,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

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
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(question.prompt);
  const [editedDescription, setEditedDescription] = useState(
    question.description || ''
  );
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editedOptionLabel, setEditedOptionLabel] = useState('');
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const supabase = useSupabase();
  const toggleOpen = () => setIsOpen((v) => !v);
  const [openPopover, setOpenPopover] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: questionOption } = useQuery({
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
      await updateQuestion(
        supabase,
        question.id,
        editedPrompt,
        question.type === 'SECTION_HEADER' ? editedDescription : undefined
      );
      setIsEditingPrompt(false);
      toast.success('Question updated successfully.');
      await queryUtils.refetchQueries({ queryKey: ['questions'] });
    } catch {
      toast.error('Error updating question, please try again');
    }
  };

  const handleCancelPromptEdit = () => {
    setEditedPrompt(question.prompt);
    setEditedDescription(question.description || '');
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
        <CardHeader className="pb-2">
          {/* Mobile-friendly header layout */}
          <div className="space-y-3">
            {/* Main content area - full width on mobile */}
            <div className="w-full">
              {isEditingPrompt ? (
                <div className="space-y-2">
                  <Input
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Add a description (optional, newlines and spacing preserved)"
                    className="min-h-[60px]"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                  <div className="flex gap-2 flex-wrap">
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
                <div
                  onClick={toggleOpen}
                  className="cursor-pointer select-none">
                  <CardTitle className="text-base sm:text-lg pr-2">
                    {displayNumber && `Section ${displayNumber}: `}
                    {question.prompt}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Section Header
                  </CardDescription>
                </div>
              )}
            </div>

            {/* Action buttons row - horizontal on mobile */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!isEditingPrompt && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingPrompt(true);
                    }}
                    className="h-8 w-8">
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                <Dialog
                  open={isDeleteModalOpen}
                  onOpenChange={(open) => setIsDeleteModalOpen(open)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteModalOpen(true);
                      }}
                      aria-label="Delete question"
                      className="h-8 w-8">
                      <X className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl text-gray-900 max-w-[90vw] sm:max-w-lg rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                        Delete Question?
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 text-sm sm:text-base">
                        This action cannot be undone. This will permanently
                        delete
                        <span className="font-semibold text-gray-900">
                          {' '}
                          “{question.prompt}”
                        </span>
                        and all of its options.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3 flex-col sm:flex-row">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 text-sm sm:text-base w-full sm:w-auto rounded-lg">
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          await handleDelete();
                          setIsDeleteModalOpen(false);
                        }}
                        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto rounded-lg">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Forever
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {!isEditingPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleOpen}
                  className="flex items-center gap-1">
                  <span className="text-sm">
                    {isOpen ? 'Collapse' : 'Expand'}
                  </span>
                  <span className="text-lg select-none">
                    {isOpen ? '−' : '+'}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent>
            {question.description && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p
                  className="text-sm text-gray-700"
                  style={{ whiteSpace: 'pre-wrap' }}>
                  {question.description}
                </p>
              </div>
            )}
            {!question.description && (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-500 italic">
                  No description provided. Click the edit button above to add
                  one.
                </p>
              </div>
            )}
          </CardContent>
        )}
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
        <CardHeader className="pb-2">
          <div className="space-y-3">
            <div className="w-full">
              {isEditingPrompt ? (
                <div className="space-y-2">
                  <Input
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <div className="flex gap-2 flex-wrap">
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
                <div
                  onClick={toggleOpen}
                  className="cursor-pointer select-none">
                  <CardTitle className="text-base sm:text-lg pr-2">
                    Question {displayNumber}: {question.prompt}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {getQuestionTypeDisplay(question.type)}
                  </CardDescription>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!isEditingPrompt && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingPrompt(true);
                    }}
                    className="h-8 w-8">
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                <Dialog
                  open={isDeleteModalOpen}
                  onOpenChange={(open) => setIsDeleteModalOpen(open)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteModalOpen(true);
                      }}
                      aria-label="Delete question"
                      className="h-8 w-8">
                      <X className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl text-gray-900 max-w-[90vw] sm:max-w-lg rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                        Delete Question?
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 text-sm sm:text-base">
                        This action cannot be undone. This will permanently
                        delete
                        <span className="font-semibold text-gray-900">
                          {' '}
                          “{question.prompt}”
                        </span>
                        and all of its options.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3 flex-col sm:flex-row">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 text-sm sm:text-base w-full sm:w-auto rounded-lg">
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          await handleDelete();
                          setIsDeleteModalOpen(false);
                        }}
                        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto rounded-lg">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Forever
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {!isEditingPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleOpen}
                  className="flex items-center gap-1">
                  <span className="text-sm">
                    {isOpen ? 'Collapse' : 'Expand'}
                  </span>
                  <span className="text-lg select-none">
                    {isOpen ? '−' : '+'}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent>
            <RadioGroup value={selectedValue} onValueChange={handleRadioChange}>
              {questionOption?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.id}
                    id={option.id}
                    disabled={true}
                  />
                  <Label htmlFor={option.id} className="flex-1 text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Edit Options:</h4>
              {questionOption?.map((option) => (
                <div
                  key={option.id}
                  className="space-y-2 p-2 bg-gray-50 rounded">
                  {editingOptionId === option.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editedOptionLabel}
                        onChange={(e) => setEditedOptionLabel(e.target.value)}
                        className="w-full"
                      />
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => handleSaveOption(option.id)}>
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelOptionEdit}>
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm flex-1 min-w-0 break-words">
                        {option.label}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
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
                          disabled={
                            questionOption && questionOption.length <= 2
                          }
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

              {isAddingOption ? (
                <div className="space-y-2 p-2 bg-blue-50 rounded">
                  <Input
                    placeholder="New option label"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={handleAddOption}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelAddOption}>
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingOption(true)}
                  className="w-full sm:w-auto">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
          </CardContent>
        )}
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
        <CardHeader className="pb-2">
          <div className="space-y-3">
            <div className="w-full">
              {isEditingPrompt ? (
                <div className="space-y-2">
                  <Input
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <div className="flex gap-2 flex-wrap">
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
                <div
                  onClick={toggleOpen}
                  className="cursor-pointer select-none">
                  <CardTitle className="text-base sm:text-lg pr-2">
                    Question {displayNumber}: {question.prompt}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {getQuestionTypeDisplay(question.type)}
                  </CardDescription>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!isEditingPrompt && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingPrompt(true);
                    }}
                    className="h-8 w-8">
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                <Dialog
                  open={isDeleteModalOpen}
                  onOpenChange={(open) => setIsDeleteModalOpen(open)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteModalOpen(true);
                      }}
                      aria-label="Delete question"
                      className="h-8 w-8">
                      <X className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl text-gray-900 max-w-[90vw] sm:max-w-lg rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                        Delete Question?
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 text-sm sm:text-base">
                        This action cannot be undone. This will permanently
                        delete
                        <span className="font-semibold text-gray-900">
                          {' '}
                          “{question.prompt}”
                        </span>
                        and all of its options.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3 flex-col sm:flex-row">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 text-sm sm:text-base w-full sm:w-auto rounded-lg">
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          await handleDelete();
                          setIsDeleteModalOpen(false);
                        }}
                        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto rounded-lg">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Forever
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {!isEditingPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleOpen}
                  className="flex items-center gap-1">
                  <span className="text-sm">
                    {isOpen ? 'Collapse' : 'Expand'}
                  </span>
                  <span className="text-lg select-none">
                    {isOpen ? '−' : '+'}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent>
            <Popover open={openPopover} onOpenChange={setOpenPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPopover}
                  disabled={true}
                  className="w-full justify-between">
                  {selectedValues.length > 0
                    ? `${selectedValues.length} selected`
                    : 'Select options...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0">
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

            {/* Option Editing UI */}
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Edit Options:</h4>
              {questionOption?.map((option) => (
                <div
                  key={option.id}
                  className="space-y-2 p-2 bg-gray-50 rounded">
                  {editingOptionId === option.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editedOptionLabel}
                        onChange={(e) => setEditedOptionLabel(e.target.value)}
                        className="w-full"
                      />
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => handleSaveOption(option.id)}>
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelOptionEdit}>
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm flex-1 min-w-0 break-words">
                        {option.label}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
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
                          disabled={
                            questionOption && questionOption.length <= 2
                          }
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

              {isAddingOption ? (
                <div className="space-y-2 p-2 bg-blue-50 rounded">
                  <Input
                    placeholder="New option label"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={handleAddOption}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelAddOption}>
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingOption(true)}
                  className="w-full sm:w-auto">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
          </CardContent>
        )}
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
        <CardHeader className="pb-2">
          <div className="space-y-3">
            <div className="w-full">
              {isEditingPrompt ? (
                <div className="space-y-2">
                  <Input
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <div className="flex gap-2 flex-wrap">
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
                <div
                  onClick={toggleOpen}
                  className="cursor-pointer select-none">
                  <CardTitle className="text-base sm:text-lg pr-2">
                    Question {displayNumber}: {question.prompt}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {getQuestionTypeDisplay(question.type)}
                  </CardDescription>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!isEditingPrompt && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingPrompt(true);
                    }}
                    className="h-8 w-8">
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                <Dialog
                  open={isDeleteModalOpen}
                  onOpenChange={(open) => setIsDeleteModalOpen(open)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteModalOpen(true);
                      }}
                      aria-label="Delete question"
                      className="h-8 w-8">
                      <X className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl text-gray-900 max-w-[90vw] sm:max-w-lg rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                        Delete Question?
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 text-sm sm:text-base">
                        This action cannot be undone. This will permanently
                        delete
                        <span className="font-semibold text-gray-900">
                          {' '}
                          “{question.prompt}”
                        </span>
                        and all of its options.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3 flex-col sm:flex-row">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 text-sm sm:text-base w-full sm:w-auto rounded-lg">
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          await handleDelete();
                          setIsDeleteModalOpen(false);
                        }}
                        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto rounded-lg">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Forever
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {!isEditingPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleOpen}
                  className="flex items-center gap-1">
                  <span className="text-sm">
                    {isOpen ? 'Collapse' : 'Expand'}
                  </span>
                  <span className="text-lg select-none">
                    {isOpen ? '−' : '+'}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent>
            <Textarea
              placeholder="Write your response here..."
              value={textAnswer}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-[100px]"
              disabled={true}
            />
          </CardContent>
        )}
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
