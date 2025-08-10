import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Form } from '@/utils/supabase/models/form';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Clock,
  Calendar,
  Trash2,
  Edit3,
  Calendar as CalendarIcon
} from 'lucide-react';
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
import {
  deleteForm,
  updateTitle,
  updateDescription,
  updateDeadline
} from '@/utils/supabase/queries/form';
import { Badge } from '@/components/ui/badge';

export type FormCardProps = {
  form: Form;
};

export default function FormCard({ form }: FormCardProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const queryUtils = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [preventNavigation, setPreventNavigation] = useState(false);

  const [editTitle, setEditTitle] = useState(form.title);
  const [editDescription, setEditDescription] = useState(
    form.description || ''
  );
  const [editDeadline, setEditDeadline] = useState<Date | undefined>(
    form.deadline ? new Date(form.deadline) : undefined
  );
  const [editDeadlineTime, setEditDeadlineTime] = useState(() => {
    if (form.deadline) {
      const date = new Date(form.deadline);
      return `${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    }
    return '23:59';
  });

  const handleDialogOpenChange = (
    open: boolean,
    setModalState: (open: boolean) => void
  ) => {
    setModalState(open);
    if (!open) {
      setPreventNavigation(true);
      setTimeout(() => setPreventNavigation(false), 100);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteForm(supabase, form.id);
      toast('Form deleted successfully!', {
        description: 'The form and all its data have been removed.'
      });
    } catch {
      toast('Error deleting form, please try again.');
    } finally {
      queryUtils.refetchQueries({ queryKey: ['form'] });
      setIsDeleteModalOpen(false);
    }
  };

  const handleSaveForm = async () => {
    if (editTitle.trim() === '') {
      toast('Title cannot be empty');
      return;
    }
    try {
      await updateTitle(supabase, form.id, editTitle.trim());
      await updateDescription(supabase, form.id, editDescription.trim());
      const deadline = getDeadlineWithTime();
      await updateDeadline(supabase, form.id, deadline);
      toast('Form updated successfully!');
      setIsEditModalOpen(false);
      queryUtils.refetchQueries({ queryKey: ['form'] });
    } catch {
      toast('Error updating form, please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(form.title);
    setEditDescription(form.description || '');
    setEditDeadline(form.deadline ? new Date(form.deadline) : undefined);
    setEditDeadlineTime(() => {
      if (form.deadline) {
        const date = new Date(form.deadline);
        return `${date.getHours().toString().padStart(2, '0')}:${date
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
      }
      return '23:59';
    });
    setIsEditModalOpen(false);
  };

  const isFormActive = () => {
    if (!form.deadline) return true;
    const now = new Date();
    const deadline = new Date(form.deadline);
    return deadline.getTime() >= now.getTime();
  };

  const handleCardClick = () => {
    if (!isEditModalOpen && !isDeleteModalOpen && !preventNavigation) {
      if (isFormActive()) {
        router.push(`/dashboard/current/${form.code}/form`);
      } else {
        router.push(`/dashboard/past/${form.code}/form`);
      }
    }
  };

  const formatDateTime = (dateInput: string | Date) => {
    const date =
      typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDeadlineWithTime = () => {
    if (!editDeadline) return undefined;
    const [hours, minutes] = editDeadlineTime.split(':').map(Number);
    const deadlineWithTime = new Date(editDeadline);
    deadlineWithTime.setHours(hours, minutes, 0, 0);
    return deadlineWithTime;
  };

  const getDeadlineDisplayText = () => {
    if (!editDeadline) return 'Select a deadline';
    const finalDeadline = getDeadlineWithTime();
    return finalDeadline?.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isDeadlineApproaching = () => {
    if (!form.deadline) return false;
    const now = new Date();
    const deadline = new Date(form.deadline);
    const timeDiff = deadline.getTime() - now.getTime();
    const hoursUntilDeadline = timeDiff / (1000 * 3600);
    return hoursUntilDeadline > 0 && hoursUntilDeadline <= 24;
  };

  const isDeadlinePassed = () => {
    if (!form.deadline) return false;
    const now = new Date();
    const deadline = new Date(form.deadline);
    return deadline.getTime() < now.getTime();
  };

  const getDeadlineStatusColor = () => {
    if (isDeadlinePassed()) return 'text-red-600';
    if (isDeadlineApproaching()) return 'text-amber-600';
    return 'text-slate-600';
  };

  const getDeadlineStatusText = () => {
    if (isDeadlinePassed()) return 'Expired';
    if (isDeadlineApproaching()) return 'Ending Soon';
    return 'Deadline';
  };

  const getStatusBarColor = () => {
    if (isDeadlinePassed()) return 'bg-gradient-to-r from-red-400 to-pink-400';
    if (isDeadlineApproaching())
      return 'bg-gradient-to-r from-amber-400 to-orange-400';
    return 'bg-gradient-to-r from-purple-400 to-pink-400';
  };

  return (
    <div className="w-full my-2 sm:my-3">
      <Card
        className={`relative bg-white/80 border border-slate-200 rounded-xl overflow-hidden w-full hover:bg-white/90 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg shadow-sm ${
          !isEditModalOpen && !isDeleteModalOpen && !preventNavigation
            ? 'cursor-pointer'
            : ''
        }`}
        onClick={handleCardClick}>
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-2 right-2 w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-xl"></div>
          <div className="absolute bottom-2 left-2 w-8 sm:w-12 h-8 sm:h-12 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-lg"></div>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center p-4 sm:p-6 gap-4 sm:gap-6">
          {/* Left side - Main content */}
          <div className="flex-1 min-w-0">
            {/* Status indicator bar */}
            <div
              className={`w-16 sm:w-20 h-1 rounded-full mb-2 sm:mb-3 ${getStatusBarColor()}`}></div>
            <CardTitle className="text-lg sm:text-xl font-bold text-slate-800 mb-2 truncate sm:line-clamp-2">
              <span>
                {form.title}{' '}
                <Badge
                  variant="outline"
                  className="text-xs w-fit bg-purple-50 text-purple-700 border-purple-200">
                  {form.code}
                </Badge>
              </span>
            </CardTitle>
            {form.description && (
              <CardDescription className="text-sm text-slate-600 mb-3 sm:mb-4 truncate sm:line-clamp-2 bg-slate-50/50 rounded-lg p-2 sm:p-3 border border-slate-100">
                {form.description}
              </CardDescription>
            )}
            <div className="flex flex-wrap gap-3 sm:gap-4 text-xs text-slate-500">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-2" />
                <span className="truncate">
                  Created: {formatDateTime(form.created_at)}
                </span>
              </div>
              {form.deadline && (
                <div
                  className={`flex items-center ${getDeadlineStatusColor()}`}>
                  <Clock className="w-3 h-3 mr-2" />
                  <span className="font-medium truncate">
                    {getDeadlineStatusText()}: {formatDateTime(form.deadline)}
                  </span>
                </div>
              )}
            </div>
            {/* Status badges */}
            <div className="flex gap-2 mt-2 sm:mt-3">
              {isDeadlineApproaching() && (
                <div className="px-2 py-1 bg-amber-100 border border-amber-200 rounded-full">
                  <span className="text-amber-700 text-xs font-semibold">
                    URGENT
                  </span>
                </div>
              )}
              {isDeadlinePassed() && (
                <div className="px-2 py-1 bg-red-100 border border-red-200 rounded-full">
                  <span className="text-red-700 text-xs font-semibold">
                    EXPIRED
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Right side - Actions */}
          <div className="flex flex-row sm:flex-col gap-2">
            {/* Edit Button */}
            <Dialog
              open={isEditModalOpen}
              onOpenChange={(open) =>
                handleDialogOpenChange(open, setIsEditModalOpen)
              }>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 hover:text-blue-700 transition-all duration-300 shadow-sm"
                  aria-label="Edit form"
                  onClick={(e) => e.stopPropagation()}>
                  <Edit3 className="w-4 sm:w-5 h-4 sm:h-5" />
                </Button>
              </DialogTrigger>
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
                        <span className="text-gray-500 font-normal">
                          (Optional)
                        </span>
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
                    onClick={handleCancelEdit}
                    className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveForm}
                    disabled={!editTitle.trim()}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg w-full sm:w-auto">
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Delete Button */}
            <Dialog
              open={isDeleteModalOpen}
              onOpenChange={(open) =>
                handleDialogOpenChange(open, setIsDeleteModalOpen)
              }>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 hover:text-red-700 transition-all duration-300"
                  aria-label="Delete form"
                  onClick={(e) => e.stopPropagation()}>
                  <Trash2 className="w-4 sm:w-5 h-4 sm:h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl text-gray-900 max-w-[90vw] sm:max-w-lg rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                    Delete Form?
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 text-sm sm:text-base">
                    This action cannot be undone. This will permanently delete
                    <span className="font-semibold text-gray-900">
                      {' '}
                      &quot;{form.title}&quot;{' '}
                    </span>
                    and all its responses. Are you sure you want to proceed?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-3 flex-col sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 text-sm sm:text-base w-full sm:w-auto rounded-lg">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDelete}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto rounded-lg">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Forever
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>
    </div>
  );
}
