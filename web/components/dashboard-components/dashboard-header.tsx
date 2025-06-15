import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/router';
import { Label } from '@/components/ui/label';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOrganization,
  changeOrganizationName,
  changeAffiliation
} from '@/utils/supabase/queries/organization';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Edit, Plus, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { createForm, getCodes } from '@/utils/supabase/queries/form';
import { createTemplateQuestions } from '@/utils/supabase/queries/question';
import { MobileNav } from './mobile-nav';

export type DashboardHeaderProps = {
  user: User;
};

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const queryUtils = useQueryClient();
  const supabase = useSupabase();
  const router = useRouter();

  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [updateAffiliation, setUpdateAffiliation] = useState('');

  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [code, setCode] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(new Date());
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  useEffect(() => {
    if (!createFormOpen) {
      setDeadline(undefined);
      // Reset form when dialog closes
      setTitle('');
      setDescription(undefined);
      setCode('');
    }
  }, [createFormOpen]);

  const { data: organization } = useQuery({
    queryKey: ['organization', user.id],
    queryFn: () => getOrganization(supabase, user.id)
  });

  const { data: codes } = useQuery({
    queryKey: ['codes'],
    queryFn: () => getCodes(supabase)
  });

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast('Error logging out.', { description: error.message });
    } else {
      toast('Logged out successfully!', {
        description: 'You have been logged out.'
      });
    }
    router.push('/login');
  };

  const handleCreateForm = async () => {
    if (!title || !code) {
      toast('Please fill in required fields', {
        description: 'Title and Code are required.'
      });
      return;
    }

    setIsCreatingForm(true);

    try {
      // Check if code is taken first
      const isCodeTaken = codes?.includes(code);
      if (isCodeTaken) {
        toast('Code already taken! Please choose another.');
        return;
      }

      // Create the form
      const form = await createForm(
        supabase,
        user.id,
        code,
        description,
        deadline,
        title
      );

      // Create template questions
      await createTemplateQuestions(supabase, form.id);

      // Success - show toast and navigate
      toast('Form successfully created!', {
        description:
          'Template questions have been added automatically. Please give us a moment.'
      });

      // Refresh codes cache
      queryUtils.invalidateQueries({ queryKey: ['codes'] });

      // Close dialog and navigate
      setCreateFormOpen(false);
      router.push(`/dashboard/current/form/${code}/edit`);
    } catch (error) {
      console.error('Error creating form:', error);

      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes('template questions')) {
          toast('Form created but failed to add template questions', {
            description: 'You can add questions manually in the form editor.'
          });
          // Still navigate to the form editor
          setCreateFormOpen(false);
          router.push(`/dashboard/current/form/${code}/edit`);
        } else {
          toast('Failed to create form', {
            description: error.message
          });
        }
      } else {
        toast('Failed to create form. Please try again.');
      }
    } finally {
      setIsCreatingForm(false);
    }
  };

  useEffect(() => {
    setRenameText(organization?.name ?? '');
    setUpdateAffiliation(organization?.affiliation ?? '');
  }, [organization]);

  return (
    <header className="relative bg-gradient-to-r from-purple-900/80 via-blue-900/80 to-pink-900/80 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute -top-2 right-8 w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute -bottom-2 left-1/2 w-20 h-20 bg-gradient-to-br from-purple-500/15 to-pink-500/15 rounded-full blur-lg animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row shrink-0 gap-4 min-h-[88px] py-4 px-4">
        {/* Top row on mobile, left side on desktop */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          {/* Mobile Navigation */}
          <MobileNav />

          {/* Organization Info with glassmorphism card */}
          <div className="flex flex-col min-w-0 flex-1 sm:flex-initial bg-white/10 backdrop-blur-lg rounded-2xl px-4 py-3 border border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-8 bg-gradient-to-b from-pink-500 to-purple-500 rounded-full"></div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-black break-words leading-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  {organization?.name || 'Organization'}
                </h1>
                <p className="text-sm sm:text-base text-blue-200/80 break-words font-medium">
                  {organization?.affiliation || 'Affiliation'}
                </p>
              </div>
            </div>
          </div>

          {/* Edit button with modern styling */}
          <Dialog
            open={editInfoOpen}
            onOpenChange={(isOpen) => setEditInfoOpen(isOpen)}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl hover:bg-white/20 hover:scale-105 transition-all duration-300 text-white">
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit organization info</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/20 text-white">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Edit your info
                </DialogTitle>
              </DialogHeader>
              <DialogDescription className="text-blue-200">
                Change your profile content to your liking here!
              </DialogDescription>
              <div className="flex flex-col gap-3 py-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-blue-100 font-semibold">
                    Display Name
                  </Label>
                  <Input
                    id="name"
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20"
                  />
                  <Label
                    htmlFor="affiliation"
                    className="text-blue-100 font-semibold">
                    Affiliation
                  </Label>
                  <Input
                    id="affiliation"
                    value={updateAffiliation}
                    onChange={(e) => setUpdateAffiliation(e.target.value)}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={renameText.length < 1}
                  type="submit"
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={async () => {
                    try {
                      if (organization?.affiliation != updateAffiliation) {
                        await changeAffiliation(
                          supabase,
                          updateAffiliation,
                          user.id
                        );
                      }
                      if (organization?.name != renameText) {
                        await changeOrganizationName(
                          supabase,
                          renameText,
                          user.id
                        );
                      }
                      toast('Information successfully changed!');
                      queryUtils.refetchQueries({ queryKey: ['organization'] });
                      setEditInfoOpen(false);
                    } catch (error) {
                      console.error('Error editing profile:', error);
                      toast('Failed to edit profile. Please try again.');
                    }
                  }}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Action buttons with gradient styling */}
        <div className="flex items-center gap-3 sm:ml-auto">
          <Dialog
            open={createFormOpen}
            onOpenChange={(isOpen) => setCreateFormOpen(isOpen)}>
            <DialogTrigger asChild>
              <Button className="whitespace-nowrap bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0">
                <Plus className="w-4 h-4 mr-2" />
                Create Form
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/20 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Create your form
                </DialogTitle>
              </DialogHeader>
              <DialogDescription className="text-blue-200">
                This is the beginning of crafting perfect families in your
                organization! Template questions will be added automatically.
              </DialogDescription>
              <div className="flex flex-col gap-3 py-3">
                <div className="flex flex-col gap-2 space-y-2">
                  <Label
                    htmlFor="title"
                    className="text-blue-100 font-semibold">
                    Title *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter form title"
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20"
                  />
                  <Label htmlFor="code" className="text-blue-100 font-semibold">
                    Code * (the code to let other people submit your form!)
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\s+/g, '').toUpperCase())
                    }
                    placeholder="FORM_CODE"
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20 font-mono"
                  />
                  <Label
                    htmlFor="description"
                    className="text-blue-100 font-semibold">
                    Description (Optional)
                  </Label>
                  <Input
                    id="description"
                    value={description ?? ''}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your form"
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20"
                  />
                  <Label
                    htmlFor="deadline"
                    className="text-blue-100 font-semibold">
                    Deadline (Form&apos;s closing date / Optional)
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 justify-start">
                        {deadline ? (
                          deadline.toDateString()
                        ) : (
                          <span>Select a deadline</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/20">
                      <Calendar
                        mode="single"
                        selected={deadline}
                        onSelect={setDeadline}
                        disabled={(date) => date < new Date()}
                        className="text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateForm}
                  disabled={isCreatingForm || !title || !code}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isCreatingForm ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Form
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="destructive"
            onClick={handleLogout}
            className="whitespace-nowrap bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
