import DashBoardLayout from '@/components/layouts/dashboard-layout';
import { CardHeader, Card } from '@/components/ui/card';
import { useSupabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import { getForms } from '@/utils/supabase/queries/form';
import { useQuery } from '@tanstack/react-query';

export type CurrentFormsPageProps = {
  user: User;
};

export default function CurrentFormsPage({ user }: CurrentFormsPageProps) {
  const supabase = useSupabase();
  const router = useRouter();

  const { data: formData } = useQuery({
    queryKey: ['form'],
    queryFn: async () => getForms(supabase, user.id)
  });

  return (
    <DashBoardLayout>
      <p>testing</p>
      {formData?.map((form) => (
        <Card key={form.id}>
          <CardHeader>
            <h2 className="text-lg font-semibold">{form.id}</h2>
          </CardHeader>
        </Card>
      ))}
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
