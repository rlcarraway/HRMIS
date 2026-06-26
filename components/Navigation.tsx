'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Settings, Building2, LogOut, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogo } from '@/hooks/useLogo';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home, requiresAuth: false },
  { href: '/employees', label: 'Manage Employees', icon: Users, requiresAuth: true },
  { href: '/settings', label: 'Settings', icon: Settings, requiresAuth: true, adminOnly: true },
];

export function Navigation() {
  const pathname = usePathname();
  const { logo } = useLogo();
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  const canAccessItem = (item: typeof navItems[0]) => {
    // If item is admin-only, check if user is an admin
    if (item.adminOnly) {
      return (session?.user as any)?.role === 'admin';
    }
    // If item requires auth, check if user is logged in
    if (item.requiresAuth) {
      return !!session;
    }
    // Public items are accessible to everyone
    return true;
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              {logo ? (
                <img
                  src={logo}
                  alt="Company Logo"
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                  <Building2 size={24} className="text-white" />
                </div>
              )}
              <span className="text-xl font-bold text-primary">HRMIS</span>
            </Link>
            <div className="ml-10 flex items-center space-x-4">
              {navItems.filter(canAccessItem).map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isLoading && (
              <>
                {session ? (
                  <div className="flex items-center gap-3">
                    <Link href="/profile" className="text-sm hover:bg-gray-100 rounded-lg p-2 transition-colors cursor-pointer">
                      <p className="font-medium text-gray-900">{session.user?.name}</p>
                      <p className="text-gray-500 capitalize">{(session.user as any)?.role || 'viewer'}</p>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex items-center gap-2"
                    >
                      <LogOut size={18} />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => signIn()}
                    className="flex items-center gap-2"
                  >
                    <LogIn size={18} />
                    Sign In
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
