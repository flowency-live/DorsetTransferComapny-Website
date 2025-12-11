'use client';

import Image from 'next/image';
import Link from 'next/link';

interface CorporateHeaderProps {
  userName?: string;
  companyName?: string;
  onLogout: () => void;
  isAdmin?: boolean;
}

export default function CorporateHeader({ userName, companyName, onLogout, isAdmin }: CorporateHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FBF7F0]">
      {/* Top sage accent bar */}
      <div className="h-1 bg-sage" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/dtc-letterhead-logo.png"
              alt="The Dorset Transfer Company"
              width={200}
              height={50}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Corporate Portal Badge + Nav */}
          <div className="flex items-center gap-6">
            {/* Corporate Portal Badge */}
            <span className="hidden sm:inline-block px-3 py-1 bg-sage/10 text-sage text-sm font-medium rounded-full">
              Corporate Portal
            </span>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/corporate/dashboard"
                className="text-sm font-medium text-navy-light hover:text-navy transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/quote"
                className="text-sm font-medium text-navy-light hover:text-navy transition-colors"
              >
                Book Transfer
              </Link>
              {isAdmin && (
                <Link
                  href="/corporate/team"
                  className="text-sm font-medium text-navy-light hover:text-navy transition-colors"
                >
                  Team
                </Link>
              )}
            </nav>

            {/* User Info & Sign Out */}
            <div className="flex items-center gap-4 pl-4 border-l border-sage/30">
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
      <div className="h-1 bg-sage" />
    </header>
  );
}
