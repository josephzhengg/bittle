import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Head>
        <title>Home - My App</title>
        <meta
          name="description"
          content="Welcome to My App, your starting point for managing forms and data."
        />
        <link
          rel="preconnect"
          href="https://your-supabase-domain.supabase.co"
        />
      </Head>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Welcome to My App</h1>
        <p className="text-lg">
          <Link href="/login" className="text-blue-600 hover:underline">
            Log in
          </Link>{' '}
          or{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>{' '}
          to get started.
        </p>
      </div>
    </>
  );
}

export async function getStaticProps() {
  return {
    props: {},
    revalidate: 86400
  };
}
