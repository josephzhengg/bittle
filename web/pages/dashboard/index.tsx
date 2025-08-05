import { QueryClient } from '@tanstack/react-query';
import { getForms } from '@/utils/supabase/queries/form';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';
import { GetServerSidePropsContext } from 'next';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  return (
    <div className={styles.container}>
      <div className={styles.textCenter}>
        <div className={styles.spinner}></div>
        <p className={styles.text}>Loading...</p>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const queryClient = new QueryClient();
  let formData = null;
  try {
    formData = await queryClient.fetchQuery({
      queryKey: ['form', userData.user.id],
      queryFn: () => getForms(supabase, userData.user.id)
    });
  } catch {
    return {
      redirect: {
        destination: '/error',
        permanent: false
      }
    };
  }

  return {
    redirect: {
      destination:
        formData && formData[0]
          ? `/dashboard/form/${formData[0].id}`
          : '/dashboard/empty',
      permanent: false
    }
  };
}
