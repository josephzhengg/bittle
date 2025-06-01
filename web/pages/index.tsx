import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import { Label } from '@/components/ui/label';

export default function Home() {
  // This is the default page that displays when the app is accessed.
  // You can add dynamic paths using folders of the form [param] in the pages directory.
  // In these folders, you can create a file called [param].tsx to handle dynamic routing.

  return (
    <div>
      <Label>Index</Label>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const { data: user, error: userError } = await supabase.auth.getUser();

  if (user) {
    return {
      redirect: {
        destination: '/dashboard/current',
        permanent: false
      }
    };
  }

  if (userError || !user) {
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
