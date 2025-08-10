import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
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
        <DialogContent className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl text-gray-900 max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Edit Identifier
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-sm">
              Update the identifier name for this node.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-4 space-y-1">
              <div>
                <Label
                  htmlFor="identifier-input"
                  className="text-gray-700 font-medium text-sm">
                  Identifier Name *
                </Label>
                <Input
                  id="identifier-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="mt-1 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-pink-400 focus:ring-pink-400/20 rounded-lg"
                  placeholder="Enter identifier name..."
                  autoFocus
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!isValid}
              onClick={handleSubmit}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg w-full sm:w-auto">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditIdentifierDialog;
