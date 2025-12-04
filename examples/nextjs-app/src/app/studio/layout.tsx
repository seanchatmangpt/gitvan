/**
 * Studio Route Layout
 * Ensures all studio routes render dynamically (not static)
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
