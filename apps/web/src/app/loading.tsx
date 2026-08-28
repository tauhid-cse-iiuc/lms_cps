import { PageShell, Skeleton, ListSkeleton } from '@/components/ui';

/**
 * Shown while a server component is fetching.
 *
 * Next renders this automatically during navigation, so a slow API call shows
 * the shape of the page rather than a blank screen. Skeletons match the real
 * layout so nothing jumps when the content lands.
 */
export default function Loading() {
  return (
    <PageShell>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-72" />
      <ListSkeleton count={4} />
    </PageShell>
  );
}
