import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface DeleteMemberDialogProps {
  isOpen: boolean;
  identifier: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const DeleteMemberDialog: React.FC<DeleteMemberDialogProps> = ({
  isOpen,
  identifier,
  onConfirm,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998] transition-opacity duration-200"
          style={{ zIndex: 9998 }}
          onClick={onCancel}
        />
      )}
      <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent
          className="fixed left-1/2 top-1/2 w-[95vw] max-w-sm sm:max-w-lg -translate-x-1/2 -translate-y-1/2 mx-auto rounded-xl shadow-lg z-[9999] p-6 sm:p-8 bg-white"
          style={{ zIndex: 9999 }}>
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold text-center sm:text-left text-red-600">
              Confirm Member Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium block text-center sm:text-left text-gray-700">
                Are you sure you want to delete the member{' '}
                <span className="font-semibold text-red-500">
                  &apos;{identifier}&apos;
                </span>
                ?<br />
                <span className="text-sm text-gray-500">
                  This action cannot be undone.
                </span>
              </Label>
            </div>
            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="w-full h-12 text-base font-medium rounded-lg border-2 sm:w-auto sm:h-10 sm:px-6 transition-colors">
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="w-full h-12 text-base font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:h-10 sm:px-6 transition-colors">
                {isSubmitting ? (
                  <span>
                    <svg
                      className="inline mr-2 animate-spin h-5 w-5 text-white"
                      viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Delete Member'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteMemberDialog;
