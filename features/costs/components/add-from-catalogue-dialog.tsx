"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/feedback";
import { useCatalogue } from "@/features/cost-catalogue/hooks/use-catalogue";
import { HttpError } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { CostGroup } from "@/types";
import { useSheetContents } from "../hooks/use-cost-sheet-mutations";

/**
 * Copy a catalogue item onto one of the sheet's groups (direction.md §12a).
 *
 * The picker is scoped to the catalogue group this sheet group came from, when
 * it has one: a sheet's "Facilities" wants facilities items, and offering the
 * whole catalogue would turn a two-click action into a search.
 *
 * No price field. The price comes from the catalogue at the moment of copying —
 * letting the dialog name one would make the line's provenance a claim rather
 * than a fact. The copy is editable the moment it lands on the sheet.
 */
export function AddFromCatalogueDialog({
  sheetId,
  group,
  open,
  onOpenChange,
}: Readonly<{
  sheetId: string;
  group: CostGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const catalogue = useCatalogue({ status: "active" });
  const mutation = useSheetContents(sheetId);

  const [selected, setSelected] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");

  const source = catalogue.data?.find((entry) => entry.id === group.catalogueGroupId);
  // A sheet group with no catalogue origin still needs somewhere to draw from,
  // so fall back to everything rather than showing an empty picker.
  const available = (source ? [source] : (catalogue.data ?? [])).flatMap((entry) =>
    entry.items.filter((item) => item.status === "active"),
  );

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to {group.name}</DialogTitle>
          <DialogDescription>
            The sheet takes a copy. Changing the catalogue later will not change
            this line.
          </DialogDescription>
        </DialogHeader>

        {catalogue.isPending ? <LoadingState label="Loading the catalogue" /> : null}

        {!catalogue.isPending && available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every active item in this group is already on the sheet, or the
            catalogue has none. Add one under Cost Catalogue first.
          </p>
        ) : null}

        <div className="grid max-h-72 gap-2 overflow-y-auto">
          {available.map((item) => {
            const isSelected = selected === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                aria-pressed={isSelected}
                className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors duration-fast ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-hairline hover:bg-surface-sunken"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {item.kind === "direct" ? "Direct" : "Shared"} · default quantity{" "}
                    {item.defaultQuantity}
                  </span>
                </span>
                <span className="shrink-0 text-sm" data-numeric>
                  {item.options.length > 0
                    ? `${item.options.length} options`
                    : formatCurrency(item.defaultUnitPrice, "THB")}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="add-quantity">Quantity</Label>
          <Input
            id="add-quantity"
            type="number"
            inputMode="numeric"
            className="w-32"
            placeholder="Catalogue default"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-invalid={fieldErrors?.quantity ? true : undefined}
          />
          {fieldErrors?.quantity ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {fieldErrors.quantity}
            </p>
          ) : null}
        </div>

        {fieldErrors?.catalogueItemId ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {fieldErrors.catalogueItemId}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected}
            loading={mutation.isPending}
            onClick={() =>
              selected &&
              mutation.mutate(
                {
                  kind: "add-item",
                  input: {
                    groupId: group.id,
                    catalogueItemId: selected,
                    quantity: quantity === "" ? undefined : Number(quantity),
                  },
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            Add to sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
