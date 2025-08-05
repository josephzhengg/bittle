import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import { Label } from '@/components/ui/label';

export default function Home() {
  return (
    <div>
      <Label>Index</Label>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Error fetching session:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  if (session?.user) {
    return {
      redirect: {
        destination: '/dashboard/current',
        permanent: false
      }
    };
  }

  return {
    redirect: {
      destination: '/login',
      permanent: false
    }
  };
}
