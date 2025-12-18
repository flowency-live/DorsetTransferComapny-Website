'use client';

import Image from 'next/image';
import Link from 'next/link';

interface CorporateHeaderProps {
  userName?: string;
  companyName?: string;
  onLogout: () => void;
  isAdmin?: boolean;
}

export default function CorporateHeader({ userName, companyName, onLogout }: CorporateHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FBF7F0]">
      {/* Top sage accent bar */}
      <div className="h-1 bg-sage-light" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/corporate/dashboard" className="flex-shrink-0">
            <Image
              src="/dtc-letterhead-logo.png"
              alt="The Dorset Transfer Company"
              width={200}
              height={60}
              className="h-14 w-auto"
              priority
            />
          </Link>

          {/* Corporate Portal Badge + User Info */}
          <div className="flex items-center gap-6">
            {/* Corporate Portal Badge */}
            <span className="hidden sm:inline-block px-3 py-1 bg-sage-light/50 text-sage-dark text-sm font-medium rounded-full">
              Corporate Portal
            </span>

            {/* User Info & Sign Out */}
            <div className="flex items-center gap-4 pl-4 border-l border-sage-light">
              <div className="hidden sm:block text-right">
                {userName && (
                  <p className="text-sm font-medium text-navy">{userName}</p>
                )}
                {companyName && (
                  <p className="text-xs text-navy-light/70">{companyName}</p>
                )}
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-sage hover:bg-sage-dark rounded-full transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom sage accent bar */}
      <div className="h-1 bg-sage-light" />
    </header>
  );
}
