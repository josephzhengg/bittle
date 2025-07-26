import { Challenges } from '@/utils/supabase/models/challenges';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useSupabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConnections,
  getIdentifier
} from '@/utils/supabase/queries/family-tree';
import {
  createPointSubmissionWithChallenge,
  getPointSubmissionsForChallenge
} from '@/utils/supabase/queries/family-tree-manage';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CommandList, CommandItem, Command } from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Connections } from '@/utils/supabase/models/connection';
import { toast } from 'sonner';
import {
  Edit,
  Trash2,
  Calendar,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Target
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ChallengeCardProps = {
  challenge: Challenges;
  family_id: string;
  onEdit: () => void;
  onDelete: () => void;
};

export default function ChallengeCard({
  challenge,
  family_id,
  onEdit,
  onDelete
}: ChallengeCardProps) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] =
    useState<Connections | null>(null);

  const { data: connections = [] } = useQuery({
    queryKey: ['connections', family_id],
    queryFn: async () => getConnections(supabase, family_id)
  });

  const { data: challengeSubmissions = [], refetch: refetchSubmissions } =
    useQuery({
      queryKey: ['challengeSubmissions', challenge.id],
      queryFn: async () => {
        try {
          const submissions = await getPointSubmissionsForChallenge(
            supabase,
            challenge.id
          );
          return submissions || [];
        } catch (error) {
          console.error('Error fetching challenge submissions:', error);
          return [];
        }
      },
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
      staleTime: 0
    });

  const { data: pairings } = useQuery({
    queryKey: ['pairings', family_id],
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
      return connections.map((connection) => ({
        id: connection.id,
        big: identifierMap.get(connection.big_id) || 'Unknown',
        little: identifierMap.get(connection.little_id) || 'Unknown'
      }));
    },
    enabled: connections.length > 0
  });

  const handleSubmitPointSubmissionWithChallenge = async (
    connection: Connections
  ) => {
    try {
      await createPointSubmissionWithChallenge(
        supabase,
        connection.id,
        challenge.id
      );
      toast.success('Challenge completed successfully!');
      await refetchSubmissions();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['challengeSubmissions']
        }),
        queryClient.invalidateQueries({
          queryKey: ['connections', family_id]
        }),
        queryClient.invalidateQueries({
          queryKey: ['pairings', family_id]
        }),
        queryClient.invalidateQueries({
          queryKey: ['pairingSubmissions']
        })
      ]);
      queryClient.refetchQueries({
        queryKey: ['challengeSubmissions', challenge.id]
      });
    } catch (error) {
      console.error('Error creating point submission:', error);
      toast.error('Failed to complete challenge');
    } finally {
      setSubmissionOpen(false);
      setSelectedConnection(null);
    }
  };

  const hasConnectionSubmitted = (connectionId: string) => {
    return challengeSubmissions.some(
      (s) => s.challenge_id === challenge.id && s.connection_id === connectionId
    );
  };

  const isDeadlinePassed = challenge.deadline
    ? new Date(challenge.deadline) < new Date()
    : false;

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `${diffDays} days left`;
  };

  const totalPairs = connections.length;
  const completedPairs = connections.filter((connection) =>
    challengeSubmissions.some(
      (s) =>
        s.challenge_id === challenge.id && s.connection_id === connection.id
    )
  ).length;
  const remainingPairs = Math.max(0, totalPairs - completedPairs);
  const completionPercentage =
    totalPairs > 0 ? Math.round((completedPairs / totalPairs) * 100) : 0;

  return (
    <Card className="group relative bg-gradient-to-br from-white via-white to-gray-50/30 shadow-lg border border-gray-200/60 hover:shadow-xl hover:border-blue-200/60 transition-all duration-300 hover:-translate-y-1 overflow-hidden h-full flex flex-col">
      {/* Gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />

      <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
        <div className="flex justify-between items-start gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <div className="min-h-[2.5rem] sm:min-h-[3rem] flex items-center">
                <Label className="text-base sm:text-lg font-bold text-gray-900 leading-tight line-clamp-2">
                  {challenge.prompt}
                </Label>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-h-[1.5rem] sm:min-h-[2rem]">
              {challenge.point_value && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 hover:bg-green-200 text-xs sm:text-sm">
                  <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  {challenge.point_value} pts
                </Badge>
              )}
              {challenge.deadline && (
                <Badge
                  variant={isDeadlinePassed ? 'destructive' : 'outline'}
                  className={`${
                    isDeadlinePassed
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  } text-xs sm:text-sm`}>
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  {formatDeadline(challenge.deadline)}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="bg-gray-50 text-gray-700 border-gray-200 text-xs sm:text-sm">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                {completedPairs}/{totalPairs}
              </Badge>
              {totalPairs > 0 &&
                completedPairs > 0 &&
                completedPairs < totalPairs && (
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs sm:text-sm">
                    {completionPercentage}% done
                  </Badge>
                )}
              {totalPairs > 0 && completedPairs === totalPairs && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 text-xs sm:text-sm">
                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  Complete
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-blue-100 hover:text-blue-700">
              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-red-100 hover:text-red-700">
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-2 sm:py-3 flex-grow flex flex-col justify-between">
        <div>
          {challenge.deadline && (
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              <span>
                Due:{' '}
                {new Date(challenge.deadline).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
        <div className="text-xs sm:text-sm text-gray-500 mt-auto">
          {totalPairs > 0 ? (
            <div className="space-y-1">
              <div>
                {remainingPairs} of {totalPairs} pairs remaining
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          ) : (
            <span>No connections available</span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2 sm:pt-3 bg-gray-50/30 flex-shrink-0">
        <Dialog open={submissionOpen} onOpenChange={setSubmissionOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 text-sm sm:text-base h-9 sm:h-10"
              disabled={
                connections.length === 0 || completedPairs === totalPairs
              }>
              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              {completedPairs === totalPairs
                ? 'All Pairs Completed'
                : 'Mark as Completed'}
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-white/98 backdrop-blur-sm border-0 shadow-2xl w-[95vw] max-w-md mx-auto rounded-xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 leading-tight line-clamp-2">
                    Complete Challenge
                  </DialogTitle>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                    Select which pair completed this challenge
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-1.5 sm:mb-2">
                  Challenge
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed line-clamp-3">
                  {challenge.prompt}
                </p>
                {challenge.point_value && (
                  <div className="flex items-center gap-1 mt-1.5 sm:mt-2">
                    <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                      {challenge.point_value} points
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium text-gray-700">
                  Select Connection Pair
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto p-2.5 sm:p-3 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-xs sm:text-sm"
                      disabled={connections.length === 0}>
                      {selectedConnection ? (
                        <div className="flex items-center gap-2 sm:gap-3 truncate">
                          <div className="flex items-center gap-1 sm:gap-2 truncate">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full flex-shrink-0" />
                            <span className="font-medium truncate">
                              {
                                pairings?.find(
                                  (p) => p.id === selectedConnection.id
                                )?.big
                              }
                            </span>
                          </div>
                          <span className="text-gray-400 flex-shrink-0">→</span>
                          <div className="flex items-center gap-1 sm:gap-2 truncate">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0" />
                            <span className="font-medium truncate">
                              {
                                pairings?.find(
                                  (p) => p.id === selectedConnection.id
                                )?.little
                              }
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 truncate">
                          Choose a connection pair...
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[90vw] max-w-[320px] sm:max-w-[360px] bg-white/98 backdrop-blur-sm border-0 shadow-xl p-0">
                    <Command>
                      <CommandList className="max-h-[200px] sm:max-h-[240px] overflow-y-auto">
                        {connections.map((connection) => {
                          const hasSubmitted = hasConnectionSubmitted(
                            connection.id
                          );
                          const pairing = pairings?.find(
                            (p) => p.id === connection.id
                          );
                          return (
                            <CommandItem
                              key={connection.id}
                              disabled={hasSubmitted}
                              onSelect={() => {
                                if (!hasSubmitted) {
                                  setSelectedConnection(connection);
                                }
                              }}
                              className="p-3 sm:p-4 cursor-pointer hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[3rem] sm:min-h-[3.5rem] flex items-center text-xs sm:text-sm">
                              <div className="flex items-center justify-between w-full gap-2">
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full flex-shrink-0" />
                                    <span className="font-medium text-gray-900 truncate">
                                      {pairing?.big}
                                    </span>
                                  </div>
                                  <span className="text-gray-400 flex-shrink-0 mx-1 sm:mx-2">
                                    →
                                  </span>
                                  <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full flex-shrink-0" />
                                    <span className="font-medium text-gray-900 truncate">
                                      {pairing?.little}
                                    </span>
                                  </div>
                                </div>
                                {hasSubmitted && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-gray-100 text-gray-600 ml-1 sm:ml-2 flex-shrink-0">
                                    Completed
                                  </Badge>
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg sm:text-xl font-bold text-blue-600">
                    {totalPairs}
                  </div>
                  <div className="text-[10px] sm:text-xs text-blue-700">
                    Total
                  </div>
                </div>
                <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-xl font-bold text-green-600">
                    {completedPairs}
                  </div>
                  <div className="text-[10px] sm:text-xs text-green-700">
                    Done
                  </div>
                </div>
                <div className="p-2 sm:p-3 bg-orange-50 rounded-lg">
                  <div className="text-lg sm:text-xl font-bold text-orange-600">
                    {remainingPairs}
                  </div>
                  <div className="text-[10px] sm:text-xs text-orange-700">
                    Left
                  </div>
                </div>
              </div>

              {totalPairs > 0 && (
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                    <span>Progress</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 sm:h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-1 sm:pr-2"
                      style={{
                        width: `${Math.max(completionPercentage, 8)}%`
                      }}>
                      {completionPercentage > 15 && (
                        <span className="text-[10px] sm:text-xs text-white font-medium">
                          {completionPercentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSubmissionOpen(false);
                  setSelectedConnection(null);
                }}
                className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base">
                Cancel
              </Button>
              <Button
                disabled={
                  !selectedConnection ||
                  (selectedConnection &&
                    hasConnectionSubmitted(selectedConnection.id))
                }
                onClick={() => {
                  if (
                    selectedConnection &&
                    !hasConnectionSubmitted(selectedConnection.id)
                  ) {
                    handleSubmitPointSubmissionWithChallenge(
                      selectedConnection
                    );
                  }
                }}
                className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Complete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
