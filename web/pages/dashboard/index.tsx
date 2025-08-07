import { GetServerSidePropsContext } from 'next';

const createSupabaseServerClient = async () =>
  (await import('@/utils/supabase/clients/server-props'))
    .createSupabaseServerClient;

export default function Dashboard() {
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const createClient = await createSupabaseServerClient();
  const supabase = createClient(context);
  const { data: userData, error } = await supabase.auth.getUser();

  if (error || !userData?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  return {
    redirect: {
      destination: '/dashboard/current',
      permanent: false
    }
  };
}
