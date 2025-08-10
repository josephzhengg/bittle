import { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getQuestions,
  createQuestion,
  createOption,
  reorderQuestions
} from '@/utils/supabase/queries/question';
import { useEffect } from 'react';
import {
  getFormIdByCode,
  getFormDeadline,
  getFormByCode
} from '@/utils/supabase/queries/form';
import { useSupabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import { z } from 'zod';
import QuestionCard from '@/components/question-components/question-card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { DoorOpen, Plus, Save, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Reorder, useDragControls } from 'framer-motion';
import { Question } from '@/utils/supabase/models/question';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Badge } from '@/components/ui/badge';

const QUESTION_TYPES = [
  {
    id: 'mcq',
    label: 'Multiple Choice',
    description: 'Users can select one option',
    dbType: 'MULTIPLE_CHOICE',
    icon: '📝'
  },
  {
    id: 'sa',
    label: 'Select All That Apply',
    description: 'Users can select multiple options',
    dbType: 'SELECT_ALL',
    icon: '✅'
  },
  {
    id: 'fr',
    label: 'Free Response',
    description: 'Users can type their own answer',
    dbType: 'FREE_RESPONSE',
    icon: '✍️'
  },
  {
    id: 'section',
    label: 'Section Header',
    description: 'Add a title and description to your form',
    dbType: 'SECTION_HEADER',
    icon: '📌'
  }
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number]['id'];
interface CreateQuestionFormData {
  type: QuestionType | '';
  prompt: string;
  options: string[];
  description?: string;
}

const useFormQuestions = (formCode: string | string[] | undefined) => {
  const supabase = useSupabase();
  const { data: formId } = useQuery({
    queryKey: ['formId', formCode],
    queryFn: () => getFormIdByCode(supabase, z.string().parse(formCode)),
    enabled: !!formCode
  });
  const questionsQuery = useQuery({
    queryKey: ['questions', formId],
    queryFn: () =>
      formId ? getQuestions(supabase, formId) : Promise.resolve([]),
    enabled: !!formId
  });
  return {
    formId,
    questions: questionsQuery.data || [],
    isLoading: questionsQuery.isLoading,
    refetchQuestions: questionsQuery.refetch
  };
};

interface OptionInputProps {
  value: string;
  index: number;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

const OptionInput = ({
  value,
  index,
  onChange,
  onRemove,
  canRemove
}: OptionInputProps) => (
  <div className="flex gap-2 items-center">
    <Input
      value={value}
      onChange={(e) => onChange(index, e.target.value)}
      placeholder={`Option ${index + 1}`}
      className="flex-1 min-w-0"
    />
    {canRemove && (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onRemove(index)}
        aria-label={`Remove option ${index + 1}`}
        className="shrink-0">
        <Trash2 className="w-4 h-4" />
      </Button>
    )}
  </div>
);

interface QuestionTypeSelectProps {
  selectedType: QuestionType | '';
  onTypeChange: (type: QuestionType) => void;
}

const QuestionTypeSelect = ({
  selectedType,
  onTypeChange
}: QuestionTypeSelectProps) => (
  <div className="space-y-3">
    <Label className="text-base font-medium">Question Type</Label>
    <RadioGroup value={selectedType} onValueChange={onTypeChange}>
      {QUESTION_TYPES.map((type) => (
        <div
          key={type.id}
          className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
          <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
          <div className="flex-1 min-w-0">
            <Label htmlFor={type.id} className="cursor-pointer font-medium">
              {type.icon} {type.label}
            </Label>
            <p className="text-sm text-gray-600 mt-1">{type.description}</p>
          </div>
        </div>
      ))}
    </RadioGroup>
  </div>
);

interface OptionsEditorProps {
  options: string[];
  onOptionsChange: (options: string[]) => void;
}

const OptionsEditor = ({ options, onOptionsChange }: OptionsEditorProps) => {
  const addOption = () => onOptionsChange([...options, '']);
  const removeOption = (index: number) =>
    onOptionsChange(options.filter((_, i) => i !== index));
  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onOptionsChange(updated);
  };
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Options</Label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <OptionInput
            key={index}
            value={option}
            index={index}
            onChange={updateOption}
            onRemove={removeOption}
            canRemove={options.length > 1}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={addOption}
        className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Option
      </Button>
    </div>
  );
};

interface CreateQuestionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateQuestionFormData) => Promise<void>;
  isSaving: boolean;
}

const CreateQuestionDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  isSaving
}: CreateQuestionDialogProps) => {
  const [formData, setFormData] = useState<CreateQuestionFormData>({
    type: '',
    prompt: '',
    options: [''],
    description: ''
  });

  const resetForm = () => {
    setFormData({
      type: '',
      prompt: '',
      options: [''],
      description: ''
    });
  };

  const handleSave = async () => {
    if (!formData.type || !formData.prompt.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (
      (formData.type === 'mcq' || formData.type === 'sa') &&
      formData.options.filter((opt) => opt.trim()).length < 2
    ) {
      toast.error('Please add at least 2 options');
      return;
    }
    try {
      await onSave({
        ...formData,
        description:
          formData.type === 'section' ? formData.description : undefined
      });
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create question. Please try again.');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSaving) {
      resetForm();
    }
    onOpenChange(open);
  };

  const hasOptions = formData.type === 'mcq' || formData.type === 'sa';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85dvh] overflow-y-auto mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Create New Question</DialogTitle>
          <DialogDescription>
            Choose the type of question and configure its settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <QuestionTypeSelect
            selectedType={formData.type}
            onTypeChange={(type) => setFormData((prev) => ({ ...prev, type }))}
          />
          {formData.type && (
            <div className="space-y-3">
              <Label htmlFor="prompt" className="text-base font-medium">
                {formData.type === 'section' ? 'Title *' : 'Question Prompt *'}
              </Label>
              <Textarea
                id="prompt"
                placeholder={
                  formData.type === 'section'
                    ? 'Enter section title...'
                    : 'Enter your question here...'
                }
                value={formData.prompt}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, prompt: e.target.value }))
                }
                className="min-h-[80px]"
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>
          )}
          {formData.type === 'section' && (
            <div className="space-y-3">
              <Label htmlFor="description" className="text-base font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Enter section description... (newlines and spacing will be preserved)"
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value
                  }))
                }
                className="min-h-[120px]"
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>
          )}
          {hasOptions && (
            <OptionsEditor
              options={formData.options}
              onOptionsChange={(options) =>
                setFormData((prev) => ({ ...prev, options }))
              }
            />
          )}
          {formData.type === 'fr' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 This will create a text input field where users can type
                their own response.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="mt-6 flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
            className="w-full sm:w-auto order-2 sm:order-1">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !formData.type || !formData.prompt.trim()}
            className="w-full sm:w-auto order-1 sm:order-2">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Creating...' : 'Create Question'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface DraggableQuestionItemProps {
  question: Question;
  displayNumber?: number;
}

import { useRef } from 'react';

