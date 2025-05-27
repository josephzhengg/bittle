import { Form } from '@/utils/supabase/models/form';
import { NextRouter } from 'next/router';

export type FormCardProps = {
  form: Form;
  router: NextRouter;
};

export default function FormCard({ form, router }: FormCardProps) {}
