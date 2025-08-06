import { FamilyTree } from '@/utils/supabase/models/family-tree';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/router';
import {
  TreePine,
  Users,
  Trash2,
  Edit3,
  Code,
  FormInput,
  HelpCircle,
  Eye
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  deleteFamilyTree,
  getFamilyTreeMembers
} from '@/utils/supabase/queries/family-tree';
import { useSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';

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

  const { data: members = [] } = useQuery({
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
      toast('Family tree updated successfully!');
      setIsEditModalOpen(false);
      queryUtils.refetchQueries({ queryKey: ['family-trees'] });
    } catch {
      toast('Error updating family tree, please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(familyTree.title);
    setIsEditModalOpen(false);
  };

  const handleCardClick = () => {
    if (!isEditModalOpen && !isDeleteModalOpen && !preventNavigation) {
      router.push(`/dashboard/family-tree/${familyTree.code}`);
    }
  };

  const getMemberCountColor = () => {
    const count = members.length;
    if (count === 0) return 'text-gray-500';
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

  return (
    <div className="w-full my-3">
      <Card
        className={`relative bg-white/80 border border-slate-200 rounded-xl overflow-hidden w-full hover:bg-white/90 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg shadow-sm ${
          !isEditModalOpen && !isDeleteModalOpen && !preventNavigation
            ? 'cursor-pointer'
            : ''
        }`}
        onClick={handleCardClick}>
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-2 right-2 w-16 h-16 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full blur-xl"></div>
          <div className="absolute bottom-2 left-2 w-12 h-12 bg-gradient-to-br from-teal-200/30 to-cyan-200/30 rounded-full blur-lg"></div>
        </div>

        <div className="relative z-10 flex items-center p-6 gap-6">
          {/* Left side - Main content */}
          <div className="flex-1 min-w-0">
            {/* Status indicator bar */}
            <div className="w-20 h-1 rounded-full mb-3 bg-gradient-to-r from-green-400 to-emerald-400"></div>

            {/* Title and Tree Icon */}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TreePine className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-800 line-clamp-1">
                {familyTree.title}
              </CardTitle>
            </div>

            {/* Form and Question info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                <FormInput className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Form:</span>
                <span className="line-clamp-1">{formTitle}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                <HelpCircle className="w-4 h-4 text-purple-500" />
                <span className="font-medium">Question:</span>
                <span className="line-clamp-1">{questionPrompt}</span>
              </div>
            </div>

            {/* Stats and metadata */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
              <div className="flex items-center">
                <Code className="w-3 h-3 mr-2" />
                <span>Code: {familyTree.code}</span>
              </div>
              <div className={`flex items-center ${getMemberCountColor()}`}>
                <Users className="w-3 h-3 mr-2" />
                <span className="font-medium">{getMemberCountText()}</span>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex gap-2">
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

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* View Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-600 hover:text-green-700 transition-all duration-300"
              aria-label="View family tree"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/family-tree/${familyTree.code}`);
              }}>
              <Eye className="w-5 h-5" />
            </Button>

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
                  className="h-10 w-10 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 hover:text-blue-700 transition-all duration-300"
                  aria-label="Edit family tree"
                  onClick={(e) => e.stopPropagation()}>
                  <Edit3 className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-slate-900/95 to-green-900/95 backdrop-blur-xl border border-white/20 text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    Edit Family Tree
                  </DialogTitle>
                  <DialogDescription className="text-blue-200">
                    Update the family tree details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="title"
                      className="text-blue-100 font-semibold">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder:text-white/50 focus:border-green-500/50 focus:ring-green-500/20"
                      placeholder="Enter family tree title"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={!editTitle.trim()}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
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
                  className="h-10 w-10 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 hover:text-red-700 transition-all duration-300"
                  aria-label="Delete family tree"
                  onClick={(e) => e.stopPropagation()}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-slate-900/95 to-red-900/95 backdrop-blur-xl border border-white/20 text-white">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                    Delete Family Tree?
                  </DialogTitle>
                  <DialogDescription className="text-blue-200">
                    This action cannot be undone. This will permanently delete
                    <span className="font-semibold text-white">
                      {' '}
                      &quot;{familyTree.title}&quot;{' '}
                    </span>
                    and all of its members and connections.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDelete}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
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
