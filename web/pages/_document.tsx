import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta
            name="description"
            content="A modern web application for managing forms and data, built with Next.js and Supabase."
          />
          <title>Bittle</title>
          <link rel="preload" href="/styles/globals.css" as="style" />
          <link rel="stylesheet" href="/styles/globals.css" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
