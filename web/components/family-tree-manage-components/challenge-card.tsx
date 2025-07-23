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
  getPointSubmissions
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

type ChallengeCardProps = {
  challenge: Challenges;
  family_id: string;
};

export default function ChallengeCard({
  challenge,
  family_id
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

  // Use the existing getPointSubmissions function with challenge_id
  const { data: challengeSubmissions = [], refetch: refetchSubmissions } =
    useQuery({
      queryKey: ['challengeSubmissions', challenge.id],
      queryFn: async () => {
        console.log('Fetching submissions for challenge:', challenge.id);

        try {
          const submissions = await getPointSubmissions(supabase, challenge.id);
          console.log('Found submissions:', submissions);
          return submissions;
        } catch (error) {
          console.error('Error fetching challenge submissions:', error);
          return [];
        }
      }
    });

  // OPTIMIZED: Fetch all identifiers in parallel
  const { data: pairings } = useQuery({
    queryKey: ['pairings', family_id],
    queryFn: async () => {
      if (connections.length === 0) return [];

      // Extract all unique user IDs
      const allUserIds = Array.from(
        new Set([
          ...connections.map((c) => c.big_id),
          ...connections.map((c) => c.little_id)
        ])
      );

      // Fetch all identifiers in parallel
      const identifierPromises = allUserIds.map((id) =>
        getIdentifier(supabase, id).then((identifier) => ({ id, identifier }))
      );

      const identifierResults = await Promise.all(identifierPromises);

      // Create a lookup map for O(1) access
      const identifierMap = new Map(
        identifierResults.map((result) => [result.id, result.identifier])
      );

      // Build pairings using the map
      return connections.map((connection) => ({
        id: connection.id,
        big: identifierMap.get(connection.big_id) || 'Unknown',
        little: identifierMap.get(connection.little_id) || 'Unknown'
      }));
    },
    enabled: connections.length > 0 // Only run when connections are available
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
      toast.success('Point submission created successfully!');

      // Refetch the challenge submissions to update the UI
      await refetchSubmissions();

      // Also invalidate the query cache
      queryClient.invalidateQueries({
        queryKey: ['challengeSubmissions', challenge.id]
      });
    } catch (error) {
      console.error('Error creating point submission:', error);
      toast.error('Failed to submit point submission');
    } finally {
      setSubmissionOpen(false);
      setSelectedConnection(null);
    }
  };

  // Check if a connection has already submitted this challenge
  const hasConnectionSubmitted = (connectionId: string) => {
    const hasSubmitted = challengeSubmissions.some(
      (submission) => submission.connection_id === connectionId
    );
    console.log(`Connection ${connectionId} has submitted:`, hasSubmitted);
    return hasSubmitted;
  };

  console.log('Challenge submissions:', challengeSubmissions);
  console.log('Connections:', connections);

  return (
    <Card>
      <CardHeader>
        <Label>{challenge.prompt}</Label>
      </CardHeader>
      <CardContent>
        <p>Point Value: {challenge.point_value ?? 'N/A'}</p>
        <p>
          Deadline:{' '}
          {challenge.deadline
            ? new Date(challenge.deadline).toLocaleDateString()
            : 'No deadline'}
        </p>
        <CardFooter>
          <Dialog open={submissionOpen} onOpenChange={setSubmissionOpen}>
            <DialogTrigger asChild>
              <Button>Submit Submission</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Your Challenge</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>Connections: {connections.length}</p>
                <p>Submissions: {challengeSubmissions.length}</p>
                <p className="text-sm text-muted-foreground">
                  Challenge ID: {challenge.id}
                </p>
                <p className="text-sm text-muted-foreground">
                  Challenge Prompt: &apos;{challenge.prompt}&apos;
                </p>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    disabled={connections.length === 0}>
                    {selectedConnection
                      ? `Selected: ${
                          pairings?.find((p) => p.id === selectedConnection.id)
                            ?.big
                        } & ${
                          pairings?.find((p) => p.id === selectedConnection.id)
                            ?.little
                        }`
                      : 'Select Connection'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <Command>
                    <CommandList>
                      {connections.map((connection) => {
                        const hasSubmitted = hasConnectionSubmitted(
                          connection.id
                        );
                        const pairing = pairings?.find(
                          (p) => p.id === connection.id
                        );

                        return (
                          <CommandItem
                            disabled={hasSubmitted}
                            key={connection.id}
                            onSelect={() => {
                              if (!hasSubmitted) {
                                setSelectedConnection(connection);
                              }
                            }}>
                            <div className="flex justify-between items-center w-full">
                              <span>
                                {pairing?.big} &amp; {pairing?.little}
                              </span>
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
                    setSubmissionOpen(false);
                    setSelectedConnection(null);
                  }}
                  className="mt-4">
                  Close
                </Button>
                <Button
                  disabled={
                    !connections ||
                    connections.length === 0 ||
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
                  }}>
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </CardContent>
    </Card>
  );
}
