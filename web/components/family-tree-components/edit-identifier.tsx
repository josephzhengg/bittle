import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditIdentifierDialogProps {
  isOpen: boolean;
  nodeId: string;
  currentIdentifier: string;
  onSave: (nodeId: string, newIdentifier: string) => void;
  onCancel: () => void;
}

const EditIdentifierDialog: React.FC<EditIdentifierDialogProps> = ({
  isOpen,
  nodeId,
  currentIdentifier,
  onSave,
  onCancel
}) => {
  const [identifier, setIdentifier] = useState(currentIdentifier);

  useEffect(() => {
    setIdentifier(currentIdentifier);
  }, [currentIdentifier]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedIdentifier = identifier.trim();
    if (trimmedIdentifier) {
      onSave(nodeId, trimmedIdentifier);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmedIdentifier = identifier.trim();
      if (trimmedIdentifier) {
        onSave(nodeId, trimmedIdentifier);
      }
    }
  };

  const isValid = identifier.trim().length > 0;

  return (
    <>
      {/* Custom overlay for extra blur coverage */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/2 z-[9998]"
          style={{ zIndex: 9998 }}
          onClick={onCancel}
        />
      )}

      <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
        <DialogContent
          className="w-[95vw] max-w-md mx-auto rounded-lg sm:w-full sm:max-w-lg z-[9999] fixed"
          style={{ zIndex: 9999 }}>
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold text-center sm:text-left">
              Edit Identifier
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label
                htmlFor="identifier-input"
                className="text-sm font-medium block">
                Identifier Name
              </Label>
              <Input
                id="identifier-input"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-12 text-base px-4 rounded-lg border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="Enter identifier name..."
                autoFocus
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="w-full h-12 text-base font-medium rounded-lg border-2 sm:w-auto sm:h-10 sm:px-6">
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!isValid}
                onClick={handleSubmit}
                className="w-full h-12 text-base font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:h-10 sm:px-6">
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditIdentifierDialog;
