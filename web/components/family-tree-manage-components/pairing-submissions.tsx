import { useSupabase } from '@/lib/supabase';
import { getPointSubmissions } from '@/utils/supabase/queries/family-tree-manage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PointSubmission as PointSubmissionType } from '@/utils/supabase/models/point-submission';
import { deletePointSubmission } from '@/utils/supabase/queries/family-tree-manage';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';

type PairingSubmissionLogsProps = {
  connectionId: string;
  familyTreeId?: string;
};

export default function PairingSubmissionLogs({
  connectionId,
  familyTreeId
}: PairingSubmissionLogsProps) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  const { data: submissions = [], isLoading } = useQuery<PointSubmissionType[]>(
    {
      queryKey: ['pairingSubmissions', connectionId],
      queryFn: async () => {
        try {
          const submissions = await getPointSubmissions(supabase, connectionId);
          return submissions;
        } catch (error) {
          console.error('Unexpected error fetching submissions:', error);
          return [];
        }
      }
    }
  );

  const handleDeletePointSubmission = async (submissionId: string) => {
    setDeletingIds((prev) => new Set(prev).add(submissionId));

    try {
      await deletePointSubmission(supabase, submissionId);

      queryClient.invalidateQueries({
        queryKey: ['pairingSubmissions', connectionId]
      });

      queryClient.invalidateQueries({
        queryKey: ['connections', familyTreeId]
      });

      queryClient.invalidateQueries({
        queryKey: ['pairings', familyTreeId]
      });

      queryClient.invalidateQueries({
        queryKey: ['challengeSubmissions']
      });

      queryClient.refetchQueries({
        queryKey: ['challengeSubmissions']
      });

      queryClient.invalidateQueries({
        queryKey: ['challenges']
      });

      toast.success('Point submission deleted successfully!');
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error(
        `Failed to delete point submission: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
      setDeleteDialogOpen(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="currentColor"
          viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <p>No submissions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-gray-800 font-medium text-sm">
                {submission.prompt ?? 'Custom Point Submission'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  (submission.point ?? 0) > 0 ? 'default' : 'destructive'
                }
                className={
                  (submission.point ?? 0) > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }>
                {(submission.point ?? 0) > 0 ? '+' : ''}
                {submission.point ?? 0} pts
              </Badge>

              <Dialog
                open={deleteDialogOpen === submission.id}
                onOpenChange={(open) => {
                  if (!open) setDeleteDialogOpen(null);
                }}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(submission.id)}
                    disabled={deletingIds.has(submission.id)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete submission">
                    {deletingIds.has(submission.id) ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-sm">
                  <DialogHeader>
                    <DialogTitle className="text-red-600">
                      Delete Submission
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Are you sure you want to delete this point submission?
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-gray-800 font-medium text-sm">
                          {submission.prompt ?? 'Custom Point Submission'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {submission.challenge_id
                            ? 'Challenge submission'
                            : 'Custom point submission'}
                        </p>
                      </div>
                      <Badge
                        variant={
                          (submission.point ?? 0) > 0
                            ? 'default'
                            : 'destructive'
                        }
                        className={
                          (submission.point ?? 0) > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }>
                        {(submission.point ?? 0) > 0 ? '+' : ''}
                        {submission.point ?? 0} pts
                      </Badge>
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(null)}
                      disabled={deletingIds.has(submission.id)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeletePointSubmission(submission.id)}
                      disabled={deletingIds.has(submission.id)}
                      className="bg-red-600 hover:bg-red-700">
                      {deletingIds.has(submission.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="text-xs text-gray-500 mb-2">
            {submission.challenge_id
              ? 'Challenge submission'
              : 'Custom point submission'}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            {submission.challenge_id ? (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                Challenge
              </span>
            ) : (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                Custom
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
