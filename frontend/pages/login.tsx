import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, setup, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios.get('/api/auth/needs-setup').then((res) => {
      setNeedsSetup(res.data?.needs_setup ?? false);
    }).catch(() => setNeedsSetup(false));
  }, []);

  if (user) {
    router.replace('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (needsSetup) {
        await setup(email, password);
      } else {
        await login(email, password);
      }
      router.replace('/');
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Login failed';
      const status = err.response?.status;
      if (status === 404 || (typeof detail === 'string' && detail.toLowerCase().includes('not found'))) {
        setError(
          'Backend returned Not Found. Ensure the backend is running (port 8000) and restarted after adding authentication.'
        );
      } else {
        setError(detail);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSetupMode = needsSetup === true;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">AI Recruiter</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isSetupMode ? 'Create the first admin account' : 'Sign in to your account'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {(needsSetup === null) ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete={isSetupMode ? 'email' : 'username'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSetupMode ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {submitting ? 'Please wait...' : isSetupMode ? 'Create admin account' : 'Sign in'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
