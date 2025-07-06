import { GetServerSidePropsContext } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { User } from '@supabase/supabase-js';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DashBoardLayout from '@/components/layouts/dashboard-layout';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/components/ui/popover';
import { getForms } from '@/utils/supabase/queries/form';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase';
import { Form } from '@/utils/supabase/models/form';
import { useState } from 'react';
import { createFamilyTree } from '@/utils/supabase/queries/family-tree';
import { Question } from '@/utils/supabase/models/question';
import { getQuestions } from '@/utils/supabase/queries/question';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/router';
import { toast } from 'sonner';

export type FamilyTreePageProps = {
  user: User;
};

export default function FamilyTreePage({ user }: FamilyTreePageProps) {
  const supabase = useSupabase();
  const [familyTitle, setFamilyTitle] = useState('');

  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const forms = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      return await getForms(supabase, user.id);
    }
  });

  const questions = useQuery({
    queryKey: ['questions', selectedForm?.id],
    queryFn: async () => {
      if (selectedForm) {
        return await getQuestions(supabase, selectedForm.id);
      }
      return [];
    },
    enabled: !!selectedForm
  });

  const handleCreateFamilyTree = async () => {
    try {
      const familyTree = await createFamilyTree(
        supabase,
        selectedForm?.id || '',
        selectedQuestion?.id || '',
        familyTitle,
        selectedForm?.code || ''
      );
      setOpen(false);
      setFamilyTitle('');
      setSelectedForm(null);
      setSelectedQuestion(null);
      toast('Family tree created successfully!');
      router.push(`/dashboard/family-tree/${familyTree.code}`);
    } catch {
      toast('Duplicate family tree found, please use the existing one!');
    }
  };
  return (
    <DashBoardLayout user={user}>
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 text-white hover:bg-blue-600">
              Open Form Catalog
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogTitle>Create Family Tree</DialogTitle>
            <DialogHeader>
              <Input
                placeholder="Enter Family Tree Title"
                value={familyTitle}
                onChange={(e) => setFamilyTitle(e.target.value)}
                className="mb-4"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button className="mt-4 bg-green-500 text-white hover:bg-green-600">
                    {selectedForm
                      ? `Selected Form: ${selectedForm.title}`
                      : 'Select Form'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  {forms.data &&
                    forms.data.map((form: Form) => (
                      <div key={form.id} className="p-2 border-b">
                        <h3 className="text-lg font-semibold">{form.title}</h3>
                        <Button>
                          <span
                            onClick={() => setSelectedForm(form)}
                            className={
                              selectedForm?.id === form.id
                                ? 'font-bold text-blue-600'
                                : ''
                            }>
                            {selectedForm?.id === form.id
                              ? 'Selected'
                              : 'Select'}
                          </span>
                        </Button>
                      </div>
                    ))}
                  {forms.isLoading && <div>Loading...</div>}
                  {forms.error && <div>Error loading forms.</div>}
                </PopoverContent>
              </Popover>

              {selectedForm && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button className="mt-4 bg-green-500 text-white hover:bg-green-600">
                      {selectedQuestion
                        ? `Selected Question: ${selectedQuestion.prompt}`
                        : 'Select Question'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <h3 className="text-lg font-semibold">
                      {selectedForm.title}
                    </h3>
                    {questions.isLoading && <div>Loading questions...</div>}
                    {questions.error && <div>Error loading questions.</div>}
                    {questions.data &&
                      questions.data.map((question: Question) => (
                        <div
                          key={question.id}
                          className={`p-2 border-b cursor-pointer ${
                            selectedQuestion?.id === question.id
                              ? 'bg-blue-100'
                              : ''
                          }`}
                          onClick={() => setSelectedQuestion(question)}>
                          <span
                            className={
                              selectedQuestion?.id === question.id
                                ? 'font-bold text-blue-600'
                                : ''
                            }>
                            {question.prompt}
                          </span>
                        </div>
                      ))}
                  </PopoverContent>
                </Popover>
              )}
            </DialogHeader>
            <DialogFooter>
              <Button
                disabled={!familyTitle || !selectedForm || !selectedQuestion}
                className="bg-blue-500 text-white hover:bg-blue-600"
                onClick={handleCreateFamilyTree}>
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
