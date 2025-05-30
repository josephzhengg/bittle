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

  useEffect(() => {
    if (!createFormOpen) {
      setDeadline(undefined);
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

  useEffect(() => {
    setRenameText(organization?.name ?? '');
    setUpdateAffiliation(organization?.affiliation ?? '');
  }, [organization]);

  return (
    <header className="bg-sidebar flex flex-row shrink-0 items-center gap-4 border-b z-50 h-30 p-4">
      <div className="flex flex-col space-y-2">
        <Label className="text-2xl">{organization?.name}</Label>
        <Label className="text-secondary">{organization?.affiliation}</Label>
      </div>
      <div className="flex-grow text-lg font-bold text-center">Dashboard</div>

      <Dialog
        open={createFormOpen}
        onOpenChange={(isOpen) => setCreateFormOpen(isOpen)}>
        <DialogTrigger asChild>
          <Button>Create Form</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-3xl">Create your form</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            This is the beginning of crafting perfect families in your
            organization!
          </DialogDescription>
          <div className="flex flex-col gap-3 py-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Label htmlFor="code" className="text-right">
                Code (the code to let other people submit your form!)
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\s+/g, '').toUpperCase())
                }
              />
              <Label htmlFor="description" className="text-right">
                Description (Optional)
              </Label>
              <Input
                id="description"
                value={description ?? ''}
                onChange={(e) => setDescription(e.target.value)}
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
              onClick={() => {
                if (title && code) {
                  queryUtils.refetchQueries({ queryKey: ['codes'] });

                  const isCodeTaken = codes?.includes(code);
                  if (isCodeTaken) {
                    toast('Code already taken! Please choose another.');
                    return;
                  }

                  try {
                    createForm(
                      supabase,
                      user.id,
                      code,
                      description,
                      deadline,
                      title
                    );
                    toast('Form successfully created!');
                    router.push(`/dashboard/form/${code}`);
                  } catch (error) {
                    console.error('Error creating form:', error);
                    toast('Failed to create form. Please try again.');
                  }
                }
              }}>
              Create Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button variant="destructive" onClick={handleLogout}>
        Logout
      </Button>
      <Dialog
        open={editInfoOpen}
        onOpenChange={(isOpen) => setEditInfoOpen(isOpen)}>
        <DialogTrigger asChild>
          <Edit />
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
                    await changeOrganizationName(supabase, renameText, user.id);
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
    </header>
  );
}
