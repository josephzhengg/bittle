import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
  getFamilyTrees,
  createFamilyTree
} from '@/utils/supabase/queries/family-tree';
import { getForms } from '@/utils/supabase/queries/form';
import { getQuestions } from '@/utils/supabase/queries/question';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase';
import { Form } from '@/utils/supabase/models/form';
import { Question } from '@/utils/supabase/models/question';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import FamilyTreeCardSkeleton from '@/components/family-tree-components/family-tree-card-skeleton';
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
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { TreePine, Plus, Search, ChevronsUpDown, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { GetServerSidePropsContext } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import type { User } from '@supabase/supabase-js';
import { Label } from '@/components/ui/label';

const DashBoardLayout = dynamic(
  () => import('@/components/layouts/dashboard-layout'),
  { ssr: true }
);
const FamilyTreeCard = dynamic(
  () => import('@/components/family-tree-components/family-tree-card'),
  {
    ssr: false,
    loading: () => <FamilyTreeCardSkeleton />
  }
);

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
  const [formPopoverOpen, setFormPopoverOpen] = useState(false);
  const [questionPopoverOpen, setQuestionPopoverOpen] = useState(false);

  useEffect(() => {
    router.prefetch('/dashboard/family-tree/[code]');
  }, [router]);

  const handleFormSelect = (form: Form): void => {
    setSelectedForm(form);
    setSelectedQuestion(null);
    setFormPopoverOpen(false);
  };

  const handleQuestionSelect = (question: Question): void => {
    setSelectedQuestion(question);
    setQuestionPopoverOpen(false);
  };

  const familyTrees = useQuery({
    queryKey: ['family-trees', user.id],
    queryFn: async () => {
      return await getFamilyTrees(supabase, user.id);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000
  });

  const forms = useQuery({
    queryKey: ['forms', user.id],
    queryFn: async () => {
      return await getForms(supabase, user.id);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2
  });

  const questions = useQuery({
    queryKey: ['questions', selectedForm?.id],
    queryFn: async () => {
      if (selectedForm) {
        return await getQuestions(supabase, selectedForm.id);
      }
      return [];
    },
    enabled: !!selectedForm,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });

  const formsMap = useMemo((): Record<string, Form> => {
    return (
      forms.data?.reduce((acc: Record<string, Form>, form: Form) => {
        acc[form.id] = form;
        return acc;
      }, {} as Record<string, Form>) || {}
    );
  }, [forms.data]);

  const questionsMap = useQuery({
    queryKey: ['all-questions', user.id],
    queryFn: async (): Promise<Record<string, Question>> => {
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
    enabled: !!forms.data,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const handleCreateFamilyTree = async (): Promise<void> => {
    if (!familyTitle || !selectedForm || !selectedQuestion || !user) {
      toast.error('Please enter a title and select a form and question');
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
      setFamilyDesc('');
      setSelectedForm(null);
      setSelectedQuestion(null);
      toast('Family tree created successfully!');
      await familyTrees.refetch();
      await router.push(`/dashboard/family-tree/${familyTree.code}`);
    } catch {
      toast(
        'Duplicate family tree found, please use the existing tree, or delete it before proceeding!'
      );
    }
  };

  const filteredAndSortedTrees = useMemo(() => {
    return (
      familyTrees.data?.filter(
        (tree) =>
          tree.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tree.code.toLowerCase().includes(searchTerm.toLowerCase())
      ) || []
    );
  }, [familyTrees.data, searchTerm]);

  const availableForms = useMemo(() => {
    return (
      forms.data?.filter(
        (form: Form) =>
          !familyTrees.data?.some((tree) => tree.form_id === form.id)
      ) || []
    );
  }, [forms.data, familyTrees.data]);

  return (
    <DashBoardLayout user={user}>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Your Family Trees
            </h1>
            <p className="text-slate-600">
              Manage and explore all your family trees in one place
            </p>
          </div>

          {/* Search and Create Button */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div className="relative flex-1 max-w-lg">
              <Input
                placeholder="Search family trees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/70 backdrop-blur-sm border border-slate-200"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Tree
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-0 shadow-2xl text-gray-900 rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Create New Family Tree
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div>
                    <Label
                      htmlFor="familyTitle"
                      className="text-gray-700 font-medium text-sm">
                      Family Tree Title *
                    </Label>
                    <Input
                      id="familyTitle"
                      placeholder="Enter family tree title"
                      value={familyTitle}
                      onChange={(e) => setFamilyTitle(e.target.value)}
                      className="mt-1 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20 rounded-lg"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="familyDesc"
                      className="text-gray-700 font-medium text-sm">
                      Description{' '}
                      <span className="text-gray-500 font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <Textarea
                      id="familyDesc"
                      placeholder="Brief description of your family tree"
                      value={familyDesc}
                      onChange={(e) => setFamilyDesc(e.target.value)}
                      className="mt-1 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20 rounded-lg resize-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium text-sm">
                      Select Form *
                    </Label>
                    <Popover
                      open={formPopoverOpen}
                      onOpenChange={setFormPopoverOpen}
                      modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={formPopoverOpen}
                          className="w-full justify-between text-left h-auto py-4 px-4 bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg mt-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate">
                              {selectedForm
                                ? selectedForm.title
                                : 'Select a form'}
                            </span>
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-white border-gray-200 shadow-xl rounded-xl">
                        <Command className="bg-transparent">
                          <CommandInput
                            placeholder="Search forms..."
                            className="text-gray-900 placeholder:text-gray-400 border-b border-gray-200"
                          />
                          <CommandEmpty className="text-gray-500 py-6 text-center">
                            No forms found.
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandList className="max-h-64 overflow-y-auto">
                              <div
                                className="overscroll-contain"
                                style={{
                                  scrollbarWidth: 'thin',
                                  scrollbarColor:
                                    'rgba(156,163,175,0.5) transparent'
                                }}
                                tabIndex={0}
                                onFocus={(e) => e.currentTarget.focus()}>
                                {forms.isLoading && (
                                  <div className="p-4 text-center text-gray-500">
                                    Loading forms...
                                  </div>
                                )}
                                {forms.error && (
                                  <div className="p-4 text-center text-red-500">
                                    Error loading forms
                                  </div>
                                )}
                                {availableForms.map((form) => (
                                  <CommandItem
                                    key={form.id}
                                    onSelect={() => handleFormSelect(form)}
                                    className={`text-lg py-4 px-4 rounded-lg cursor-pointer transition-all duration-200 ${
                                      selectedForm?.id === form.id
                                        ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-gray-900 border border-purple-300 shadow-sm'
                                        : 'text-gray-700 hover:bg-purple-50 hover:text-gray-900'
                                    }`}>
                                    <div className="flex items-center justify-between w-full">
                                      <div>
                                        <span className="font-semibold">
                                          {form.title}
                                        </span>
                                        <p className="text-sm text-gray-500">
                                          {form.code}
                                        </p>
                                      </div>
                                      {selectedForm?.id === form.id && (
                                        <Check className="h-4 w-4 text-purple-600" />
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </div>
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedForm && (
                      <p className="text-xs text-gray-500 mt-2 px-2">
                        💡 This form will serve as the foundation for your
                        family tree structure
                      </p>
                    )}
                  </div>

                  {selectedForm && (
                    <div>
                      <Label className="text-gray-700 font-medium text-sm">
                        Select Question *
                      </Label>
                      <Popover
                        open={questionPopoverOpen}
                        onOpenChange={setQuestionPopoverOpen}
                        modal={true}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={questionPopoverOpen}
                            className="w-full justify-between text-left h-auto py-4 px-4 bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg mt-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate">
                                {selectedQuestion
                                  ? selectedQuestion.prompt
                                  : 'Select a question'}
                              </span>
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-white border-gray-200 shadow-xl rounded-xl">
                          <Command className="bg-transparent">
                            <CommandInput
                              placeholder="Search questions..."
                              className="text-gray-900 placeholder:text-gray-400 border-b border-gray-200"
                            />
                            <CommandEmpty className="text-gray-500 py-6 text-center">
                              No questions found.
                            </CommandEmpty>
                            <CommandGroup>
                              <div className="p-3 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                                <h3 className="font-semibold text-gray-900">
                                  {selectedForm.title}
                                </h3>
                              </div>
                              <CommandList className="max-h-64 overflow-y-auto">
                                <div
                                  className="overscroll-contain"
                                  style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor:
                                      'rgba(156,163,175,0.5) transparent'
                                  }}
                                  tabIndex={0}
                                  onFocus={(e) => e.currentTarget.focus()}>
                                  {questions.isLoading && (
                                    <div className="p-4 text-center text-gray-500">
                                      Loading questions...
                                    </div>
                                  )}
                                  {questions.error && (
                                    <div className="p-4 text-center text-red-500">
                                      Error loading questions
                                    </div>
                                  )}
                                  {questions.data?.map((question) => (
                                    <CommandItem
                                      key={question.id}
                                      onSelect={() =>
                                        handleQuestionSelect(question)
                                      }
                                      className={`text-lg py-4 px-4 rounded-lg cursor-pointer transition-all duration-200 ${
                                        selectedQuestion?.id === question.id
                                          ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-gray-900 border border-purple-300 shadow-sm'
                                          : 'text-gray-700 hover:bg-purple-50 hover:text-gray-900'
                                      }`}>
                                      <div className="flex items-center justify-between w-full">
                                        <span>{question.prompt}</span>
                                        {selectedQuestion?.id ===
                                          question.id && (
                                          <Check className="h-4 w-4 text-purple-600" />
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </div>
                              </CommandList>
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {selectedQuestion && (
                        <p className="text-xs text-gray-500 mt-2 px-2">
                          🏷️ Responses to this question will be used as node
                          identifiers in your family tree
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCreateModalOpen(false)}
                    className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg">
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      !familyTitle || !selectedForm || !selectedQuestion
                    }
                    onClick={() => void handleCreateFamilyTree()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-lg">
                    Create Tree
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Family Trees Grid - Optimized rendering */}
          {familyTrees.isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <FamilyTreeCardSkeleton key={i} />
              ))}
            </div>
          ) : familyTrees.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-600 font-semibold">
                Error loading family trees
              </div>
              <div className="text-red-500 text-sm mt-1">
                Please try refreshing the page
              </div>
            </div>
          ) : familyTrees.data && filteredAndSortedTrees.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
                <TreePine className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {searchTerm ? 'No trees found' : 'No family trees yet'}
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Create your first family tree to get started'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Tree
                </Button>
              )}
            </div>
          ) : (
            familyTrees.data &&
            filteredAndSortedTrees.length > 0 && (
              <div className="space-y-4">
                {filteredAndSortedTrees.map((tree) => (
                  <FamilyTreeCard
                    key={tree.id}
                    familyTree={tree}
                    formTitle={
                      formsMap[tree.form_id]?.title || 'Unknown or Deleted Form'
                    }
                    questionPrompt={
                      questionsMap.data?.[tree.question_id]?.prompt ||
                      'Unknown or Deleted Question'
                    }
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </DashBoardLayout>
  );
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const supabase = createSupabaseServerClient(context);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    } as const;
  }

  return {
    props: {
      user
    }
  } as const;
};
