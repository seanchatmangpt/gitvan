import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GitVan Autonomic System',
  description: 'Git automation with AI-powered workflow generation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
