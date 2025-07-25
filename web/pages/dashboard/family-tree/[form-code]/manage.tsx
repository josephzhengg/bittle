import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { User } from '@supabase/supabase-js';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TreeDeciduous, User2 } from 'lucide-react';
import {
  createChallenge,
  getChallenges,
  createPointSubmissionWithChallenge,
  getPointSubmissions
} from '@/utils/supabase/queries/family-tree-manage';
import {
  getConnections,
  getFamilyTreeByCode,
  getIdentifier
} from '@/utils/supabase/queries/family-tree';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase';
import ChallengeCard from '@/components/family-tree-manage-components/challenge-card';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogFooter,
  DialogHeader,
  DialogTitle
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import { FamilyTree } from '@/utils/supabase/models/family-tree';
import { Challenges } from '@/utils/supabase/models/challenges';
import { PointSubmission } from '@/utils/supabase/models/point-submission';
import { Connections } from '@/utils/supabase/models/connection';
import { z } from 'zod';

// Define Pairing type for table display
const Pairing = z.object({
  id: z.string(),
  big: z.string(),
  little: z.string(),
  points: z.number()
});
type Pairing = z.infer<typeof Pairing>;

type ManageFamilyTreePageProps = {
  user: User;
};

export default function ManageFamilyTreePage({
  user
}: ManageFamilyTreePageProps) {
  const queryUtils = useQueryClient();
  const supabase = useSupabase();
  const router = useRouter();
  const [challengeOpen, setChallengeOpen] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [point, setPoint] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [submitChallengeOpen, setSubmitChallengeOpen] =
    useState<boolean>(false);
  const [customChallengeOpen, setCustomChallengeOpen] =
    useState<boolean>(false);
  const [viewSubmissionsOpen, setViewSubmissionsOpen] =
    useState<boolean>(false);
  const [selectedConnection, setSelectedConnection] =
    useState<Connections | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );

  const { 'form-code': formCode } = router.query as { 'form-code': string };

  const { data: familyTree } = useQuery<FamilyTree | null, Error>({
    queryKey: ['familyTree', formCode],
    queryFn: async () => await getFamilyTreeByCode(supabase, formCode)
  });

  const {
    data: challenges = [],
    isLoading: challengesLoading,
    error: challengesError
  } = useQuery<Challenges[], Error>({
    queryKey: ['challenges', formCode],
    queryFn: async () => {
      if (!familyTree?.id) return [];
      const result = await getChallenges(supabase, familyTree.id);
      console.log('Challenges:', result); // Debug log
      return result;
    },
    enabled: !!familyTree?.id
  });

  const { data: connections = [] } = useQuery<Connections[], Error>({
    queryKey: ['connections', familyTree?.id],
    queryFn: async () => {
      if (!familyTree?.id) return [];
      return await getConnections(supabase, familyTree.id);
    },
    enabled: !!familyTree?.id
  });

  const { data: pairings = [] } = useQuery<Pairing[], Error>({
    queryKey: ['pairings', familyTree?.id],
    queryFn: async () => {
      if (connections.length === 0) return [];
      const allUserIds = Array.from(
        new Set([
          ...connections.map((c) => c.big_id),
          ...connections.map((c) => c.little_id)
        ])
      );
      const identifierPromises = allUserIds.map((id) =>
        getIdentifier(supabase, id).then((identifier) => ({ id, identifier }))
      );
      const identifierResults = await Promise.all(identifierPromises);
      const identifierMap = new Map(
        identifierResults.map((result) => [result.id, result.identifier])
      );
      return Pairing.array().parse(
        connections.map((connection) => ({
          id: connection.id,
          big: identifierMap.get(connection.big_id) || 'Unknown',
          little: identifierMap.get(connection.little_id) || 'Unknown',
          points: connection.points ?? 0
        }))
      );
    },
    enabled: connections.length > 0
  });

  const { data: connectionSubmissions = [] } = useQuery<
    PointSubmission[],
    Error
  >({
    queryKey: ['connectionSubmissions', selectedConnection?.id],
    queryFn: async () => {
      if (!selectedConnection?.id) return [];
      return await getPointSubmissions(supabase, selectedConnection.id);
    },
    enabled: !!selectedConnection?.id && viewSubmissionsOpen
  });

  const handleCreateChallenge = async () => {
    if (!familyTree?.id || !prompt) return;
    try {
      await createChallenge(supabase, familyTree.id, prompt, point, deadline);
      queryUtils.invalidateQueries({ queryKey: ['challenges', formCode] });
      toast.success('Challenge created successfully!');
    } catch (error) {
      toast.error(
        `Failed to create challenge: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setChallengeOpen(false);
      setPrompt('');
      setPoint(null);
      setDeadline(null);
    }
  };

  const handleSubmitChallenge = async () => {
    if (!selectedConnection?.id || !selectedChallengeId) return;
    try {
      await createPointSubmissionWithChallenge(
        supabase,
        selectedConnection.id,
        selectedChallengeId
      );
      queryUtils.invalidateQueries({
        queryKey: ['challengeSubmissions', selectedChallengeId]
      });
      queryUtils.invalidateQueries({ queryKey: ['pairings', familyTree?.id] });
      toast.success('Challenge submitted successfully!');
    } catch (error) {
      toast.error(
        `Failed to submit challenge: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setSubmitChallengeOpen(false);
      setSelectedConnection(null);
      setSelectedChallengeId(null);
    }
  };

  const handleCreateCustomChallenge = async () => {
    if (!familyTree?.id || !selectedConnection?.id || !prompt) return;
    try {
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .insert({
          family_tree_id: familyTree.id,
          prompt,
          point_value: point,
          deadline: deadline?.toISOString()
        })
        .select()
        .single();
      if (challengeError) throw new Error(challengeError.message);
      await createPointSubmissionWithChallenge(
        supabase,
        selectedConnection.id,
        challenge.id
      );
      queryUtils.invalidateQueries({ queryKey: ['challenges', formCode] });
      queryUtils.invalidateQueries({ queryKey: ['pairings', familyTree?.id] });
      queryUtils.invalidateQueries({
        queryKey: ['challengeSubmissions', challenge.id]
      });
      toast.success('Custom challenge created and submitted successfully!');
    } catch (error) {
      toast.error(
        `Failed to create custom challenge: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setCustomChallengeOpen(false);
      setPrompt('');
      setPoint(null);
      setDeadline(null);
      setSelectedConnection(null);
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

      <div className="mb-6">
        <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
          <DialogTrigger asChild>
            <Button>Create Challenge</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Challenge</DialogTitle>
            </DialogHeader>
            <Textarea
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter challenge prompt..."
              value={prompt}
            />
            <Label htmlFor="point" className="text-black font-semibold">
              Point Value (Optional)
            </Label>
            <Input
              id="point"
              value={point ?? ''}
              onChange={(e) =>
                setPoint(e.target.value ? Number(e.target.value) : null)
              }
              placeholder="Enter point value..."
              type="number"
            />
            <Label htmlFor="deadline" className="text-black font-semibold">
              Deadline (Optional)
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
                        <Label className="text-white font-semibold text-sm mb-2 block">
                          <Clock className="inline w-4 h-4 mr-1" />
                          Set Time
                        </Label>
                        <Input
                          type="time"
                          value={
                            deadline
                              ? deadline.toISOString().substring(11, 16)
                              : ''
                          }
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

      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Connections</h2>
        {challengesLoading && <div>Loading challenges...</div>}
        <div className="mb-6">
          <div className="flex flex-row gap-4 overflow-x-auto pb-2">
            {challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                family_id={familyTree?.id ?? ''}
              />
            ))}
          </div>
        </div>

        {challengesError && (
          <div>Error loading challenges: {challengesError.message}</div>
        )}
        {!challengesLoading && !challengesError && pairings.length === 0 ? (
          <div>No connections found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connection</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pairings.map((pairing) => (
                <TableRow key={pairing.id}>
                  <TableCell>{`${pairing.big} & ${pairing.little}`}</TableCell>
                  <TableCell>{pairing.points}</TableCell>
                  <TableCell className="flex space-x-2">
                    <Dialog
                      open={
                        submitChallengeOpen &&
                        selectedConnection?.id === pairing.id
                      }
                      onOpenChange={(open) => {
                        setSubmitChallengeOpen(open);
                        if (!open) {
                          setSelectedConnection(null);
                          setSelectedChallengeId(null);
                        }
                      }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedConnection(
                              connections.find((c) => c.id === pairing.id) ||
                                null
                            )
                          }>
                          Submit to Challenge
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Submit {`${pairing.big} & ${pairing.little}`} to
                            Challenge
                          </DialogTitle>
                        </DialogHeader>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full"
                              disabled={challenges.length === 0}>
                              {selectedChallengeId
                                ? challenges.find(
                                    (c) => c.id === selectedChallengeId
                                  )?.prompt ?? 'Select Challenge'
                                : 'Select Challenge'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72">
                            <Command>
                              <CommandList>
                                {challenges.map((challenge) => {
                                  const hasSubmitted =
                                    connectionSubmissions.some(
                                      (s) =>
                                        s.challenge_id === challenge.id &&
                                        s.connection_id === pairing.id
                                    );
                                  return (
                                    <CommandItem
                                      key={challenge.id}
                                      disabled={hasSubmitted}
                                      onSelect={() =>
                                        setSelectedChallengeId(challenge.id)
                                      }>
                                      <div className="flex justify-between items-center w-full">
                                        <span>{challenge.prompt}</span>
                                        {hasSubmitted && (
                                          <span className="text-sm text-muted-foreground ml-2">
                                            Already submitted
                                          </span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <DialogFooter>
                          <Button
                            onClick={() => {
                              setSubmitChallengeOpen(false);
                              setSelectedConnection(null);
                              setSelectedChallengeId(null);
                            }}>
                            Cancel
                          </Button>
                          <Button
                            disabled={!selectedChallengeId}
                            onClick={handleSubmitChallenge}>
                            Submit
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog
                      open={
                        customChallengeOpen &&
                        selectedConnection?.id === pairing.id
                      }
                      onOpenChange={(open) => {
                        setCustomChallengeOpen(open);
                        if (!open) {
                          setPrompt('');
                          setPoint(null);
                          setDeadline(null);
                          setSelectedConnection(null);
                        }
                      }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedConnection(
                              connections.find((c) => c.id === pairing.id) ||
                                null
                            )
                          }>
                          Add Custom Challenge
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Add Custom Challenge for{' '}
                            {`${pairing.big} & ${pairing.little}`}
                          </DialogTitle>
                        </DialogHeader>
                        <Textarea
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Enter custom challenge prompt..."
                          value={prompt}
                        />
                        <Label
                          htmlFor="custom-point"
                          className="text-black font-semibold">
                          Point Value (Optional)
                        </Label>
                        <Input
                          id="custom-point"
                          value={point ?? ''}
                          onChange={(e) =>
                            setPoint(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          placeholder="Enter point value..."
                          type="number"
                        />
                        <Label
                          htmlFor="custom-deadline"
                          className="text-black font-semibold">
                          Deadline (Optional)
                        </Label>
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
                                  <Label className="text-white font-semibold text-sm mb-2 block">
                                    <Clock className="inline w-4 h-4 mr-1" />
                                    Set Time
                                  </Label>
                                  <Input
                                    type="time"
                                    value={
                                      deadline
                                        ? deadline
                                            .toISOString()
                                            .substring(11, 16)
                                        : ''
                                    }
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
                        <DialogFooter>
                          <Button
                            onClick={() => {
                              setCustomChallengeOpen(false);
                              setPrompt('');
                              setPoint(null);
                              setDeadline(null);
                              setSelectedConnection(null);
                            }}>
                            Cancel
                          </Button>
                          <Button
                            disabled={!prompt}
                            onClick={handleCreateCustomChallenge}>
                            Create and Submit
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog
                      open={
                        viewSubmissionsOpen &&
                        selectedConnection?.id === pairing.id
                      }
                      onOpenChange={(open) => {
                        setViewSubmissionsOpen(open);
                        if (!open) setSelectedConnection(null);
                      }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedConnection(
                              connections.find((c) => c.id === pairing.id) ||
                                null
                            )
                          }>
                          View Submissions
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Submissions for{' '}
                            {`${pairing.big} & ${pairing.little}`}
                          </DialogTitle>
                        </DialogHeader>
                        {connectionSubmissions.length === 0 ? (
                          <div>No submissions found.</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Challenge Prompt</TableHead>
                                <TableHead>Points</TableHead>
                                <TableHead>Submitted At</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {connectionSubmissions.map((submission) => (
                                <TableRow key={submission.id}>
                                  <TableCell>
                                    {submission.prompt ?? 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {submission.point ?? 'N/A'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        <DialogFooter>
                          <Button
                            onClick={() => {
                              setViewSubmissionsOpen(false);
                              setSelectedConnection(null);
                            }}>
                            Close
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
