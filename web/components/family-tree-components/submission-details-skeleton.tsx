import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { User, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubmissionDetailsLoadingSkeletonProps {
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SubmissionDetailsLoadingSkeleton: React.FC<
  SubmissionDetailsLoadingSkeletonProps
> = ({ onClose, isCollapsed = false, onToggleCollapse }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col">
      {/* Floating Panel */}
      <div
        className={`bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-2xl transition-all duration-300 ease-out ${
          isCollapsed ? 'w-14' : 'w-96'
        }`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100/50">
          <div
            className={`flex items-center space-x-3 ${
              isCollapsed ? 'hidden' : ''
            }`}>
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Submission Details
              </h2>
              <Skeleton className="h-3 w-16 bg-gray-200 mt-1" />
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                <GripVertical className="w-4 h-4 text-gray-500" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div
          className={`transition-all duration-300 ${
            isCollapsed ? 'h-0 overflow-hidden' : 'h-auto'
          }`}>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Generate 3-5 skeleton question items */}
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
                  {/* Question Header Skeleton */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {/* Question number circle */}
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {/* Question type icon skeleton */}
                        <Skeleton className="w-4 h-4 bg-gray-300 rounded" />
                        {/* Question type badge skeleton */}
                        <Skeleton className="h-5 w-20 bg-gray-200 rounded-full" />
                      </div>
                    </div>
                    {/* Status icon skeleton */}
                    <Skeleton className="w-4 h-4 bg-gray-300 rounded-full" />
                  </div>

                  {/* Question Text Skeleton */}
                  <div className="mb-3 space-y-1">
                    <Skeleton className="h-3 w-full bg-gray-200" />
                    <Skeleton className="h-3 w-3/4 bg-gray-200" />
                  </div>

                  {/* Response Area Skeleton */}
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/80">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full bg-gray-200" />
                      <Skeleton className="h-3 w-5/6 bg-gray-200" />
                      {/* Randomly show 1-3 lines to simulate different response lengths */}
                      {index % 3 !== 0 && (
                        <Skeleton className="h-3 w-2/3 bg-gray-200" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetailsLoadingSkeleton;
