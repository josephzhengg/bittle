import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { getForms } from '@/utils/supabase/queries/form';
import type { User } from '@supabase/supabase-js';

import { Label } from '@/components/ui/label';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import { useSupabase } from '@/lib/supabase';

type DashboardProps = {
  user: User;
};

export default function Dashboard({ user }: DashboardProps) {
  const supabase = useSupabase();
  const router = useRouter();

  const { data: formData, isLoading: formLoading } = useQuery({
    queryKey: ['form'],
    queryFn: () => getForms(supabase, user.id)
  });
  useEffect(() => {
    if (formData && formData[0]) {
      <p> </p>;
    }
  });
  //   console.log(formData);
  return (
    <div>
      {formData?.map((form) => {
        return <Label key={form.id}>{form.author}</Label>;
      })}
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const { data: user, error } = await supabase.auth.getUser();

  if (!user || error) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  return {
    props: {}
  };
}
