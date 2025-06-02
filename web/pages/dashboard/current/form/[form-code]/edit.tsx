import { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { useQuery } from '@tanstack/react-query';
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
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter
} from '@/components/ui/dialog';
import { DialogTitle } from '@radix-ui/react-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Question } from '@/utils/supabase/models/question';

const questionTypes = [
  { id: 'mcq', label: 'Multiple Choice' },
  { id: 'sa', label: 'Select all that Apply' },
  { id: 'fr', label: 'Free Response' }
];

export type EditPageProps = {
  user: User;
};

export default function EditPage({ user }: EditPageProps) {
  const router = useRouter();
  const { 'form-code': formCode } = router.query;
  const supabase = useSupabase();

  const [questions, setQuestions] = useState<z.infer<typeof Question>[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<string[]>(['']);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: formId } = useQuery({
    queryKey: ['formId'],
    queryFn: () => getFormIdByCode(supabase, z.string().parse(formCode)),
    enabled: !!formCode
  });

  const { data: questionData = [], refetch } = useQuery({
    queryKey: ['questions', formId],
    queryFn: () =>
      formId ? getQuestions(supabase, formId) : Promise.resolve([]),
    enabled: !!formId
  });

  useEffect(() => {
    setQuestions(questionData);
  }, [questionData]);

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index: number) =>
    setOptions(options.filter((_, i) => i !== index));
  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const saveQuestion = async () => {
    if (!formId || !selectedType || !prompt.trim()) return;

    setIsSaving(true);

    const typeMap: Record<string, string> = {
      mcq: 'MULTIPLE_CHOICE',
      sa: 'SELECT_ALL',
      fr: 'FREE_RESPONSE'
    };

    const mappedType = typeMap[selectedType];

    try {
      const newQuestion = await createQuestion(
        supabase,
        formId,
        prompt,
        mappedType,
        questions.length + 1
      );

      if (selectedType === 'mcq' || selectedType === 'sa') {
        const optionPayload = options
          .filter((label) => label.trim() !== '')
          .map((label, index) => ({
            question_id: newQuestion.id,
            label,
            index: index + 1
          }));

        await createOption(supabase, newQuestion.id, optionPayload);
      }

      await refetch();

      // Reset form state
      setPrompt('');
      setOptions(['']);
      setSelectedType('');
    } catch (error) {
      console.error('Failed to save question:', error);
    } finally {
      setIsSaving(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <DashBoardLayout user={user}>
      <Button
        onClick={() => router.push(`/dashboard/current/form/${formCode}`)}>
        Save
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => setIsDialogOpen(true)}>Create Question</Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create your question here!</DialogTitle>
          </DialogHeader>

          <RadioGroup value={selectedType} onValueChange={setSelectedType}>
            {questionTypes.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {(selectedType === 'mcq' || selectedType === 'sa') && (
            <div className="space-y-2 mt-4">
              <Label htmlFor="prompt">Question Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Enter the question..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />

              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Textarea
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    {options.length > 1 && (
                      <Button
                        variant="outline"
                        onClick={() => removeOption(index)}>
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" className="mt-2" onClick={addOption}>
                + Add Option
              </Button>
            </div>
          )}

          {selectedType === 'fr' && (
            <div className="space-y-2 mt-4">
              <Label htmlFor="prompt">Question Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Enter the question..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <p className="text-muted-foreground text-sm">
                This will be a free text input for applicants.
              </p>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" onClick={saveQuestion} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-4 space-y-4">
        {questions.map((question) => (
          <QuestionCard key={question.id} question={question} />
        ))}
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
