import { Form } from '@/utils/supabase/models/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { deleteForm } from '@/utils/supabase/queries/form';
import { useSupabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type FormCardProps = {
  form: Form;
};

export default function FormCard({ form }: FormCardProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const queryUtils = useQueryClient();

  const handleDelete = async () => {
    try {
      await deleteForm(supabase, form.id);
    } catch {
      toast('Error deleting form, please try again.');
    } finally {
      queryUtils.refetchQueries({ queryKey: ['form'] });
    }
  };

  return (
    <Card className="flex flex-col justify-between w-full max-w-sm my-4">
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <CardTitle>{form.title}</CardTitle>
            <div className="text-sm text-muted-foreground ml-4">
              Created:&nbsp;
              {new Date(form.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            {form.deadline && (
              <div className="text-sm text-muted-foreground ml-4">
                Deadline:&nbsp;
                {new Date(form.deadline).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
          </div>

          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            aria-label="Delete question">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription>{form.description}</CardDescription>
      </CardHeader>

      <CardFooter className="mt-auto w-full">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/dashboard/current/form/${form.code}`)}>
          View Form
        </Button>
      </CardFooter>
    </Card>
  );
}
