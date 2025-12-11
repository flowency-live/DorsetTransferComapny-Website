import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Corporate Portal | Dorset Transfer Company',
  description: 'Corporate travel portal for Dorset Transfer Company business customers',
};

export default function CorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
