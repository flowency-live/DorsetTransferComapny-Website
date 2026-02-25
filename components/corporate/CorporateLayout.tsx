'use client';

import { useState, ReactNode } from 'react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import CorporateNav from './CorporateNav';

interface CorporateLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function CorporateLayout({ children, pageTitle }: CorporateLayoutProps) {
  const { user, isLoading, isAdmin, logout } = useRequireCorporateAuth();
  const [navOpen, setNavOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center corp-loading-bg">
        <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin" />
      </div>
    );
  }

  // Always show welcome message in header
  const welcomeMessage = `Welcome back, ${user?.name || 'Guest'}`;

  return (
    <div className="corp-layout min-h-screen">
      {/* Sidebar Navigation */}
      <CorporateNav
        userName={user?.name}
        companyName={user?.companyName}
        isAdmin={isAdmin}
        onLogout={logout}
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        onToggle={() => setNavOpen(!navOpen)}
      />

      {/* Main Content Area */}
      <main className="lg:ml-64 min-h-screen flex flex-col">
        {/* Fixed Header Bar - always shows welcome message */}
        <header className="corp-main-header h-20 flex items-center px-6 lg:pl-6 pl-16 shadow-sm">
          <div className="flex-1">
            <h1 className="text-xl font-semibold corp-header-title">{welcomeMessage}</h1>
          </div>
        </header>
        {/* Sage accent bar - matches public site header */}
        <div className="h-1 bg-sage-light flex-shrink-0" />

        {/* Page Content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
