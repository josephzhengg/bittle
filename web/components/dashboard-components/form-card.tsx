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
    <Card className="w-72 my-2">
      <CardHeader>
        <CardTitle>{form.title}</CardTitle>
        <CardDescription>{form.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/dashboard/form/${form.code}`)}>
            View Form
          </Button>
        </CardFooter>
      </CardContent>
    </Card>
  );
}
