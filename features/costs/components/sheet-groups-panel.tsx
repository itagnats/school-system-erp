"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DRIFT_LABEL,
  DRIFT_TONE,
} from "../constants";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type {
  CatalogComparison,
  CostGroup,
  CostGroupBreakdown,
  CostItem,
  CostKind,
} from "@/types";
import { useSheetContents } from "../hooks/use-cost-sheet-mutations";
import { AddFromCatalogDialog } from "./add-from-catalog-dialog";

/**
 * What is on the sheet, group by group (direction.md §12, §12a).
 *
 * This is the screen the cost sheet was missing: the structure rendered but
 * could not be changed, so "cost management" could recalculate a sheet and
 * never edit one.
 *
 * Each line shows where its rate came from. A line copied from the catalog
 * whose catalog price has since moved is marked — not corrected, because the
 * sheet owns its copy and a background correction is exactly what the snapshot
 * rule exists to prevent.
 */
export function SheetGroupsPanel({
  sheetId,
  currency,
  kind,
  groups,
  breakdowns,
  drift,
  detailKey,
}: Readonly<{
  sheetId: string;
  currency: string;
  /** What this sheet may hold (§12). Filters the picker. */
  kind: CostKind;
  groups: readonly CostGroup[];
  /** The server's recomputed totals for those same groups. */
  breakdowns: readonly CostGroupBreakdown[];
  drift: readonly CatalogComparison[];
  /** Where a write's response lands in the cache. */
  detailKey: readonly unknown[];
}>) {
  const [addingTo, setAddingTo] = useState<CostGroup | null>(null);
  const driftByItem = new Map(drift.map((entry) => [entry.itemId, entry]));
  // The charged figure per line comes from the server's breakdown, never from
  // multiplying the inputs here: §13 requires the arithmetic to be visible, and
  // re-deriving it in the browser would be a second implementation of it.
  const chargedByItem = new Map(
    breakdowns.flatMap((group) =>
      group.items.map((item) => [item.itemId, item.total] as const),
    ),
  );
  const totalsByGroup = new Map(
    breakdowns.map((group) => [group.groupId, group] as const),
  );

  return (
    <>
      {groups.map((group) => (
        <Section
          key={group.id}
          title={group.name}
          description={groupDescription(
            totalsByGroup.get(group.id),
            group.items.length,
            currency,
          )}
          className="mt-4"
          flush
          actions={
            <Button size="xs" onClick={() => setAddingTo(group)}>
              <Plus aria-hidden className="size-3.5" />
              Add from catalog
            </Button>
          }
        >
          {group.items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nothing costed in this group yet. Add an item from the catalog.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((item) => (
                  <SheetItemRow
                    key={item.id}
                    sheetId={sheetId}
                    currency={currency}
                    detailKey={detailKey}
                    item={item}
                    comparison={driftByItem.get(item.id)}
                    charged={chargedByItem.get(item.id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      ))}

      {addingTo ? (
        <AddFromCatalogDialog
          sheetId={sheetId}
          group={addingTo}
          kind={kind}
          detailKey={detailKey}
          open
          onOpenChange={(open) => setAddingTo(open ? addingTo : null)}
        />
      ) : null}
    </>
  );
}

function SheetItemRow({
  sheetId,
  currency,
  detailKey,
  item,
  comparison,
  charged,
}: Readonly<{
  sheetId: string;
  currency: string;
  detailKey: readonly unknown[];
  item: CostItem;
  comparison?: CatalogComparison;
  /** What this line contributes, from the server's recomputed breakdown. */
  charged?: number;
}>) {
  const mutation = useSheetContents(sheetId, detailKey);
  const [price, setPrice] = useState(String(item.unitPrice));
  const [quantity, setQuantity] = useState(String(item.quantity));

  const drift = comparison?.drift ?? "none";
  // `current` is the common case and carries no badge: marking every matching
  // row would bury the two that differ.
  const showBadge = drift !== "current";

  function commit(next: { unitPrice?: number; quantity?: number }) {
    mutation.mutate({ kind: "update-item", itemId: item.id, input: next });
  }

  return (
    <TableRow>
      <TableCell>
        <span className="font-medium">{item.name}</span>
        {showBadge ? (
          <StatusBadge
            className="ml-2"
            tone={DRIFT_TONE[drift]}
            label={DRIFT_LABEL[drift]}
          />
        ) : null}
        {drift === "differs" && comparison?.catalogUnitPrice !== undefined ? (
          <p className="text-xs text-muted-foreground">
            Catalog now says {formatCurrency(comparison.catalogUnitPrice, currency)}.
            This sheet keeps its own copy.
          </p>
        ) : null}
        {item.note ? <p className="text-xs text-muted-foreground">{item.note}</p> : null}
      </TableCell>

      <TableCell className="text-right">
        <Input
          className="ml-auto h-8 w-28 text-right"
          type="number"
          inputMode="numeric"
          value={price}
          aria-label={`Unit price for ${item.name}`}
          onChange={(event) => setPrice(event.target.value)}
          onBlur={() =>
            Number(price) !== item.unitPrice && commit({ unitPrice: Number(price) })
          }
        />
      </TableCell>

      <TableCell className="text-right">
        <Input
          className="ml-auto h-8 w-20 text-right"
          type="number"
          inputMode="numeric"
          value={quantity}
          aria-label={`Quantity for ${item.name}`}
          onChange={(event) => setQuantity(event.target.value)}
          onBlur={() =>
            Number(quantity) !== item.quantity && commit({ quantity: Number(quantity) })
          }
        />
      </TableCell>

      <TableCell className="text-right font-medium" data-numeric>
        {charged === undefined ? "—" : formatCurrency(charged, currency)}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {drift === "differs" ? (
            <Button
              variant="ghost"
              size="xs"
              loading={mutation.isPending}
              onClick={() => mutation.mutate({ kind: "realign-item", itemId: item.id })}
            >
              <RotateCcw aria-hidden className="size-3.5" />
              <span className="sr-only">
                Move {item.name} back onto the catalog price
              </span>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => mutation.mutate({ kind: "remove-item", itemId: item.id })}
          >
            <Trash2 aria-hidden className="size-3.5" />
            <span className="sr-only">Remove {item.name} from this sheet</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Group heading: what it costs and what share of the sheet that is. */
function groupDescription(
  totals: { total: number; sharePercent: number } | undefined,
  lineCount: number,
  currency: string,
): string {
  const lines = `${lineCount} line${lineCount === 1 ? "" : "s"}`;
  if (!totals) return `${lines} on this sheet.`;
  return `${formatCurrency(totals.total, currency)} — ${formatPercent(
    totals.sharePercent,
  )} of the total course cost · ${lines}`;
}
