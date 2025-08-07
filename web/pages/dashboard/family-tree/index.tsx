import { GetServerSidePropsContext } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import DashBoardLayout from '@/components/layouts/dashboard-layout';
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
import { useState } from 'react';
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
import { FamilyTree } from '@/utils/supabase/models/family-tree';

export type FamilyTreesPageProps = {
  user: User;
  initialFamilyTreesData: FamilyTree[];
  initialFormsData: Form[];
};

export default function FamilyTreesPage({
  user,
  initialFamilyTreesData,
  initialFormsData
}: FamilyTreesPageProps) {
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

  const handleFormSelect = (form: Form) => {
    setSelectedForm(form);
    setSelectedQuestion(null);
    setFormPopoverOpen(false);
  };

  const handleQuestionSelect = (question: Question) => {
    setSelectedQuestion(question);
    setQuestionPopoverOpen(false);
  };

  const familyTrees = useQuery({
    queryKey: ['family-trees', user.id],
    queryFn: async () => {
      return await getFamilyTrees(supabase, user.id);
    },
    initialData: initialFamilyTreesData,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true
  });

  const forms = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      return await getForms(supabase, user.id);
    },
    initialData: initialFormsData,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true
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
    if (!familyTitle || !selectedForm || !selectedQuestion) {
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
      familyTrees.refetch();
      router.push(`/dashboard/family-tree/${familyTree.code}`);
    } catch {
      toast(
        'Duplicate family tree found, please use the existing tree, or delete it before proceeding!'
      );
    }
  };

  const filteredAndSortedTrees =
    familyTrees.data?.filter(
      (tree) =>
        tree.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tree.code.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const availableForms =
    forms.data?.filter(
      (form: Form) =>
        !familyTrees.data?.some((tree) => tree.form_id === form.id)
    ) || [];

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
              <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/20 text-white">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    Create New Family Tree
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <Input
                    placeholder="Enter Family Tree Title"
                    value={familyTitle}
                    onChange={(e) => setFamilyTitle(e.target.value)}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20"
                  />
                  <Textarea
                    placeholder="Enter Family Tree Description (optional)"
                    value={familyDesc}
                    onChange={(e) => setFamilyDesc(e.target.value)}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20"
                  />
                  <Popover
                    open={formPopoverOpen}
                    onOpenChange={setFormPopoverOpen}
                    modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={formPopoverOpen}
                        className="w-full justify-between text-left h-auto py-4 px-4 bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20">
                        <div className="flex items-center gap-2">
                          <span className="truncate">
                            {selectedForm ? selectedForm.title : 'Select Form'}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-slate-900/95 backdrop-blur-lg border border-white/20">
                      <Command className="bg-transparent">
                        <CommandInput
                          placeholder="Search forms..."
                          className="text-white placeholder:text-white/60 border-b border-white/20"
                        />
                        <CommandEmpty className="text-white/80 py-6 text-center">
                          No forms found.
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandList className="max-h-64 overflow-y-auto">
                            <div
                              className="overscroll-contain"
                              style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor:
                                  'rgba(255,255,255,0.2) transparent'
                              }}
                              tabIndex={0}
                              onFocus={(e) => e.currentTarget.focus()}>
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
                              {availableForms.map((form) => (
                                <CommandItem
                                  key={form.id}
                                  onSelect={() => handleFormSelect(form)}
                                  className={`text-lg py-4 px-4 rounded-lg cursor-pointer transition-all duration-200 ${
                                    selectedForm?.id === form.id
                                      ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white border border-purple-400/40 shadow-md'
                                      : 'text-white/90 hover:bg-purple-500/15 hover:text-white'
                                  }`}>
                                  <div className="flex items-center justify-between w-full">
                                    <div>
                                      <span className="font-semibold">
                                        {form.title}
                                      </span>
                                      <p className="text-sm text-white/70">
                                        {form.code}
                                      </p>
                                    </div>
                                    {selectedForm?.id === form.id && (
                                      <Check className="h-4 w-4 text-purple-300" />
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
                    <Popover
                      open={questionPopoverOpen}
                      onOpenChange={setQuestionPopoverOpen}
                      modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={questionPopoverOpen}
                          className="w-full justify-between text-left h-auto py-4 px-4 bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20">
                          <div className="flex items-center gap-2">
                            <span className="truncate">
                              {selectedQuestion
                                ? selectedQuestion.prompt
                                : 'Select Question'}
                            </span>
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-slate-900/95 backdrop-blur-lg border border-white/20">
                        <Command className="bg-transparent">
                          <CommandInput
                            placeholder="Search questions..."
                            className="text-white placeholder:text-white/60 border-b border-white/20"
                          />
                          <CommandEmpty className="text-white/80 py-6 text-center">
                            No questions found.
                          </CommandEmpty>
                          <CommandGroup>
                            <div className="p-3 border-b border-white/20 bg-slate-900/50 sticky top-0 z-10">
                              <h3 className="font-semibold text-white">
                                {selectedForm.title}
                              </h3>
                            </div>
                            <CommandList className="max-h-64 overflow-y-auto">
                              <div
                                className="overscroll-contain"
                                style={{
                                  scrollbarWidth: 'thin',
                                  scrollbarColor:
                                    'rgba(255,255,255,0.2) transparent'
                                }}
                                tabIndex={0}
                                onFocus={(e) => e.currentTarget.focus()}>
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
                                {questions.data?.map((question) => (
                                  <CommandItem
                                    key={question.id}
                                    onSelect={() =>
                                      handleQuestionSelect(question)
                                    }
                                    className={`text-lg py-4 px-4 rounded-lg cursor-pointer transition-all duration-200 ${
                                      selectedQuestion?.id === question.id
                                        ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white border border-purple-400/40 shadow-md'
                                        : 'text-white/90 hover:bg-purple-500/15 hover:text-white'
                                    }`}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{question.prompt}</span>
                                      {selectedQuestion?.id === question.id && (
                                        <Check className="h-4 w-4 text-purple-300" />
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
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    Create Tree
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Family Trees Grid */}
          {familyTrees.isLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-full">
                  <div className="relative bg-white/80 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="relative z-10 flex items-center p-6 gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="w-20 h-1 rounded-full mb-3 bg-gray-200 animate-pulse"></div>
                        <div className="h-6 w-3/4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="h-4 w-full bg-gray-200 rounded mb-4 animate-pulse"></div>
                        <div className="flex flex-wrap gap-4">
                          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
          )}
          {familyTrees.data && filteredAndSortedTrees.length > 0 && (
            <div className="space-y-4">
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
          )}
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

  let initialFamilyTreesData: FamilyTree[] = [];
  let initialFormsData: Form[] = [];
  try {
    initialFamilyTreesData = await getFamilyTrees(supabase, userData.user.id);
    initialFormsData = await getForms(supabase, userData.user.id);
  } catch {
    initialFamilyTreesData = [];
    initialFormsData = [];
  }

  return {
    props: {
      user: userData.user,
      initialFamilyTreesData,
      initialFormsData
    }
  };
}
