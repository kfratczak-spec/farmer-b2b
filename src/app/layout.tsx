import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Farmer B2B - Tutlo',
  description: 'System zarządzania grupami szkoleniowymi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
