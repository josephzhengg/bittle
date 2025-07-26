import { useSupabase } from '@/lib/supabase';
import { getPointSubmissions } from '@/utils/supabase/queries/family-tree-manage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PointSubmission as PointSubmissionType } from '@/utils/supabase/models/point-submission';
import { deletePointSubmission } from '@/utils/supabase/queries/family-tree-manage';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Trophy, Tag, Award, AlertCircle } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  const getTotalPoints = () => {
    return submissions.reduce(
      (total, submission) => total + (submission.point || 0),
      0
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="max-w-sm mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Submissions Yet
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            This connection hasn&#39;t earned any points yet. Submit challenges
            or add custom points to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Total Points Earned
              </h3>
              <p className="text-sm text-gray-600">
                {submissions.length} submission
                {submissions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right sm:text-left">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {getTotalPoints()}
            </div>
            <p className="text-sm text-gray-600 font-medium">Points</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {submissions.map((submission, index) => (
          <div
            key={submission.id}
            className="group bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      #{submissions.length - index}
                    </span>
                    <Badge
                      variant={
                        submission.challenge_id ? 'default' : 'secondary'
                      }
                      className={`text-xs font-medium ${
                        submission.challenge_id
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                      <Tag className="w-3 h-3 mr-1" />
                      {submission.challenge_id ? 'Challenge' : 'Custom'}
                    </Badge>
                  </div>

                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight mb-2 line-clamp-2">
                    {submission.prompt || 'Custom Point Submission'}
                  </h4>

                  <div className="flex items-center text-xs sm:text-sm text-gray-500 space-x-4">
                    {submission.challenge_id && (
                      <div className="flex items-center space-x-1">
                        <Award className="w-3 h-3" />
                        <span>Challenge Reward</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <Badge
                      variant={
                        (submission.point ?? 0) >= 0 ? 'default' : 'destructive'
                      }
                      className={`text-base font-bold px-3 py-1.5 ${
                        (submission.point ?? 0) >= 0
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                      {(submission.point ?? 0) > 0 ? '+' : ''}
                      {submission.point ?? 0}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">points</p>
                  </div>

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
                        className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete submission">
                        {deletingIds.has(submission.id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white/98 backdrop-blur-sm w-[95vw] max-w-md mx-auto rounded-xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-5 h-5" />
                          Delete Submission
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                          Are you sure you want to delete this point submission?
                          This action cannot be undone and will affect the
                          connection&#39;s total points.
                        </DialogDescription>
                      </DialogHeader>

                      <Alert className="my-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="font-medium text-gray-900">
                              {submission.prompt || 'Custom Point Submission'}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
                              <span className="text-gray-600">
                                {submission.challenge_id
                                  ? 'Challenge submission'
                                  : 'Custom point submission'}
                              </span>
                              <Badge
                                variant={
                                  (submission.point ?? 0) >= 0
                                    ? 'default'
                                    : 'destructive'
                                }
                                className={
                                  (submission.point ?? 0) >= 0
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }>
                                {(submission.point ?? 0) > 0 ? '+' : ''}
                                {submission.point ?? 0} pts
                              </Badge>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>

                      <DialogFooter className="gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row w-full justify-between gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(null)}
                            disabled={deletingIds.has(submission.id)}
                            className="flex-1 sm:flex-none sm:mr-auto">
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() =>
                              handleDeletePointSubmission(submission.id)
                            }
                            disabled={deletingIds.has(submission.id)}
                            className="flex-1 sm:flex-none sm:ml-auto bg-red-600 hover:bg-red-700">
                            {deletingIds.has(submission.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Submission
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Submissions are sorted by most recent first. Deleting submissions will
          update the connection&#39;s total points.
        </p>
      </div>
    </div>
  );
}
