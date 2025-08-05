import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <style>{`
            body { background: #f7f8fd; color: #03040e; }
            .ui-label { /* Add styles from @/components/ui/label.tsx */ }
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
