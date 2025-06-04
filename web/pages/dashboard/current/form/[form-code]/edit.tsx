import { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getQuestions,
  createQuestion,
  createOption
} from '@/utils/supabase/queries/question';
import { getFormIdByCode } from '@/utils/supabase/queries/form';
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
import { DoorOpen, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Constants
const QUESTION_TYPES = [
  {
    id: 'mcq',
    label: 'Multiple Choice',
    description: 'Users can select one option',
    dbType: 'MULTIPLE_CHOICE'
  },
  {
    id: 'sa',
    label: 'Select All That Apply',
    description: 'Users can select multiple options',
    dbType: 'SELECT_ALL'
  },
  {
    id: 'fr',
    label: 'Free Response',
    description: 'Users can type their own answer',
    dbType: 'FREE_RESPONSE'
  }
] as const;

// Types
type QuestionType = (typeof QUESTION_TYPES)[number]['id'];

interface CreateQuestionFormData {
  type: QuestionType | '';
  prompt: string;
  options: string[];
}

// Custom Hooks
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

// Components
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
      className="flex-1"
    />
    {canRemove && (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onRemove(index)}
        aria-label={`Remove option ${index + 1}`}>
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
          <div className="flex-1">
            <Label htmlFor={type.id} className="cursor-pointer font-medium">
              {type.label}
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
    options: ['']
  });

  const resetForm = () => {
    setFormData({
      type: '',
      prompt: '',
      options: ['']
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
      await onSave(formData);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save question:', error);
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                Question Prompt *
              </Label>
              <Textarea
                id="prompt"
                placeholder="Enter your question here..."
                value={formData.prompt}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, prompt: e.target.value }))
                }
                className="min-h-[80px]"
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

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !formData.type || !formData.prompt.trim()}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Creating...' : 'Create Question'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
export type EditPageProps = {
  user: User;
};

export default function EditPage({ user }: EditPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { 'form-code': formCode } = router.query;
  const supabase = useSupabase();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { formId, questions, isLoading, refetchQuestions } =
    useFormQuestions(formCode);

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
        questions.length + 1
      );

      // Create options for MCQ and SELECT_ALL questions
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
      console.error('Failed to save question:', error);
      toast.error('Failed to create question. Please try again.');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const exitEdit = () => {
    router.push(`/dashboard/current/form/${formCode}`);
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
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Edit Form
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Manage your questions and form structure
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>

              <Button onClick={exitEdit} variant="default">
                <DoorOpen className="w-4 h-4 mr-2" />
                Exit
              </Button>
            </Dialog>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {questions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="max-w-sm mx-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No questions yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first question for this form.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Question
                </Button>
              </div>
            </div>
          ) : (
            questions
              .sort((a, b) => a.index - b.index)
              .map((question) => (
                <QuestionCard key={question.id} question={question} />
              ))
          )}
        </div>

        {/* Create Question Dialog */}
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

  return {
    props: {
      user: userData.user
    }
  };
}
