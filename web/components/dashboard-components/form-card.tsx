import { Form } from '@/utils/supabase/models/form';
import {
  Card,
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
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';

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
        <div className="flex flex-row items-start justify-between">
          <div className="flex flex-col">
            <CardTitle className="text-lg mb-1">{form.title}</CardTitle>
            <div className="text-xs text-muted-foreground">
              Created:&nbsp;
              {new Date(form.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            {form.deadline && (
              <div className="text-xs text-muted-foreground">
                Deadline:&nbsp;
                {new Date(form.deadline).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                aria-label="Delete form">
                <X className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete
                  your form and all of its data.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  type="button"
                  onClick={handleDelete}>
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
