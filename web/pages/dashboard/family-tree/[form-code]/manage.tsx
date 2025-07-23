import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { User } from '@supabase/supabase-js';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TreeDeciduous, User2 } from 'lucide-react';
import {
  createChallenge,
  getChallenges
} from '@/utils/supabase/queries/family-tree-manage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFamilyTreeByCode } from '@/utils/supabase/queries/family-tree';
import ChallengeCard from '@/components/family-tree-manage-components/challenge-card';
import { useSupabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Clock } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';

type ManageFamilyTreePageProps = {
  user: User;
};

export default function ManageFamilyTreePage({
  user
}: ManageFamilyTreePageProps) {
  const queryUtils = useQueryClient();
  const supabase = useSupabase();
  const router = useRouter();
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [point, setPoint] = useState(0);
  const [deadline, setDeadline] = useState<Date | null>(null);

  const { 'form-code': formCode } = router.query;

  const { data: familyTree } = useQuery({
    queryKey: ['familyTree', formCode],
    queryFn: async () => await getFamilyTreeByCode(supabase, formCode as string)
  });

  const {
    data: challenges,
    isLoading: challengesLoading,
    error: challengesError
  } = useQuery({
    queryKey: ['challenges', formCode],
    queryFn: async () => {
      if (!familyTree || !familyTree.id) return [];
      const result = await getChallenges(supabase, familyTree.id);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!familyTree && !!familyTree.id
  });

  const handleCreateChallenge = async () => {
    if (!familyTree || !familyTree.id) return;
    try {
      await createChallenge(supabase, familyTree.id, prompt, point, deadline);
      queryUtils.invalidateQueries({ queryKey: ['challenges', formCode] });
    } catch {
      toast.error('Failed to create challenge');
    } finally {
      setChallengeOpen(false);
      setPrompt('');
      setPoint(0);
      setDeadline(null);
    }
  };

  return (
    <DashBoardLayout user={user}>
      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 p-1 mb-4">
        <Tabs className="w-full" defaultValue="forms">
          <TabsList className="h-12 p-1 bg-transparent rounded-lg w-full grid grid-cols-2">
            <TabsTrigger
              value="family-tree"
              onClick={() =>
                router.push(`/dashboard/family-tree/${formCode}/graph`)
              }
              className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800">
              <TreeDeciduous className="w-4 h-4" />
              <span className="hidden xs:inline">Family Tree</span>
            </TabsTrigger>
            <TabsTrigger
              value="forms"
              className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800">
              <User2 className="w-4 h-4" />
              <span className="hidden xs:inline">Manage Tree</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div>
        <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
          <DialogTrigger asChild>
            <Button>Create Challenge</Button>
          </DialogTrigger>
          <DialogContent>
            <Textarea
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter challenge prompt..."
            />
            <Label>Enter Deadline</Label>
            <Label htmlFor="point" className="text-black font-semibold">
              Point Value (Optional)
            </Label>
            <Input
              id="point"
              value={point}
              onChange={(e) => setPoint(Number(e.target.value))}
              placeholder="Enter point value..."
            />
            <Label htmlFor="deadline" className="text-black font-semibold">
              Deadline (Form&apos;s closing date & time / Optional)
            </Label>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-black hover:bg-white/20 justify-start w-full">
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {deadline ? (
                      <span>
                        {deadline.toLocaleDateString()}{' '}
                        {deadline.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    ) : (
                      <span>Pick a deadline</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/20 w-auto p-0">
                  <div className="p-4">
                    <Calendar
                      mode="single"
                      selected={deadline ?? undefined}
                      onSelect={(date) => setDeadline(date ?? null)}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      className="text-white"
                    />
                    {deadline && (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <Label className="text-black font-semibold text-sm mb-2 block">
                          <Clock className="inline w-4 h-4 mr-1" />
                          Set Time
                        </Label>
                        <Input
                          type="time"
                          value={deadline.toISOString().substring(11, 16)}
                          onChange={(e) => {
                            if (deadline) {
                              const [hours, minutes] = e.target.value
                                .split(':')
                                .map(Number);
                              const newDate = new Date(deadline);
                              newDate.setHours(hours, minutes, 0, 0);
                              setDeadline(newDate);
                            }
                          }}
                          className="bg-white/10 backdrop-blur-lg border border-white/20 text-white focus:border-pink-500/50 focus:ring-pink-500/20"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-red-400"
                          onClick={() => setDeadline(null)}>
                          Clear Deadline
                        </Button>
                      </div>
                    )}
                    {!deadline && (
                      <div className="mt-2 text-xs text-slate-300">
                        Select a date to set deadline.
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <DialogFooter>
              <Button onClick={handleCreateChallenge} disabled={!prompt}>
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-row space-x-2">
        {challengesLoading && <div>Loading challenges...</div>}
        {challengesError && (
          <div>Error loading challenges: {challengesError.message}</div>
        )}
        {!challengesLoading && !challengesError && challenges?.length === 0 && (
          <div>No challenges found.</div>
        )}
        {challenges?.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            family_id={challenge.family_tree_id}
          />
        ))}
      </div>
    </DashBoardLayout>
  );
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
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
};
