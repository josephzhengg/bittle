import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta
            title="Bittle"
            name="description"
            content="A modern web application for managing forms and data, built with Next.js and Supabase."
          />
          <style>{`
            body { background: #f7f8fd; color: #03040e; }
          `}</style>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
