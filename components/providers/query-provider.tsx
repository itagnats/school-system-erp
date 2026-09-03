"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { HttpError } from "@/lib/api";

/**
 * Server-state boundary (scaffold.md §18). One client per browser session,
 * created inside state so a re-render never swaps it and a server render never
 * shares a cache between requests.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // A 4xx will not become a 2xx by asking again; only retry
              // transport and server faults, and only twice.
              if (error instanceof HttpError && error.status && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
