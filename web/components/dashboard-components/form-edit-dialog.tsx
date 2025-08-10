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

export function FormEditDialog({
  form,
  trigger,
  onSuccess
}: FormEditDialogProps) {
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl text-gray-900 max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Edit Form
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-sm">
            Update the form details below.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-4 space-y-1">
            <div>
              <Label
                htmlFor="title"
                className="text-gray-700 font-medium text-sm">
                Title *
              </Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-pink-400 focus:ring-pink-400/20 rounded-lg"
                placeholder="Enter form title"
              />
            </div>

            <div>
              <Label
                htmlFor="description"
                className="text-gray-700 font-medium text-sm">
                Description{' '}
                <span className="text-gray-500 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-pink-400 focus:ring-pink-400/20 rounded-lg min-h-[80px] resize-none"
                rows={3}
                placeholder="Enter form description"
              />
            </div>

            <div>
              <Label
                htmlFor="deadline"
                className="text-gray-700 font-medium text-sm">
                Deadline{' '}
                <span className="text-gray-500 font-normal">
                  (Form&apos;s closing date & time / Optional)
                </span>
              </Label>
              <div className="mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 justify-start w-full rounded-lg">
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
                      <span className="truncate">
                        {getDeadlineDisplayText()}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-white border-gray-200 shadow-xl w-auto p-0 rounded-xl">
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
                        className="text-gray-900"
                      />
                      {editDeadline && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <Label className="text-gray-700 font-medium text-sm mb-2 block">
                            <Clock className="inline w-4 h-4 mr-1" />
                            Set Time
                          </Label>
                          <Input
                            type="time"
                            value={editDeadlineTime}
                            onChange={(e) =>
                              setEditDeadlineTime(e.target.value)
                            }
                            className="bg-gray-50 border-gray-200 text-gray-900 focus:border-pink-400 focus:ring-pink-400/20 rounded-lg"
                          />
                          <p className="text-xs text-gray-500 mt-2">
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
        </div>
        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={cancelEdit}
            disabled={isLoading}
            className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!editTitle.trim() || isLoading}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg w-full sm:w-auto">
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
