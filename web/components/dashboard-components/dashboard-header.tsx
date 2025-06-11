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
import { Edit } from 'lucide-react';
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
    <header className="bg-sidebar flex flex-col sm:flex-row shrink-0 gap-4 border-b z-50 min-h-[88px] py-4 px-4">
      {/* Top row on mobile, left side on desktop */}
      <div className="flex items-center justify-between sm:justify-start gap-4">
        {/* Mobile Navigation */}
        <MobileNav />

        {/* Organization Info - Now with responsive text sizing */}
        <div className="flex flex-col min-w-0 flex-1 sm:flex-initial">
          <Label className="text-xl sm:text-2xl font-semibold text-foreground break-words leading-tight">
            {organization?.name || 'Organization Name'}
          </Label>
          <Label className="text-sm sm:text-base text-secondary break-words">
            {organization?.affiliation || 'Affiliation'}
          </Label>
        </div>

        {/* Edit button - moved to be with org info on mobile */}
        <Dialog
          open={editInfoOpen}
          onOpenChange={(isOpen) => setEditInfoOpen(isOpen)}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit organization info</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-3xl">Edit your info</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Change your profile content to your liking here!
            </DialogDescription>
            <div className="flex flex-col gap-3 py-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-right">
                  Display Name
                </Label>
                <Input
                  id="name"
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                />
                <Label htmlFor="affiliation" className="text-right">
                  Affiliation
                </Label>
                <Input
                  id="affiliation"
                  value={updateAffiliation}
                  onChange={(e) => setUpdateAffiliation(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={renameText.length < 1}
                type="submit"
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
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Action buttons - second row on mobile, right side on desktop */}
      <div className="flex items-center gap-3 sm:ml-auto">
        <Dialog
          open={createFormOpen}
          onOpenChange={(isOpen) => setCreateFormOpen(isOpen)}>
          <DialogTrigger asChild>
            <Button className="whitespace-nowrap">Create Form</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-3xl">Create your form</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              This is the beginning of crafting perfect families in your
              organization! Template questions will be added automatically.
            </DialogDescription>
            <div className="flex flex-col gap-3 py-3">
              <div className="flex flex-col gap-2 space-y-2">
                <Label htmlFor="title" className="text-right">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter form title"
                />
                <Label htmlFor="code" className="text-right">
                  Code * (the code to let other people submit your form!)
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\s+/g, '').toUpperCase())
                  }
                  placeholder="FORM_CODE"
                />
                <Label htmlFor="description" className="text-right">
                  Description (Optional)
                </Label>
                <Input
                  id="description"
                  value={description ?? ''}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your form"
                />
                <Label htmlFor="deadline" className="text-right">
                  Deadline (Form&apos;s closing date / Optional)
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      {deadline ? (
                        deadline.toDateString()
                      ) : (
                        <span>Select a deadline</span>
                      )}
                      <CalendarIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={setDeadline}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateForm}
                disabled={isCreatingForm || !title || !code}>
                {isCreatingForm ? 'Creating...' : 'Create Form'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="destructive"
          onClick={handleLogout}
          className="whitespace-nowrap">
          Logout
        </Button>
      </div>
    </header>
  );
}
