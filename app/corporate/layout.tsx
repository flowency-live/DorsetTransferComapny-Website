import type { Metadata } from 'next';
import './corporate-theme.css';

export const metadata: Metadata = {
  title: 'Corporate Portal | Dorset Transfer Company',
  description: 'Corporate travel portal for Dorset Transfer Company business customers',
};

export default function CorporateRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
