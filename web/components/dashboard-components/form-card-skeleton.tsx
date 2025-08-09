import { Card, CardContent } from '@/components/ui/card';

export default function FormCardSkeleton() {
  return (
    <Card className="border border-slate-200 rounded-xl overflow-hidden animate-pulse">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-3">
            <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
            <div className="h-4 w-full bg-slate-200 rounded"></div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
              <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-slate-200 rounded-lg"></div>
            <div className="h-9 w-9 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
