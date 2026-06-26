'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, Key, Mail, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isFederatedUser, setIsFederatedUser] = useState(false);
  const [checkingUserType, setCheckingUserType] = useState(true);

  // Check if user is federated
  useEffect(() => {
    const checkUserType = async () => {
      if (status === 'authenticated' && session?.user?.email) {
        try {
          const response = await fetch('/api/user-type');
          if (response.ok) {
            const data = await response.json();
            setIsFederatedUser(data.isFederated);
          }
        } catch (error) {
          console.error('Error checking user type:', error);
        } finally {
          setCheckingUserType(false);
        }
      }
    };

    checkUserType();
  }, [status, session?.user?.email]);

  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const handleChangePassword = async () => {
    // Reset errors
    setPasswordErrors({});
    setIsChangingPassword(true);

    // Validation
    const newErrors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      setIsChangingPassword(false);
      return;
    }

    try {
      // Call API to change password
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPasswordSuccess(true);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setTimeout(() => setPasswordSuccess(false), 5000);
      } else {
        setPasswordErrors({ currentPassword: result.error || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordErrors({ currentPassword: 'An error occurred. Please try again.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">View your account information and manage your password</p>
      </div>

      {/* User Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Information</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <User className="text-gray-400" size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Full Name</p>
              <p className="text-base text-gray-900 mt-1">{session?.user?.name || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Mail className="text-gray-400" size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email Address</p>
              <p className="text-base text-gray-900 mt-1">{session?.user?.email || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Shield className="text-gray-400" size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">User Role</p>
              <p className="text-base text-gray-900 mt-1 capitalize">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  (session?.user as any)?.role === 'admin'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {(session?.user as any)?.role || 'viewer'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {(session?.user as any)?.role === 'admin'
                  ? 'Full access to all features including settings and employee management'
                  : 'Read-only access to employee information'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card - Only for local users */}
      {!checkingUserType && !isFederatedUser && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Key className="text-gray-700" size={22} />
            <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
          </div>

        {/* Success Message */}
        {passwordSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Password Changed Successfully</h3>
                <p className="text-sm text-green-700 mt-1">
                  Your password has been updated. Use your new password the next time you sign in.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-6">
          Update your password to keep your account secure. Passwords must be at least 8 characters long.
        </p>

        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            error={passwordErrors.currentPassword}
            placeholder="Enter your current password"
            required
          />

          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            error={passwordErrors.newPassword}
            placeholder="Enter your new password (min. 8 characters)"
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            error={passwordErrors.confirmPassword}
            placeholder="Confirm your new password"
            required
          />

          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              onClick={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Changing Password...' : 'Change Password'}
            </Button>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Password Requirements</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Minimum 8 characters required</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Use a strong, unique password</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>You&apos;ll need to sign in again after changing your password</span>
            </li>
          </ul>
        </div>
        </div>
      )}

      {/* Federated User Notice */}
      {!checkingUserType && isFederatedUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Shield className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Federated Account</h3>
              <p className="text-sm text-blue-800 mb-3">
                Your account is authenticated through Okta (Single Sign-On). Password management is handled by your organization&apos;s identity provider.
              </p>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>To change your password, visit your organization&apos;s Okta portal</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Your access and permissions are centrally managed</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Contact your IT administrator for account assistance</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
