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
  DialogTrigger
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DialogDescription } from '@radix-ui/react-dialog';

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

  const { data: organization } = useQuery({
    queryKey: ['organization', user.id],
    queryFn: () => getOrganization(supabase, user.id)
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
                if (organization?.affiliation != updateAffiliation) {
                  await changeAffiliation(supabase, updateAffiliation, user.id);
                }
                if (organization?.name != renameText) {
                  await changeOrganizationName(supabase, renameText, user.id);
                }
                toast('Information successfully changed!');
                queryUtils.refetchQueries({ queryKey: ['organization'] });
                setEditInfoOpen(false);
              }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
