"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Which evaluation the reports are being read for.
 *
 * The choice lives in the URL as `?setup=`, like every other list-state
 * decision in this application: a reader looking at one cohort's results can
 * refresh, bookmark or paste the view, and the server can read it so the first
 * paint is the right table rather than a default that swaps a moment later.
 */
export function ReportSetupPicker({
  setups,
  activeId,
}: Readonly<{
  setups: ReadonlyArray<{ id: string; label: string }>;
  activeId: string;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (setups.length === 0) return null;

  function select(next: string) {
    const search = new URLSearchParams(params);
    search.set("setup", next);
    // Replace rather than push: comparing five cohorts should not mean five
    // presses of Back to leave.
    router.replace(`${pathname}?${search.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor="report-setup" className="text-xs text-muted-foreground">
        Evaluation
      </Label>
      <Select value={activeId} onValueChange={select}>
        <SelectTrigger id="report-setup" size="sm" className="w-auto min-w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {setups.map((setup) => (
            <SelectItem key={setup.id} value={setup.id}>
              {setup.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
