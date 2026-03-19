import type { AppProps } from 'next/app';
import '../styles/globals.css';
import '../lib/axios'; // Apply ngrok + timeout defaults before any requests
import { AuthProvider } from '../lib/auth';
import Layout from '../components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}

