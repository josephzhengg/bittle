// hooks/useFormEditor.ts
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  updateTitle,
  updateDescription,
  updateDeadline
} from '@/utils/supabase/queries/form';

export interface FormData {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
}

export function useFormEditor(initialForm: FormData) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  
  // Edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form values
  const [editTitle, setEditTitle] = useState(initialForm.title);
  const [editDescription, setEditDescription] = useState(initialForm.description || '');
  const [editDeadline, setEditDeadline] = useState<Date | undefined>(
    initialForm.deadline ? new Date(initialForm.deadline) : undefined
  );
  const [editDeadlineTime, setEditDeadlineTime] = useState(() => {
    if (initialForm.deadline) {
      const date = new Date(initialForm.deadline);
      return `${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    }
    return '23:59';
  });

  // Helper function to combine date and time
  const getDeadlineWithTime = () => {
    if (!editDeadline) return undefined;
    const [hours, minutes] = editDeadlineTime.split(':').map(Number);
    const deadlineWithTime = new Date(editDeadline);
    deadlineWithTime.setHours(hours, minutes, 0, 0);
    return deadlineWithTime;
  };

  // Format display text for deadline
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

  // Reset form to initial values
  const resetForm = () => {
    setEditTitle(initialForm.title);
    setEditDescription(initialForm.description || '');
    setEditDeadline(initialForm.deadline ? new Date(initialForm.deadline) : undefined);
    setEditDeadlineTime(() => {
      if (initialForm.deadline) {
        const date = new Date(initialForm.deadline);
        return `${date.getHours().toString().padStart(2, '0')}:${date
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
      }
      return '23:59';
    });
  };

  // Save form changes
  const saveForm = async (onSuccess?: () => void) => {
    if (editTitle.trim() === '') {
      toast('Title cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      // Update all fields
      await updateTitle(supabase, initialForm.id, editTitle.trim());
      await updateDescription(supabase, initialForm.id, editDescription.trim());
      const deadline = getDeadlineWithTime();
      await updateDeadline(supabase, initialForm.id, deadline);
      
      toast('Form updated successfully!');
      setIsEditModalOpen(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['form'] });
      queryClient.invalidateQueries({ queryKey: ['title'] });
      queryClient.invalidateQueries({ queryKey: ['formData'] });
      
      onSuccess?.();
    } catch (error) {
      toast('Error updating form, please try again.');
      console.error('Update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    resetForm();
    setIsEditModalOpen(false);
  };

  // Open edit modal
  const openEditModal = () => {
    resetForm(); // Reset to current values when opening
    setIsEditModalOpen(true);
  };

  return {
    // State
    isEditModalOpen,
    isLoading,
    editTitle,
    editDescription,
    editDeadline,
    editDeadlineTime,
    
    // Setters
    setEditTitle,
    setEditDescription,
    setEditDeadline,
    setEditDeadlineTime,
    
    // Actions
    openEditModal,
    saveForm,
    cancelEdit,
    
    // Helpers
    getDeadlineDisplayText,
    getDeadlineWithTime,
    
    // Dialog handlers
    setIsEditModalOpen
  };
}