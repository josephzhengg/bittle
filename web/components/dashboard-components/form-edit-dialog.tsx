import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@/components/ui/popover';
import { useFormEditor } from '@/hooks/use-form-editor';
import { ReactNode } from 'react';

interface FormEditDialogProps {
  form: {
    id: string;
    title: string;
    description?: string;
    deadline?: string;
  };
  trigger: ReactNode;
  onSuccess?: () => void;
}

export function FormEditDialog({ form, trigger, onSuccess }: FormEditDialogProps) {
  const {
    isEditModalOpen,
    isLoading,
    editTitle,
    editDescription,
    editDeadline,
    editDeadlineTime,
    setEditTitle,
    setEditDescription,
    setEditDeadline,
    setEditDeadlineTime,
    saveForm,
    cancelEdit,
    getDeadlineDisplayText,
    setIsEditModalOpen
  } = useFormEditor(form);

  const handleSave = () => {
    saveForm(onSuccess);
  };

  return (
    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Edit Form
          </DialogTitle>
          <DialogDescription className="text-blue-200">
            Update the form details below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-blue-100 font-semibold">
              Title
            </Label>
            <Input
              id="title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20"
              placeholder="Enter form title"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-blue-100 font-semibold">
              Description
            </Label>
            <Textarea
              id="description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20 resize-none"
              rows={3}
              placeholder="Enter form description (optional)"
            />
          </div>

          {/* Deadline Field */}
          <div className="space-y-2">
            <Label htmlFor="deadline" className="text-blue-100 font-semibold">
              Deadline (Form&apos;s closing date & time / Optional)
            </Label>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 justify-start w-full">
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {getDeadlineDisplayText()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/20 w-auto p-0">
                  <div className="p-4">
                    <CalendarComponent
                      mode="single"
                      selected={editDeadline}
                      onSelect={setEditDeadline}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      className="text-white"
                    />
                    {editDeadline && (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <Label className="text-blue-100 font-semibold text-sm mb-2 block">
                          <Clock className="inline w-4 h-4 mr-1" />
                          Set Time
                        </Label>
                        <Input
                          type="time"
                          value={editDeadlineTime}
                          onChange={(e) => setEditDeadlineTime(e.target.value)}
                          className="bg-white/10 backdrop-blur-lg border border-white/20 text-white focus:border-pink-500/50 focus:ring-pink-500/20"
                        />
                        <p className="text-xs text-blue-200/70 mt-2">
                          Final deadline: {getDeadlineDisplayText()}
                        </p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={cancelEdit}
            disabled={isLoading}
            className="bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!editTitle.trim() || isLoading}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}