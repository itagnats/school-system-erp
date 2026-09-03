"use client";

import { useEffect, useRef, useState } from "react";
import { SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The pending state on a real click, because that is the only way to show that
 * the button stops accepting a second one.
 *
 * The timeout stands in for a mutation. It is cleared on unmount so a fast
 * navigation away cannot set state on a component that is gone.
 */
export function PendingButtonDemo() {
  const [pending, setPending] = useState(false);
  const [saves, setSaves] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function save() {
    setPending(true);
    timer.current = setTimeout(() => {
      setPending(false);
      setSaves((count) => count + 1);
    }, 1400);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button loading={pending} onClick={save}>
        {pending ? null : <SaveIcon data-icon="inline-start" aria-hidden />}
        {pending ? "Saving…" : "Save changes"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Completed saves: <span data-numeric>{saves}</span>. Click repeatedly while it
        is pending — the count only ever goes up by one, because `loading` sets the
        native `disabled`.
      </p>
    </div>
  );
}
