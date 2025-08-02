import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Users } from 'lucide-react';
import { useRouter } from 'next/router';

interface FormNavigationTabsProps {
  formCode: string;
  currentTab: 'forms' | 'applicants';
  basePath: 'current' | 'past';
}

export default function FormNavigationTabs({ formCode, currentTab, basePath }: FormNavigationTabsProps) {
  const router = useRouter();

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 p-1">
      <Tabs className="w-full" defaultValue={currentTab}>
        <TabsList className="h-12 p-1 bg-transparent rounded-lg w-full grid grid-cols-2">
          <TabsTrigger
            value="forms"
            onClick={() => router.push(`/dashboard/${basePath}/form/${formCode}`)}
            className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800">
            <FileText className="w-4 h-4" />
            <span className="hidden xs:inline">Forms</span>
          </TabsTrigger>
          <TabsTrigger
            value="applicants"
            onClick={() => router.push(`/dashboard/${basePath}/applicants/${formCode}`)}
            className="flex items-center gap-2 h-10 px-3 sm:px-6 rounded-md font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-slate-800 text-slate-600 hover:text-slate-800">
            <Users className="w-4 h-4" />
            <span className="hidden xs:inline">Applicants</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}