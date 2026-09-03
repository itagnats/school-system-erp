import Link from "next/link";
import { EmptyState } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <EmptyState
        title="Page not found"
        description="That route does not exist. It may have been renamed or removed."
        action={
          <Button asChild size="sm">
            <Link href={routes.dashboard()}>Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
