import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FamilyTree } from '@/utils/supabase/models/family-tree';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Trash2, Edit3 } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  getFamilyTreeMembers,
  deleteFamilyTree,
  updateFamilyTree
} from '@/utils/supabase/queries/family-tree';
import { Textarea } from '@/components/ui/textarea';
import FamilyTreeCardSkeleton from './family-tree-card-skeleton';

export type FamilyTreeCardProps = {
  familyTree: FamilyTree;
  formTitle?: string;
  questionPrompt?: string;
};

export default function FamilyTreeCard({
  familyTree,
  formTitle = 'Unknown Form',
  questionPrompt = 'Unknown Question'
}: FamilyTreeCardProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const queryUtils = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [preventNavigation, setPreventNavigation] = useState(false);
  const [editTitle, setEditTitle] = useState(familyTree.title);
  const [description, setDescription] = useState(familyTree.description || '');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['family-tree-members', familyTree.id],
    queryFn: async () => {
      return await getFamilyTreeMembers(supabase, familyTree.id);
    }
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
      await deleteFamilyTree(supabase, familyTree.id);
      toast('Family tree deleted successfully!', {
        description: 'The family tree and all its data have been removed.'
      });
      queryUtils.refetchQueries({ queryKey: ['family-trees'] });
    } catch {
      toast('Error deleting family tree, please try again.');
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editTitle.trim() === '') {
      toast('Title cannot be empty');
      return;
    }
    try {
      await updateFamilyTree(supabase, familyTree.id, editTitle, description);
      toast('Family tree updated successfully!');
      setIsEditModalOpen(false);
      queryUtils.refetchQueries({ queryKey: ['family-trees'] });
    } catch {
      toast('Error updating family tree, please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(familyTree.title);
    setDescription(familyTree.description || '');
    setIsEditModalOpen(false);
  };

  const handleCardClick = () => {
    if (!isEditModalOpen && !isDeleteModalOpen && !preventNavigation) {
      router.push(`/dashboard/family-tree/${familyTree.code}`);
    }
  };

  const getMemberCountColor = () => {
    const count = members.length;
    if (count === 0) return 'text-slate-600';
    if (count <= 5) return 'text-blue-600';
    if (count <= 15) return 'text-green-600';
    return 'text-purple-600';
  };

  const getMemberCountText = () => {
    const count = members.length;
    if (count === 0) return 'No members';
    if (count === 1) return '1 member';
    return `${count} members`;
  };

  const getStatusBarColor = () => {
    const count = members.length;
    if (count === 0) return 'bg-gradient-to-r from-slate-400 to-gray-400';
    if (count <= 5) return 'bg-gradient-to-r from-blue-400 to-cyan-400';
    if (count <= 15) return 'bg-gradient-to-r from-green-400 to-emerald-400';
    return 'bg-gradient-to-r from-purple-400 to-pink-400';
  };

  // Return skeleton while loading
  if (isLoading) {
    return <FamilyTreeCardSkeleton />;
  }

  return (
    <div className="w-full my-2 sm:my-3">
      <Card
        className={`relative bg-white/80 border border-slate-200 rounded-xl overflow-hidden w-full hover:bg-white/90 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg shadow-sm ${
          !isEditModalOpen && !isDeleteModalOpen && !preventNavigation
            ? 'cursor-pointer'
            : ''
        }`}
        onClick={handleCardClick}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-2 right-2 w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-xl"></div>
          <div className="absolute bottom-2 left-2 w-8 sm:w-12 h-8 sm:h-12 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-lg"></div>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center p-4 sm:p-6 gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <div
              className={`w-16 sm:w-20 h-1 rounded-full mb-2 sm:mb-3 ${getStatusBarColor()}`}></div>
            <CardTitle className="text-lg sm:text-xl font-bold text-slate-800 mb-2 truncate sm:line-clamp-2">
              {familyTree.title}
            </CardTitle>
            {/*
              Show CardDescription only on non-mobile (sm and up) screens.
              Use "hidden sm:block" to hide on mobile, show on sm+.
            */}
            <CardDescription className="hidden sm:block text-sm text-slate-600 mb-3 sm:mb-4 truncate sm:line-clamp-2 bg-slate-50/50 rounded-lg p-2 sm:p-3 border border-slate-100">
              {familyTree.description
                ? familyTree.description.length > 120
                  ? `${familyTree.description.slice(0, 120)}…`
                  : familyTree.description
                : (() => {
                    const text = `${questionPrompt} | ${formTitle}`;
                    return text.length > 100 ? `${text.slice(0, 120)}…` : text;
                  })()}
            </CardDescription>
            <div className="flex flex-wrap gap-3 sm:gap-4 text-xs text-slate-500">
              <div className={`flex items-center ${getMemberCountColor()}`}>
                <Users className="w-3 h-3 mr-2" />
                <span className="font-medium">{getMemberCountText()}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-2 sm:mt-3">
              <div className="px-2 py-1 bg-green-100 border border-green-200 rounded-full">
                <span className="text-green-700 text-xs font-semibold">
                  ACTIVE
                </span>
              </div>
              {members.length > 10 && (
                <div className="px-2 py-1 bg-purple-100 border border-purple-200 rounded-full">
                  <span className="text-purple-700 text-xs font-semibold">
                    LARGE TREE
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-row sm:flex-col gap-2">
            <Dialog
              open={isEditModalOpen}
              onOpenChange={(open) =>
                handleDialogOpenChange(open, setIsEditModalOpen)
              }>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 hover:text-blue-700 transition-all duration-300"
                  aria-label="Edit family tree"
                  onClick={(e) => e.stopPropagation()}>
                  <Edit3 className="w-4 sm:w-5 h-4 sm:h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/20 text-white max-w-[90vw] sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    Edit Family Tree
                  </DialogTitle>
                  <DialogDescription className="text-blue-200 text-sm sm:text-base">
                    Update the family tree details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="title"
                      className="text-blue-100 font-semibold text-sm sm:text-base">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20 text-sm sm:text-base"
                      placeholder="Enter family tree title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-blue-100 font-semibold text-sm sm:text-base">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-pink-500/50 focus:ring-pink-500/20 text-sm sm:text-base"
                      placeholder="Enter family tree description"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 flex-col sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 text-sm sm:text-base w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={!editTitle.trim()}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto">
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                  aria-label="Delete family tree"
                  onClick={(e) => e.stopPropagation()}>
                  <Trash2 className="w-4 sm:w-5 h-4 sm:h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border border-white/20 text-white max-w-[90vw] sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                    Delete Family Tree?
                  </DialogTitle>
                  <DialogDescription className="text-blue-200 text-sm sm:text-base">
                    This action cannot be undone. This will permanently delete
                    <span className="font-semibold text-white">
                      {' '}
                      &quot;{familyTree.title}&quot;{' '}
                    </span>
                    and all of its members and connections.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 flex-col sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 text-sm sm:text-base w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDelete}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto">
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
