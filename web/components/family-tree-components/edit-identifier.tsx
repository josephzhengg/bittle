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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold">
            Edit Identifier
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="identifier"
              className="text-sm font-medium text-gray-700">
              Identifier Name
            </Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full"
              placeholder="Enter identifier name..."
              autoFocus
            />
          </div>

          <DialogFooter className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid} className="flex-1">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditIdentifierDialog;
