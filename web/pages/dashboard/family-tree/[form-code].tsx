import { GetServerSidePropsContext } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase/clients/server-props';

export default function FamilyTreePage() {}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const { data: userData, error } = await supabase.auth.getUser();
  const { 'form-code': formCode } = context.query;

  if (!userData || error) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  return {
    redirect: {
      destination: `/dashboard/family-tree/${formCode}/graph`,
      permanent: false
    }
  };
}
