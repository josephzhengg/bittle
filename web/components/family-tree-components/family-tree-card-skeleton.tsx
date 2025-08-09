import { Card } from '@/components/ui/card';

export default function FamilyTreeCardSkeleton() {
  return (
    <div className="w-full my-2 sm:my-3">
      <Card className="relative bg-white/80 border border-slate-200 rounded-xl overflow-hidden w-full">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-2 right-2 w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-xl"></div>
          <div className="absolute bottom-2 left-2 w-8 sm:w-12 h-8 sm:h-12 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-lg"></div>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center p-4 sm:p-6 gap-4 sm:gap-6">
          <div className="flex-1 min-w-0 w-full">
            {/* Status bar skeleton */}
            <div className="w-16 sm:w-20 h-1 rounded-full mb-2 sm:mb-3 bg-gray-300 animate-pulse"></div>

            {/* Title skeleton */}
            <div className="h-5 sm:h-6 w-3/4 bg-gray-300 rounded mb-2 animate-pulse"></div>

            {/* Description skeleton - hidden on mobile, shown on sm+ */}
            <div className="hidden sm:block space-y-2 mb-3 sm:mb-4">
              <div className="bg-slate-50/50 rounded-lg p-2 sm:p-3 border border-slate-100">
                <div className="h-4 w-full bg-gray-300 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-4/5 bg-gray-300 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Member count skeleton */}
            <div className="flex flex-wrap gap-3 sm:gap-4 mb-2 sm:mb-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-300 rounded animate-pulse mr-2"></div>
                <div className="h-3 w-16 sm:w-20 bg-gray-300 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Status badges skeleton */}
            <div className="flex gap-2">
              <div className="px-2 py-1 bg-gray-200 border border-gray-300 rounded-full animate-pulse">
                <div className="h-3 w-12 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>

          {/* Action buttons skeleton */}
          <div className="flex flex-row sm:flex-col gap-2">
            <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gray-300 rounded-lg animate-pulse"></div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gray-300 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
