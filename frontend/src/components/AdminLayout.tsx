'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  Link2, 
  CheckSquare, 
  Megaphone, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('http://localhost:3001/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Unauthorized');
        }

        const data = await response.json();
        setAdminUser(data.username);
      } catch (err) {
        localStorage.removeItem('admin_token');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pengguna', href: '/users', icon: Users },
    { name: 'Rujukan (Referrals)', href: '/referrals', icon: Link2 },
    { name: 'Tugas & Aturan', href: '/tasks', icon: CheckSquare },
    { name: 'Siaran (Broadcast)', href: '/broadcast', icon: Megaphone },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#C59B27] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {/* Sidebar for Desktop */}
      <aside className="w-64 bg-[#121212] border-r border-white/5 flex-col justify-between hidden md:flex">
        <div>
          {/* Logo / Header */}
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <img src="/logo.jpg" alt="ANOA Logo" className="w-10 h-10 rounded-full border border-[#C59B27]/40 object-cover" />
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-wider bg-gradient-to-r from-[#C59B27] via-[#E5C07B] to-[#C59B27] bg-clip-text text-transparent uppercase leading-none">
                ANOA
              </span>
              <span className="text-[10px] font-bold tracking-[0.22em] text-[#E5C07B]/80 uppercase mt-1">
                Dashboard
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#C59B27]/10 text-[#C59B27] border border-[#C59B27]/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / Admin User Info */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300">
            <UserIcon className="w-5 h-5 text-gray-400" />
            <span className="truncate">{adminUser}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-16 bg-[#121212] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="ANOA Logo" className="w-8 h-8 rounded-full border border-[#C59B27]/40 object-cover" />
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-wider bg-gradient-to-r from-[#C59B27] via-[#E5C07B] to-[#C59B27] bg-clip-text text-transparent uppercase leading-none">
                ANOA
              </span>
              <span className="text-[8px] font-bold tracking-[0.2em] text-[#E5C07B]/80 uppercase">
                Dashboard
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Navigation overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute inset-0 top-16 bg-[#0A0A0A] z-50 flex flex-col justify-between p-4">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#C59B27]/10 text-[#C59B27] border border-[#C59B27]/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/5 pt-4 space-y-2">
              <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <span>{adminUser}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
