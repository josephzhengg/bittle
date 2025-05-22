import { createSupabaseComponentClient } from "@/utils/supabase/clients/component";
import { createSupabaseServerClient } from "@/utils/supabase/clients/server-props";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { create } from "domain";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Label } from "@/components/ui/label";

type HomeProps = {
  user: User;
};

export default function Home({ user }: HomeProps) {
  // This is the default page that displays when the app is accessed.
  // You can add dynamic paths using folders of the form [param] in the pages directory.
  // In these folders, you can create a file called [param].tsx to handle dynamic routing.

  const supabase = createSupabaseComponentClient();
  const router = useRouter();

  return (
    <div>
      <Label>Index</Label>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(context);
  const { data: user, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
