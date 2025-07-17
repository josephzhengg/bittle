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
    if (identifier.trim()) {
      onSave(nodeId, identifier.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (identifier.trim()) {
        onSave(nodeId, identifier.trim());
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Identifier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="identifier" className="text-right">
                Name
              </Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={handleKeyDown}
                className="col-span-3"
                placeholder="Enter identifier..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!identifier.trim()}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditIdentifierDialog;
