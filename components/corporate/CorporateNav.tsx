'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  CalendarPlus,
  Star,
  Users,
  UserCog,
  Settings,
  History,
  LogOut,
  X,
  Menu,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface CorporateNavProps {
  userName?: string;
  companyName?: string;
  isAdmin?: boolean;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_SECTIONS = {
  main: {
    label: null,
    items: [
      { href: '/corporate/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    ],
  },
  book: {
    label: 'Book',
    items: [
      { href: '/corporate/quote', label: 'New Booking', icon: <CalendarPlus className="w-5 h-5" /> },
      { href: '/corporate/trips', label: 'Favourite Trips', icon: <Star className="w-5 h-5" /> },
    ],
  },
  manage: {
    label: 'Manage',
    items: [
      { href: '/corporate/passengers', label: 'Passengers', icon: <Users className="w-5 h-5" /> },
      { href: '/corporate/team', label: 'Team', icon: <UserCog className="w-5 h-5" />, adminOnly: true },
    ],
  },
  account: {
    label: 'Account',
    items: [
      { href: '/corporate/settings/preferences', label: 'Preferences', icon: <Settings className="w-5 h-5" /> },
      { href: '/corporate/history', label: 'Booking History', icon: <History className="w-5 h-5" /> },
    ],
  },
};

export default function CorporateNav({
  userName,
  companyName,
  isAdmin = false,
  onLogout,
  isOpen,
  onClose,
  onToggle,
}: CorporateNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/corporate/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return null;

    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`
          corp-nav-item
          flex items-center gap-3
          px-3 py-2.5
          rounded-lg
          transition-all duration-200
          ${active ? 'corp-nav-item-active' : ''}
        `}
      >
        <span className="corp-nav-icon">{item.icon}</span>
        <span className="font-medium">{item.label}</span>
        {item.adminOnly && (
          <span className="corp-badge corp-badge-admin ml-auto text-xs">
            Admin
          </span>
        )}
      </Link>
    );
  };

  const renderSection = (sectionKey: string, section: { label: string | null; items: NavItem[] }) => {
    const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin);
    if (visibleItems.length === 0) return null;

    return (
      <div key={sectionKey} className="mb-6">
        {section.label && (
          <h3 className="corp-nav-section-label px-3 mb-2 text-xs font-semibold uppercase tracking-wider">
            {section.label}
          </h3>
        )}
        <nav className="space-y-1">
          {section.items.map(renderNavItem)}
        </nav>
      </div>
    );
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={onToggle}
        className="corp-mobile-menu-btn fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg"
        aria-label="Toggle navigation menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          corp-sidebar
          fixed top-0 left-0 bottom-0
          w-64 z-50
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="corp-sidebar-header flex items-center justify-center h-20 px-4 border-b">
          <Link href="/corporate/dashboard" onClick={onClose}>
            <Image
              src="/dtc-letterhead-logo.png"
              alt="The Dorset Transfer Company"
              width={160}
              height={48}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-6">
          {Object.entries(NAV_SECTIONS).map(([key, section]) => renderSection(key, section))}
        </div>

        {/* Footer */}
        <div className="corp-sidebar-footer border-t px-3 py-4">
          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-3 mb-3">
            <div className="corp-user-avatar w-10 h-10 rounded-full flex items-center justify-center font-semibold">
              {userName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="corp-user-name text-sm font-medium truncate">{userName || 'User'}</p>
              <p className="corp-user-company text-xs truncate">{companyName || 'Company'}</p>
            </div>
            {isAdmin && (
              <span className="corp-badge corp-badge-admin text-xs">Admin</span>
            )}
          </div>

          {/* Theme toggle & sign out */}
          <div className="flex items-center gap-2">
            <ThemeToggle className="flex-1 justify-center" />
            <button
              onClick={onLogout}
              className="corp-btn-signout flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
