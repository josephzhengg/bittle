import { createSupabaseComponentClient } from '@/utils/supabase/clients/component';
import { useRouter } from 'next/router';
import ResetPasswordCard from '@/components/login-signup/reset-password-card';
import LoginLayout from '@/components/layouts/login-card-layout';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseComponentClient();

  return (
    <LoginLayout>
      <ResetPasswordCard supabase={supabase} router={router} />
    </LoginLayout>
  );
}
