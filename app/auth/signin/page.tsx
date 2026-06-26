'use client';

import { Suspense, useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSearchParams, useRouter } from 'next/navigation';

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showOktaButton, setShowOktaButton] = useState(false);
  const [_checkingOkta, setCheckingOkta] = useState(true);

  // Check if Okta is configured on mount
  useEffect(() => {
    const checkOktaConfig = async () => {
      try {
        const response = await fetch('/api/okta-configured');
        if (response.ok) {
          const data = await response.json();
          setShowOktaButton(data.configured);
        }
      } catch (error) {
        console.error('Error checking Okta configuration:', error);
        setShowOktaButton(false);
      } finally {
        setCheckingOkta(false);
      }
    };

    checkOktaConfig();
  }, []);

  const handleLocalSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setLocalError('Invalid email or password');
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch (error) {
      setLocalError('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Sign in to HRMIS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            HR Management Information System
          </p>
        </div>

        {(error || localError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            <p className="text-sm">
              {localError && localError}
              {error === 'OAuthSignin' && 'Error occurred during sign in.'}
              {error === 'OAuthCallback' && 'Error processing authentication response.'}
              {error === 'OAuthCreateAccount' && 'Could not create account.'}
              {error === 'EmailCreateAccount' && 'Could not create email account.'}
              {error === 'Callback' && 'Error in authentication callback.'}
              {error === 'OAuthAccountNotLinked' && 'Account is linked to another provider.'}
              {error === 'EmailSignin' && 'Check your email for sign in link.'}
              {error === 'CredentialsSignin' && 'Invalid email or password.'}
              {error === 'SessionRequired' && 'Please sign in to access this page.'}
              {error === 'Configuration' && 'Okta is not configured. Please use local sign in.'}
              {error && !localError && !['OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'EmailCreateAccount', 'Callback', 'OAuthAccountNotLinked', 'EmailSignin', 'CredentialsSignin', 'SessionRequired', 'Configuration'].includes(error) && 'An error occurred during authentication.'}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Local Sign In Form */}
          <form onSubmit={handleLocalSignIn} className="space-y-4">
            <div>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in with Local Account'}
            </Button>
          </form>

          {/* Divider */}
          {showOktaButton && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Okta Sign In */}
              <Button
                variant="secondary"
                onClick={() => signIn('okta', { callbackUrl })}
                className="w-full"
              >
                Sign in with Okta
              </Button>
            </>
          )}
        </div>

        {/* Default Credentials */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">Default Accounts</p>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>Admin:</strong> admin@example.com / password</p>
            <p><strong>Viewer:</strong> viewer@example.com / password</p>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Contact your administrator for access or to set up Okta.</p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