const DraggableQuestionItem = ({
  question,
  displayNumber
}: DraggableQuestionItemProps) => {
  const controls = useDragControls();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const dragHandleRef = useRef<HTMLDivElement>(null);

  return (
    <Reorder.Item
      value={question}
      dragListener={false}
      dragControls={controls}
      className="mb-4 sm:mb-6 select-none touch-none"
      whileDrag={{
        scale: 1.03,
        boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
        zIndex: 9999,
        position: 'relative',
        borderRadius: '0.5rem'
      }}
      transition={{ duration: 0.2 }}
      style={{
        userSelect: 'none',
        position: 'relative',
        zIndex: 1
      }}>
      <div className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 select-none relative">
        <div className="flex items-start gap-3 p-3 sm:p-4 select-none relative">
          <div
            ref={dragHandleRef}
            className={`flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing rounded-md transition-colors
              ${
                isMobile ? 'w-12 h-12 -ml-2 touch-manipulation' : 'w-8 h-8'
              } bg-gray-100 hover:bg-gray-200 text-gray-500`}
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e, { snapToCursor: false });
            }}
            style={{
              touchAction: 'none',
              userSelect: 'none'
            }}
            aria-label="Drag to reorder question"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
              }
            }}>
            <GripVertical
              className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`}
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0 select-text relative">
            <QuestionCard
              question={question}
              displayNumber={displayNumber ?? null}
            />
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
};

export type EditPageProps = {
  user: User;
};

export default function EditPage({ user }: EditPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { 'form-code': formCode } = router.query as { 'form-code'?: string };
  const supabase = useSupabase();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { formId, questions, isLoading, refetchQuestions } =
    useFormQuestions(formCode);
  const [orderedQuestions, setOrderedQuestions] = useState(questions);

  const { data: formTitle } = useQuery({
    queryKey: ['formTitle', formCode],
    queryFn: () => getFormByCode(supabase, formCode as string)
  });

  useEffect(() => {
    const sortedQuestions = [...questions].sort((a, b) => a.index - b.index);
    setOrderedQuestions(sortedQuestions);
  }, [questions]);

  const handleSaveQuestion = async (data: CreateQuestionFormData) => {
    if (!formId) {
      toast.error('Form not found');
      return;
    }
    setIsSaving(true);
    try {
      const questionType = QUESTION_TYPES.find(
        (type) => type.id === data.type
      )!;
      const newQuestion = await createQuestion(
        supabase,
        formId,
        data.prompt.trim(),
        questionType.dbType,
        questions.length + 1,
        data.type === 'section' ? data.description : undefined
      );
      if (data.type === 'mcq' || data.type === 'sa') {
        const validOptions = data.options
          .map((label) => label.trim())
          .filter((label) => label !== '');
        if (validOptions.length > 0) {
          const optionPayload = validOptions.map((label, index) => ({
            question_id: newQuestion.id,
            label,
            index: index + 1
          }));
          await createOption(supabase, newQuestion.id, optionPayload);
        }
      }
      await refetchQuestions();
      await queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('Question created successfully!');
    } catch (error) {
      toast.error('Failed to create question. Please try again.');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const [reorderTimeout, setReorderTimeout] = useState<NodeJS.Timeout>();
  const handleReorder = (newOrder: Question[]) => {
    setOrderedQuestions(newOrder);
    if (reorderTimeout) {
      clearTimeout(reorderTimeout);
    }
    setReorderTimeout(
      setTimeout(async () => {
        try {
          const updatedQuestions = newOrder.map((question, index) => ({
            ...question,
            index: index + 1
          }));
          await reorderQuestions(supabase, updatedQuestions);
          await refetchQuestions();
          await queryClient.invalidateQueries({ queryKey: ['questions'] });
          toast.success('Questions reordered successfully!');
        } catch {
          toast.error('Failed to reorder questions. Please try again.');
          const sortedQuestions = [...questions].sort(
            (a, b) => a.index - b.index
          );
          setOrderedQuestions(sortedQuestions);
        }
      }, 500)
    );
  };

  useEffect(() => {
    return () => {
      if (reorderTimeout) {
        clearTimeout(reorderTimeout);
      }
    };
  }, [reorderTimeout]);

  const exitEdit = () => {
    router.push(`/dashboard/current/${formCode?.toUpperCase()}/form/`);
  };

  if (isLoading) {
    return (
      <DashBoardLayout user={user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading questions...</p>
          </div>
        </div>
      </DashBoardLayout>
    );
  }

  return (
    <DashBoardLayout user={user}>
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="mb-6 sm:mb-8">
          <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-3xl font-semibold text-gray-900">
              {formTitle ? `Editing form: ${formTitle.title}` : 'Edit Form'}
            </h1>
            <Badge
              variant="outline"
              className="text-sm font-medium px-3 py-1 rounded-md bg-purple-100 text-purple-800 border-purple-300 whitespace-nowrap">
              {formCode ? formCode.toUpperCase() : 'N/A'}
            </Badge>
          </div>

          <div className="mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Manage your questions and form structure
            </p>
            {orderedQuestions.length > 1 && (
              <p className="text-xs sm:text-sm text-blue-600 mt-2">
                💡{' '}
                {isMobile
                  ? 'Press and hold to drag questions'
                  : 'Drag questions by the grip handle to reorder them'}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                  size={isMobile ? 'default' : 'default'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>
            </Dialog>
            <Button
              onClick={exitEdit}
              variant="outline"
              className="w-full sm:w-auto order-1 sm:order-2"
              size={isMobile ? 'default' : 'default'}>
              <DoorOpen className="w-4 h-4 mr-2" />
              Exit Edit Mode
            </Button>
          </div>
        </div>
        <div className="mb-6 p-3 sm:p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
          <p className="text-xs sm:text-sm text-yellow-800">
            <strong>Note:</strong> We recommend adding a question asking for the
            user&#39;s name, email, or student ID if you need to identify who
            submitted each response.
          </p>
        </div>
        <div className="space-y-0">
          {orderedQuestions.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="max-w-sm mx-auto px-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  No questions yet
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  Get started by creating your first question for this form.
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="w-full sm:w-auto"
                  size={isMobile ? 'default' : 'default'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Question
                </Button>
              </div>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={orderedQuestions}
              onReorder={handleReorder}
              className="space-y-0 select-none"
              style={{ userSelect: 'none' }}>
              {(() => {
                let questionCounter = 0;
                return orderedQuestions.map((question) => {
                  const displayNumber =
                    question.type !== 'SECTION_HEADER'
                      ? ++questionCounter
                      : undefined;
                  return (
                    <DraggableQuestionItem
                      key={question.id}
                      question={question}
                      displayNumber={displayNumber}
                    />
                  );
                });
              })()}
            </Reorder.Group>
          )}
        </div>
        <CreateQuestionDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSave={handleSaveQuestion}
          isSaving={isSaving}
        />
      </div>
    </DashBoardLayout>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error } = await supabase.auth.getUser();
  if (!userData || error) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }
  const { 'form-code': formCode } = context.query;
  const currentPath = context.resolvedUrl;
  if (!formCode || typeof formCode !== 'string') {
    return {
      props: {
        user: userData.user,
        initialFormData: null,
        error: 'Invalid form code'
      }
    };
  }
  try {
    const deadline = await getFormDeadline(supabase, formCode);
    const now = new Date();
    const isDeadlinePassed = deadline ? new Date(deadline) < now : false;
    if (currentPath.includes('/dashboard/past/form/') && !isDeadlinePassed) {
      return {
        redirect: {
          destination: `/dashboard/current/form/${formCode}/edit`,
          permanent: false
        }
      };
    }
    if (currentPath.includes('/dashboard/current/form/') && isDeadlinePassed) {
      return {
        redirect: {
          destination: `/dashboard/past/form/${formCode}/edit`,
          permanent: false
        }
      };
    }
  } catch {
    toast.error('Failed to fetch form deadline. Please try again later.');
  }
  return {
    props: {
      user: userData.user
    }
  };
}
