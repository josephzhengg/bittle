import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { getFormTitle } from '@/utils/supabase/queries/form';
import { Label } from '@radix-ui/react-label';
import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import z from 'zod';

export type CurrentFormsPageProps = {
  user: User;
};
export default function FormPage({ user }: CurrentFormsPageProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const { 'form-code': formCode } = router.query;

  const { data: formData } = useQuery({
    queryKey: ['title'],
    queryFn: async () => {
      const code = z.string().parse(formCode);
      return getFormTitle(supabase, code);
    }
  });

  return (
    <DashBoardLayout user={user}>
      <Label className="text-2xl font-bold text-foreground my-4">
        {formData}
      </Label>
      <Tabs className="flex-grow" defaultValue="applicants">
        <TabsList>
          <TabsTrigger
            value="forms"
            onClick={() => router.push(`/dashboard/current/form/${formCode}`)}>
            Forms
          </TabsTrigger>
          <TabsTrigger
            value="applicants"
            onClick={() =>
              router.push(`/dashboard/current/applicants/${formCode}`)
            }>
            Applicants
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <p>testing</p>
    </DashBoardLayout>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error } = await supabase.auth.getUser();

  if (!userData || error) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  return {
    props: {
      user: userData.user
    }
  };
}
