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

export type FormCardProps = {
  form: Form;
};

export default function FormCard({ form }: FormCardProps) {
  const router = useRouter();
  return (
    <Card className="flex flex-col justify-between w-full max-w-sm my-4">
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle>{form.title}</CardTitle>
          <div className="text-sm text-muted-foreground ml-4">
            {new Date(form.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
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
