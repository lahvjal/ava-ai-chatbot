import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match'
      });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 6 characters long'
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password reset error:', error);
        setMessage({
          type: 'error',
          text: error.message || 'Failed to reset password'
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Password updated successfully! You can now log in with your new password.'
        });
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Password reset exception:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred while resetting your password'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Ava AI</span>
          </div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Set New Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        
        {mounted && (
          <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handlePasswordReset}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="password" className="sr-only">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {message && (
              <div
                className={`p-4 rounded-md ${
                  message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                <Link href="/" className="font-medium text-blue-600 hover:text-blue-500">
                  Back to Ava AI
                </Link>
              </p>
            </div>
          </form>
        )}
        
        {!mounted && (
          <div className="mt-6 text-center text-gray-500">
            <p>Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}
