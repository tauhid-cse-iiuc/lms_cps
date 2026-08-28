import { PageShell, EmptyState, Button } from '@/components/ui';

export const metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <PageShell width="narrow">
      <div className="pt-16">
        <EmptyState
          title="That page does not exist"
          description="The link may be out of date, or the thing it pointed at may have been deleted."
          action={<Button href="/courses">Browse courses</Button>}
        />
      </div>
    </PageShell>
  );
}
