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
      <main className="lg:ml-64 min-h-screen">
        {/* Page Header (optional) */}
        {pageTitle && (
          <header className="corp-page-header h-16 flex items-center px-6 border-b lg:pl-6 pl-16">
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
          </header>
        )}

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
