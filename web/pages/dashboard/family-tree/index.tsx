import { GetServerSidePropsContext } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { getFamilyTrees } from '@/utils/supabase/queries/family-tree';
import { getForms } from '@/utils/supabase/queries/form';
import { getQuestions } from '@/utils/supabase/queries/question';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase';
import { Form } from '@/utils/supabase/models/form';
import { Question } from '@/utils/supabase/models/question';
import { useState } from 'react';
import { createFamilyTree } from '@/utils/supabase/queries/family-tree';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import FamilyTreeCard from '@/components/family-tree-components/family-tree-card';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/components/ui/popover';
import { TreePine, Plus, Search } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export type FamilyTreesPageProps = {
  user: User;
};

export default function FamilyTreesPage({ user }: FamilyTreesPageProps) {
  const supabase = useSupabase();
  const router = useRouter();

  const [familyTitle, setFamilyTitle] = useState('');
  const [familyDesc, setFamilyDesc] = useState('');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleFormSelect = (form: Form) => {
    setSelectedForm(form);
    setSelectedQuestion(null);
  };

  const familyTrees = useQuery({
    queryKey: ['family-trees', user.id],
    queryFn: async () => {
      return await getFamilyTrees(supabase, user.id);
    }
  });

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

  const formsMap =
    forms.data?.reduce((acc: Record<string, Form>, form: Form) => {
      acc[form.id] = form;
      return acc;
    }, {} as Record<string, Form>) || {};

  const questionsMap = useQuery({
    queryKey: ['all-questions'],
    queryFn: async () => {
      if (!forms.data) return {};

      const questionsMap: Record<string, Question> = {};
      for (const form of forms.data) {
        const formQuestions = await getQuestions(supabase, form.id);
        formQuestions.forEach((question: Question) => {
          questionsMap[question.id] = question;
        });
      }
      return questionsMap;
    },
    enabled: !!forms.data
  });

  const handleCreateFamilyTree = async () => {
    if (!selectedForm || !selectedQuestion) {
      toast.error('Please select a form and question');
      return;
    }

    try {
      const familyTree = await createFamilyTree(supabase, {
        form_id: selectedForm.id,
        question_id: selectedQuestion.id,
        title: familyTitle,
        code: selectedForm.code,
        description: familyDesc,
        author_id: user.id
      });

      setCreateModalOpen(false);
      setFamilyTitle('');
      setSelectedForm(null);
      setSelectedQuestion(null);
      setFamilyDesc('');
      toast('Family tree created successfully!');

      familyTrees.refetch();

      router.push(`/dashboard/family-tree/${familyTree.code}`);
    } catch {
      toast(
        'Duplicate family tree found, please use the existing tree, or delete it before proceeding!'
      );
    }
  };

  const filteredAndSortedTrees =
    familyTrees.data
      ?.filter(
        (tree) =>
          tree.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tree.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        return a.title.localeCompare(b.title);
      }) || [];

  return (
    <DashBoardLayout user={user}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <TreePine className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-800">
                  My Family Trees
                </h1>
                <p className="text-slate-600 mt-1">
                  Manage and explore your family connections
                </p>
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {familyTrees.data?.length || 0}
                </div>
                <div className="text-sm text-slate-600">Total Trees</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {forms.data?.length || 0}
                </div>
                <div className="text-sm text-slate-600">Available Forms</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-3 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search family trees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 backdrop-blur-sm border-slate-200"
                  />
                </div>
              </div>

              <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Tree
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-900/95 to-green-900/95 backdrop-blur-xl border border-white/20 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                      Create New Family Tree
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    <Input
                      placeholder="Enter Family Tree Title"
                      value={familyTitle}
                      onChange={(e) => setFamilyTitle(e.target.value)}
                      className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-green-500/50 focus:ring-green-500/20"
                    />

                    <Textarea
                      placeholder="Enter Family Tree Description (optional)"
                      value={familyDesc}
                      onChange={(e) => setFamilyDesc(e.target.value)}
                      className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-green-500/50 focus:ring-green-500/20"
                    />

                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button className="w-full bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20">
                          {selectedForm
                            ? `Selected: ${selectedForm.title}`
                            : 'Select Form'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full max-w-lg p-0 max-h-80 overflow-y-auto bg-gradient-to-br from-slate-900/95 to-green-900/95 backdrop-blur-xl border border-white/20 text-white rounded-lg shadow-lg">
                        <div>
                          {forms.data?.map((form: Form) => (
                            <div
                              key={form.id}
                              className={`p-3 border-b border-white/20 cursor-pointer hover:bg-white/10 ${
                                selectedForm?.id === form.id
                                  ? 'bg-green-500/20 border-green-500/30'
                                  : ''
                              }`}
                              onClick={() => handleFormSelect(form)}>
                              <h3 className="font-semibold text-white">
                                {form.title}
                              </h3>
                              <p className="text-sm text-white/70">
                                {form.code}
                              </p>
                            </div>
                          ))}
                          {forms.isLoading && (
                            <div className="p-4 text-center text-white/70">
                              Loading forms...
                            </div>
                          )}
                          {forms.error && (
                            <div className="p-4 text-center text-red-400">
                              Error loading forms
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {selectedForm && (
                      <Popover modal={true}>
                        <PopoverTrigger asChild>
                          <Button className="w-full bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20">
                            {selectedQuestion
                              ? `Selected: ${selectedQuestion.prompt}`
                              : 'Select Question'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full max-w-lg p-0 max-h-80 overflow-y-auto bg-gradient-to-br from-slate-900/95 to-green-900/95 backdrop-blur-xl border border-white/20 text-white rounded-lg shadow-lg">
                          <div>
                            <div className="p-3 border-b border-white/20 bg-slate-900/50 sticky top-0 z-10">
                              <h3 className="font-semibold text-white">
                                {selectedForm.title}
                              </h3>
                            </div>
                            {questions.data?.map((question: Question) => (
                              <div
                                key={question.id}
                                className={`p-3 border-b border-white/20 cursor-pointer hover:bg-white/10 ${
                                  selectedQuestion?.id === question.id
                                    ? 'bg-green-500/20 border-green-500/30'
                                    : ''
                                }`}
                                onClick={() => setSelectedQuestion(question)}>
                                <span className="text-white">
                                  {question.prompt}
                                </span>
                              </div>
                            ))}
                            {questions.isLoading && (
                              <div className="p-4 text-center text-white/70">
                                Loading questions...
                              </div>
                            )}
                            {questions.error && (
                              <div className="p-4 text-center text-red-400">
                                Error loading questions
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateModalOpen(false)}
                      className="bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20">
                      Cancel
                    </Button>
                    <Button
                      disabled={
                        !familyTitle || !selectedForm || !selectedQuestion
                      }
                      onClick={handleCreateFamilyTree}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      Create Tree
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-4">
            {familyTrees.isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
              </div>
            )}

            {familyTrees.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="text-red-600 font-semibold">
                  Error loading family trees
                </div>
                <div className="text-red-500 text-sm mt-1">
                  Please try refreshing the page
                </div>
              </div>
            )}

            {familyTrees.data && filteredAndSortedTrees.length === 0 && (
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-lg p-12 text-center">
                <TreePine className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">
                  {searchTerm ? 'No trees found' : 'No family trees yet'}
                </h3>
                <p className="text-slate-500 mb-4">
                  {searchTerm
                    ? 'Try adjusting your search terms'
                    : 'Create your first family tree to get started'}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Tree
                  </Button>
                )}
              </div>
            )}

            {filteredAndSortedTrees.map((tree) => (
              <FamilyTreeCard
                key={tree.id}
                familyTree={tree}
                formTitle={formsMap[tree.form_id]?.title || 'Unknown Form'}
                questionPrompt={
                  questionsMap.data?.[tree.question_id]?.prompt ||
                  'Unknown Question'
                }
              />
            ))}
          </div>
        </div>
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
