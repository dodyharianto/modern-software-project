import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiHome, FiBriefcase, FiMail, FiMenu, FiX, FiLogOut, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '../lib/auth';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user && router.pathname !== '/login') {
      router.replace('/login');
      return;
    }
    if (user && router.pathname === '/admin' && user.role !== 'admin') {
      router.replace('/');
    }
  }, [user, loading, router.pathname]);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: FiHome },
    { href: '/hr-briefings', label: 'HR Briefings', icon: FiBriefcase },
    { href: '/outreach-consent', label: 'Outreach & Consent', icon: FiMail },
  ];

  if (router.pathname === '/login') {
    return <main>{children}</main>;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">AI Recruiter</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Link>
                  );
                })}
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      router.pathname === '/admin'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <FiUserPlus className="w-4 h-4 mr-2" />
                    Admin
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline truncate max-w-[180px]">{user.email}</span>
              <button
                type="button"
                onClick={() => logout()}
                className="hidden sm:inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                title="Logout"
              >
                <FiLogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
              </button>
            </div>
          </div>
          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-gray-200 py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-base font-medium ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-base font-medium ${
                    router.pathname === '/admin'
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <FiUserPlus className="w-5 h-5 mr-3" />
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="flex items-center w-full px-4 py-3 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 sm:hidden"
              >
                <FiLogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

