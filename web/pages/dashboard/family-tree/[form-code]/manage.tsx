import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { User } from '@supabase/supabase-js';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TreeDeciduous,
  User2,
  PlusCircle,
  SortAsc,
  Trophy,
  FileText,
  ArrowUpDown
} from 'lucide-react';
import {
  createChallenge,
  getChallenges,
  createPointSubmissionWithChallenge,
  getPointSubmissions,
  updateChallenge,
  deleteChallenge,
  createPointSubmission
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
import { Label } from '@/components/ui/label';
import { CalendarIcon, Clock } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import { FamilyTree } from '@/utils/supabase/models/family-tree';
import { Challenges } from '@/utils/supabase/models/challenges';
import { PointSubmission } from '@/utils/supabase/models/point-submission';
import { Connections } from '@/utils/supabase/models/connection';
import { z } from 'zod';
import PairingSubmissionLogs from '@/components/family-tree-manage-components/pairing-submissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { EmojiTextArea } from '@/components/general/emoji-textarea';
const Pairing = z.object({
  id: z.string(),
  big: z.string(),
  little: z.string()
});
type Pairing = z.infer<typeof Pairing>;
const handleIntegerInput = (
  value: string,
  setter: (value: number | null) => void
) => {
  if (value === '') {
    setter(null);
    return;
  }
  const intValue = parseInt(value, 10);
  if (!isNaN(intValue) && intValue >= 0 && intValue.toString() === value) {
    setter(intValue);
  }
};
type ManageFamilyTreePageProps = {
  user: User;
  familyTreeData: FamilyTree | null;
};
type SortOption = 'alphabetical' | 'points-desc' | 'points-asc';
export default function ManageFamilyTreePage({
  user,
  familyTreeData
}: ManageFamilyTreePageProps) {
  const queryUtils = useQueryClient();
  const supabase = useSupabase();
  const router = useRouter();
  const [challengeOpen, setChallengeOpen] = useState<boolean>(false);
  const [editChallengeOpen, setEditChallengeOpen] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [point, setPoint] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [submitChallengeOpen, setSubmitChallengeOpen] =
    useState<boolean>(false);
  const [selectedConnection, setSelectedConnection] =
    useState<Connections | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );
  const [customPointOpen, setCustomPointOpen] = useState<boolean>(false);
  const [submissionLogsOpen, setSubmissionLogsOpen] = useState<boolean>(false);
  const [customPointPrompt, setCustomPointPrompt] = useState<string>('');
  const [customPointValue, setCustomPointValue] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
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
          little: identifierMap.get(connection.little_id) || 'Unknown'
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
    enabled: !!selectedConnection?.id && submitChallengeOpen
  });
  const sortedPairings = [...pairings].sort((a, b) => {
    const connectionA = connections.find((c) => c.id === a.id);
    const connectionB = connections.find((c) => c.id === b.id);
    const pointsA = connectionA?.points || 0;
    const pointsB = connectionB?.points || 0;
    switch (sortBy) {
      case 'points-desc':
        return pointsB - pointsA;
      case 'points-asc':
        return pointsA - pointsB;
      case 'alphabetical':
      default:
        return a.big.localeCompare(b.big);
    }
  });
  const handleCreateCustomPointSubmission = async () => {
    if (!selectedConnection?.id || customPointValue === null) return;
    try {
      await createPointSubmission(
        supabase,
        selectedConnection.id,
        customPointPrompt || 'Custom point award',
        customPointValue
      );
      queryUtils.invalidateQueries({
        queryKey: ['connections', familyTree?.id]
      });
      queryUtils.invalidateQueries({ queryKey: ['pairings', familyTree?.id] });
      queryUtils.invalidateQueries({
        queryKey: ['pairingSubmissions', selectedConnection.id]
      });
      toast.success('Custom points added successfully!');
    } catch (error) {
      toast.error(
        `Failed to add custom points: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setCustomPointOpen(false);
      setCustomPointPrompt('');
      setCustomPointValue(null);
      setSelectedConnection(null);
    }
  };
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
  const handleEditChallenge = async (challengeId: string) => {
    if (!familyTree?.id || !prompt) return;
    try {
      await updateChallenge(supabase, challengeId, prompt, point, deadline);
      queryUtils.invalidateQueries({ queryKey: ['challenges', formCode] });
      toast.success('Challenge updated successfully!');
    } catch (error) {
      toast.error(
        `Failed to update challenge: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setEditChallengeOpen(false);
      setPrompt('');
      setPoint(null);
      setDeadline(null);
      setSelectedChallengeId(null);
    }
  };
  const handleDeleteChallenge = async (challengeId: string) => {
    try {
      await deleteChallenge(supabase, challengeId);
      queryUtils.invalidateQueries({ queryKey: ['challenges', formCode] });
      queryUtils.invalidateQueries({
        queryKey: ['connections', familyTree?.id]
      });
      queryUtils.invalidateQueries({ queryKey: ['pairings', familyTree?.id] });
      toast.success('Challenge deleted successfully!');
    } catch (error) {
      toast.error(
        `Failed to delete challenge: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
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
        queryKey: ['connections', familyTree?.id]
      });
      queryUtils.invalidateQueries({
        queryKey: ['pairings', familyTree?.id]
      });
      queryUtils.invalidateQueries({
        queryKey: ['connectionSubmissions', selectedConnection.id]
      });
      queryUtils.invalidateQueries({
        queryKey: ['pairingSubmissions', selectedConnection.id]
      });
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
  return (
    <DashBoardLayout user={user}>
      <div className="max-w-10xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words min-w-0 flex-1">
                {familyTreeData?.title || 'Family Tree'}
              </h1>
              <Badge
                variant="outline"
                className="text-xs w-fit bg-purple-50 text-purple-700 border-purple-200">
                {formCode}
              </Badge>
            </div>
            {familyTreeData?.description && (
              <p className="text-muted-foreground text-sm">
                {familyTreeData.description}
              </p>
            )}
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 p-1 mb-4">
          <Tabs className="w-full" defaultValue="manage">
            <TabsList className="h-10 sm:h-12 p-1 bg-transparent rounded-lg w-full grid grid-cols-2">
              <TabsTrigger
                value="family-tree"
                onClick={() =>
                  router.push(`/dashboard/family-tree/${formCode}/graph`)
                }
                className="flex items-center gap-1 sm:gap-2 h-8 sm:h-10 px-2 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800 text-xs sm:text-sm">
                <TreeDeciduous className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Family Tree</span>
                <span className="xs:hidden text-xs">Tree</span>
              </TabsTrigger>
              <TabsTrigger
                value="manage"
                className="flex items-center gap-1 sm:gap-2 h-8 sm:h-10 px-2 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800 text-xs sm:text-sm">
                <User2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Manage Tree</span>
                <span className="xs:hidden text-xs">Manage</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-12 sm:h-10 text-sm sm:text-base"
                onClick={() => {
                  setPrompt('');
                  setPoint(null);
                  setDeadline(null);
                  setChallengeOpen(true);
                }}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Challenge
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 backdrop-blur-sm w-[95vw] max-w-md mx-auto rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  Create New Challenge
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="prompt"
                    className="text-gray-800 font-semibold text-sm">
                    Challenge Prompt
                  </Label>
                  <EmojiTextArea
                    id="prompt"
                    onChange={(value) => setPrompt(value)}
                    placeholder="Enter challenge prompt... 🎯"
                    value={prompt}
                    minHeight={80}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="point"
                    className="text-gray-800 font-semibold text-sm">
                    Point Value (Optional)
                  </Label>
                  <Input
                    id="point"
                    value={point ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^(0|[1-9]\d*)?$/.test(value)) {
                        handleIntegerInput(value, setPoint);
                      }
                    }}
                    placeholder="Enter point value..."
                    type="text"
                    min="0"
                    className="mt-1 h-12 text-sm"
                    inputMode="numeric"
                    pattern="^(0|[1-9]\d*)$"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="deadline"
                    className="text-gray-800 font-semibold text-sm">
                    Deadline (Optional)
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-1 justify-start text-left font-normal h-12 text-sm">
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
                    <PopoverContent className="w-auto p-0 bg-white/95 backdrop-blur-sm">
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
                          className="text-gray-800"
                        />
                        {deadline && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <Label className="text-gray-800 font-semibold text-sm mb-2 block">
                              <Clock className="inline w-4 h-4 mr-1" />
                              Set Time
                            </Label>
                            <Input
                              type="time"
                              value={
                                deadline
                                  ? `${deadline
                                      .getHours()
                                      .toString()
                                      .padStart(2, '0')}:${deadline
                                      .getMinutes()
                                      .toString()
                                      .padStart(2, '0')}`
                                  : ''
                              }
                              onChange={(e) => {
                                if (deadline) {
                                  const value = e.target.value;
                                  if (/^\d{2}:\d{2}$/.test(value)) {
                                    const [hours, minutes] = value
                                      .split(':')
                                      .map(Number);
                                    const newDate = new Date(deadline);
                                    newDate.setHours(hours, minutes, 0, 0);
                                    setDeadline(newDate);
                                  }
                                } else {
                                  const value = e.target.value;
                                  if (/^\d{2}:\d{2}$/.test(value)) {
                                    const [hours, minutes] = value
                                      .split(':')
                                      .map(Number);
                                    const newDate = new Date();
                                    newDate.setHours(hours, minutes, 0, 0);
                                    setDeadline(newDate);
                                  }
                                }
                              }}
                              className="bg-white border-gray-300 h-10"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 text-red-500 h-8"
                              onClick={() => setDeadline(null)}>
                              Clear Deadline
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setChallengeOpen(false);
                    setPrompt('');
                    setPoint(null);
                    setDeadline(null);
                  }}
                  className="w-full sm:w-auto order-2 sm:order-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateChallenge}
                  disabled={!prompt}
                  className="w-full sm:w-auto order-1 sm:order-2">
                  Create Challenge
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="bg-white/90 shadow-lg rounded-xl border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
            Challenges
          </h2>
          {challengesLoading && (
            <div className="text-gray-600 text-sm">Loading challenges...</div>
          )}
          {challenges.length === 0 && !challengesLoading ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-base sm:text-lg font-medium">
                No challenges found
              </p>
              <p className="text-sm">Create a new challenge to get started.</p>
            </div>
          ) : (
            <div className="flex overflow-x-auto space-x-3 sm:space-x-4 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {[...challenges]
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .map((challenge) => (
                  <div
                    key={challenge.id}
                    className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start">
                    <ChallengeCard
                      challenge={challenge}
                      family_id={familyTree?.id ?? ''}
                      onEdit={() => {
                        setSelectedChallengeId(challenge.id);
                        setPrompt(challenge.prompt);
                        setPoint(challenge.point_value ?? null);
                        setDeadline(
                          challenge.deadline
                            ? new Date(challenge.deadline)
                            : null
                        );
                        setEditChallengeOpen(true);
                      }}
                      onDelete={() => handleDeleteChallenge(challenge.id)}
                    />
                  </div>
                ))}
            </div>
          )}
          {challengesError && (
            <div className="text-red-500 mt-4 text-sm">
              Error loading challenges: {challengesError.message}
            </div>
          )}
        </div>
        <Dialog open={editChallengeOpen} onOpenChange={setEditChallengeOpen}>
          <DialogContent className="bg-white/95 backdrop-blur-sm w-[95vw] max-w-md mx-auto rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Edit Challenge
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="editPrompt"
                  className="text-gray-800 font-semibold text-sm">
                  Challenge Prompt
                </Label>
                <EmojiTextArea
                  id="editPrompt"
                  onChange={(value) => setPrompt(value)}
                  placeholder="Enter challenge prompt... 🎯"
                  value={prompt}
                  minHeight={80}
                />
              </div>
              <div>
                <Label
                  htmlFor="editPoint"
                  className="text-gray-800 font-semibold text-sm">
                  Point Value (Optional)
                </Label>
                <Input
                  id="editPoint"
                  value={point ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^(0|[1-9]\d*)?$/.test(value)) {
                      handleIntegerInput(value, setPoint);
                    }
                  }}
                  placeholder="Enter point value..."
                  type="text"
                  min="0"
                  className="mt-1 h-12 text-sm"
                  inputMode="numeric"
                  pattern="^(0|[1-9]\d*)$"
                />
              </div>
              <div>
                <Label
                  htmlFor="editDeadline"
                  className="text-gray-800 font-semibold text-sm">
                  Deadline (Optional)
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-1 justify-start text-left font-normal h-12 text-sm">
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
                  <PopoverContent className="w-auto p-0 bg-white/95 backdrop-blur-sm">
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
                        className="text-gray-800"
                      />
                      {deadline && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <Label className="text-gray-800 font-semibold text-sm mb-2 block">
                            <Clock className="inline w-4 h-4 mr-1" />
                            Set Time
                          </Label>
                          <Input
                            type="time"
                            value={
                              deadline
                                ? `${deadline
                                    .getHours()
                                    .toString()
                                    .padStart(2, '0')}:${deadline
                                    .getMinutes()
                                    .toString()
                                    .padStart(2, '0')}`
                                : ''
                            }
                            onChange={(e) => {
                              if (deadline) {
                                const value = e.target.value;
                                if (/^\d{2}:\d{2}$/.test(value)) {
                                  const [hours, minutes] = value
                                    .split(':')
                                    .map(Number);
                                  const newDate = new Date(deadline);
                                  newDate.setHours(hours, minutes, 0, 0);
                                  setDeadline(newDate);
                                }
                              } else {
                                const value = e.target.value;
                                if (/^\d{2}:\d{2}$/.test(value)) {
                                  const [hours, minutes] = value
                                    .split(':')
                                    .map(Number);
                                  const newDate = new Date();
                                  newDate.setHours(hours, minutes, 0, 0);
                                  setDeadline(newDate);
                                }
                              }
                            }}
                            className="bg-white border-gray-300 h-10"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-red-500 h-8"
                            onClick={() => setDeadline(null)}>
                            Clear Deadline
                          </Button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditChallengeOpen(false);
                  setPrompt('');
                  setPoint(null);
                  setDeadline(null);
                  setSelectedChallengeId(null);
                }}
                className="w-full sm:w-auto order-2 sm:order-1">
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedChallengeId &&
                  handleEditChallenge(selectedChallengeId)
                }
                disabled={!prompt}
                className="w-full sm:w-auto order-1 sm:order-2">
                Update Challenge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="bg-white/90 shadow-lg rounded-xl border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              Connections
            </h2>
            <div className="flex items-center gap-2 sm:gap-3">
              <ArrowUpDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-48 bg-white border-gray-200 h-10 text-sm">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem
                    value="alphabetical"
                    className="flex items-center gap-2 text-sm">
                    <SortAsc className="w-4 h-4" />
                    Alphabetical
                  </SelectItem>
                  <SelectItem
                    value="points-desc"
                    className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4" />
                    Highest Points
                  </SelectItem>
                  <SelectItem
                    value="points-asc"
                    className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 rotate-180" />
                    Lowest Points
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {pairings.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <User2 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-base sm:text-lg font-medium">
                No connections found
              </p>
              <p className="text-sm">
                Connections will appear here once they&#39;re created.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {sortedPairings.map((pairing) => {
                const connection = connections.find((c) => c.id === pairing.id);
                const points = connection?.points || 0;
                return (
                  <div
                    key={pairing.id}
                    className="group bg-gradient-to-br from-white via-white to-blue-50/30 shadow-lg rounded-2xl border border-gray-200/60 hover:shadow-xl hover:border-blue-200/60 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-3 sm:p-4">
                      <div className="flex justify-between items-start">
                        <div className="text-white">
                          <h3 className="font-bold text-base sm:text-lg mb-1">
                            Connection Pair
                          </h3>
                          <p className="text-blue-100 text-xs sm:text-sm opacity-90">
                            Big & Little Partnership
                          </p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/30">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="font-bold text-base sm:text-lg">
                              {points}
                            </span>
                            <span className="text-xs sm:text-sm opacity-90">
                              pts
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <User2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-purple-600 uppercase tracking-wide font-bold">
                              Big
                            </span>
                            <p className="text-gray-900 font-bold text-base sm:text-lg truncate">
                              {pairing.big}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-center py-1 sm:py-2">
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                          <div className="mx-3 sm:mx-4 p-1.5 sm:p-2 bg-gray-100 rounded-full">
                            <svg
                              className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                        </div>
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <User2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-green-600 uppercase tracking-wide font-bold">
                              Little
                            </span>
                            <p className="text-gray-900 font-bold text-base sm:text-lg truncate">
                              {pairing.little}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 sm:space-y-3">
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
                              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 h-10 sm:h-11 text-sm sm:text-base"
                              onClick={() =>
                                setSelectedConnection(
                                  connections.find(
                                    (c) => c.id === pairing.id
                                  ) || null
                                )
                              }>
                              <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                              Submit Challenge
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-white/95 backdrop-blur-sm w-[95vw] max-w-md mx-auto rounded-xl">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">
                                Submit Challenge
                              </DialogTitle>
                              <p className="text-sm text-gray-600">
                                {`${pairing.big} & ${pairing.little}`}
                              </p>
                            </DialogHeader>
                            <Popover modal={true}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full h-12 text-sm"
                                  disabled={challenges.length === 0}>
                                  {selectedChallengeId
                                    ? challenges.find(
                                        (c) => c.id === selectedChallengeId
                                      )?.prompt ?? 'Select Challenge'
                                    : 'Select Challenge'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[90vw] max-w-sm bg-white/95 backdrop-blur-sm">
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
                                          }
                                          className="text-sm">
                                          <div className="flex flex-col w-full">
                                            <span className="truncate">
                                              {challenge.prompt}
                                            </span>
                                            {hasSubmitted && (
                                              <span className="text-xs text-gray-500">
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
                            <DialogFooter className="flex flex-col sm:flex-row gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSubmitChallengeOpen(false);
                                  setSelectedConnection(null);
                                  setSelectedChallengeId(null);
                                }}
                                className="w-full sm:w-auto order-2 sm:order-1">
                                Cancel
                              </Button>
                              <Button
                                disabled={!selectedChallengeId}
                                onClick={handleSubmitChallenge}
                                className="w-full sm:w-auto order-1 sm:order-2">
                                Submit
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <Dialog
                            open={
                              customPointOpen &&
                              selectedConnection?.id === pairing.id
                            }
                            onOpenChange={(open) => {
                              setCustomPointOpen(open);
                              if (!open) {
                                setCustomPointPrompt('');
                                setCustomPointValue(null);
                                setSelectedConnection(null);
                              }
                            }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-9 sm:h-10 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 hover:from-yellow-100 hover:to-orange-100 hover:border-yellow-300 text-yellow-700 hover:text-yellow-800 transition-all duration-200 text-xs sm:text-sm"
                                onClick={() =>
                                  setSelectedConnection(
                                    connections.find(
                                      (c) => c.id === pairing.id
                                    ) || null
                                  )
                                }>
                                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                <span className="hidden xs:inline">
                                  Add Points
                                </span>
                                <span className="xs:hidden">Points</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white/95 backdrop-blur-sm w-[95vw] max-w-md mx-auto rounded-xl">
                              <DialogHeader>
                                <DialogTitle className="text-base sm:text-lg">
                                  Add Custom Points
                                </DialogTitle>
                                <p className="text-sm text-gray-600">
                                  {`${pairing.big} & ${pairing.little}`}
                                </p>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label
                                    htmlFor="customPointPrompt"
                                    className="text-gray-800 font-semibold text-sm">
                                    Reason for Points
                                  </Label>
                                  <EmojiTextArea
                                    id="customPointPrompt"
                                    onChange={(value) =>
                                      setCustomPointPrompt(value)
                                    }
                                    placeholder="Enter reason for awarding points... 🏆"
                                    value={customPointPrompt}
                                    minHeight={80}
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor="customPointValue"
                                    className="text-gray-800 font-semibold text-sm">
                                    Point Value *
                                  </Label>
                                  <Input
                                    id="customPointValue"
                                    value={customPointValue ?? ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (/^(0|[1-9]\d*)?$/.test(value)) {
                                        handleIntegerInput(
                                          value,
                                          setCustomPointValue
                                        );
                                      }
                                    }}
                                    placeholder="Enter point value..."
                                    type="text"
                                    min="0"
                                    className="mt-1 h-12 text-sm"
                                    inputMode="numeric"
                                    pattern="^(0|[1-9]\d*)$"
                                  />
                                </div>
                              </div>
                              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setCustomPointOpen(false);
                                    setCustomPointPrompt('');
                                    setCustomPointValue(null);
                                    setSelectedConnection(null);
                                  }}
                                  className="w-full sm:w-auto order-2 sm:order-1">
                                  Cancel
                                </Button>
                                <Button
                                  disabled={!customPointValue}
                                  onClick={handleCreateCustomPointSubmission}
                                  className="w-full sm:w-auto order-1 sm:order-2">
                                  Add Points
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Sheet
                            open={
                              submissionLogsOpen &&
                              selectedConnection?.id === pairing.id
                            }
                            onOpenChange={(open) => {
                              setSubmissionLogsOpen(open);
                              if (!open) {
                                setSelectedConnection(null);
                              }
                            }}>
                            <SheetTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-9 sm:h-10 bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 hover:from-gray-100 hover:to-slate-100 hover:border-gray-300 text-gray-700 hover:text-gray-800 transition-all duration-200 text-xs sm:text-sm"
                                onClick={() =>
                                  setSelectedConnection(
                                    connections.find(
                                      (c) => c.id === pairing.id
                                    ) || null
                                  )
                                }>
                                <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                <span className="hidden xs:inline">
                                  View Logs
                                </span>
                                <span className="xs:hidden">Logs</span>
                              </Button>
                            </SheetTrigger>
                            <SheetContent
                              side="bottom"
                              className="h-[85vh] bg-white/98 backdrop-blur-sm border-t-2 border-gray-200">
                              <SheetHeader className="pb-6 border-b border-gray-200">
                                <SheetTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                  Point History
                                </SheetTitle>
                                <SheetDescription className="text-sm text-gray-600">
                                  <div className="flex items-center justify-between">
                                    <span>{`${pairing.big} & ${pairing.little}`}</span>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                      Total: {points} points
                                    </span>
                                  </div>
                                </SheetDescription>
                              </SheetHeader>
                              <div className="h-full overflow-y-auto pb-20 pt-6">
                                <PairingSubmissionLogs
                                  connectionId={pairing.id}
                                  familyTreeId={familyTree?.id}
                                />
                              </div>
                            </SheetContent>
                          </Sheet>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
  const { data: userData, error } = await supabase.auth.getUser();
  const { 'form-code': formCode } = context.query as { 'form-code': string };
  const familyTreeData = await getFamilyTreeByCode(supabase, formCode);
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
      user: userData.user,
      familyTreeData
    }
  };
};
