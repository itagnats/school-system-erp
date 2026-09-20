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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HttpError } from "@/lib/api";
import type { CatalogItem, CostKind } from "@/types";
import { useCatalogMutations } from "../hooks/use-catalog";

/**
 * Create or edit a master cost item (direction.md §12a).
 *
 * One dialog for both, because the fields are identical and the only difference
 * is what they start as. A separate "edit" dialog would be the same form with
 * one more chance to drift out of step.
 *
 * There is no allocation field any more (revised 2026-09-15). The kind now
 * decides which sheet the item can reach — direct onto a course, indirect onto a
 * program term — and a share of the indirect pool is derived from the driver
 * rather than typed here.
 */
export function CatalogItemDialog({
  groupId,
  groupName,
  item,
  open,
  onOpenChange,
}: Readonly<{
  groupId: string;
  groupName: string;
  /** Absent when creating. */
  item?: CatalogItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/*
          Keyed, so opening the dialog on a different item mounts a fresh form
          rather than copying the new values over the old ones in an effect.
          Remounting is the React-idiomatic way to say "these fields belong to
          that record", and it is what the set-state-in-effect rule is pointing
          at.
        */}
        <ItemForm
          key={`${item?.id ?? "new"}-${String(open)}`}
          groupId={groupId}
          groupName={groupName}
          item={item}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({
  groupId,
  groupName,
  item,
  onDone,
}: Readonly<{
  groupId: string;
  groupName: string;
  item?: CatalogItem;
  onDone: () => void;
}>) {
  const mutation = useCatalogMutations();

  const [name, setName] = useState(item?.name ?? "");
  const [kind, setKind] = useState<CostKind>(item?.kind ?? "direct");
  const [unitPrice, setUnitPrice] = useState(String(item?.defaultUnitPrice ?? 0));
  const [quantity, setQuantity] = useState(String(item?.defaultQuantity ?? 1));
  const [note, setNote] = useState(item?.note ?? "");

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;

  function submit() {
    const input = {
      name,
      kind,
      defaultUnitPrice: Number(unitPrice),
      defaultQuantity: Number(quantity),
      note: note.trim() === "" ? undefined : note.trim(),
    };

    mutation.mutate(
      item
        ? { kind: "update-item", groupId, itemId: item.id, input }
        : { kind: "create-item", groupId, input },
      { onSuccess: onDone },
    );
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>{item ? "Edit cost item" : "New cost item"}</DialogTitle>
          <DialogDescription>
            In {groupName}. These are the defaults a sheet copies — a sheet may
            then say otherwise without changing anything here.
          </DialogDescription>
        </DialogHeader>

        <form
          id="catalog-item-form"
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field id="item-name" label="Name" error={fieldErrors?.name}>
            <Input
              id="item-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={fieldErrors?.name ? true : undefined}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="item-kind">Kind</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as CostKind)}>
                <SelectTrigger id="item-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct — wholly this course</SelectItem>
                  <SelectItem value="indirect">Indirect — borne by the program</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Field
              id="item-price"
              label="Default unit price"
              error={fieldErrors?.defaultUnitPrice}
            >
              <Input
                id="item-price"
                type="number"
                inputMode="numeric"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                aria-invalid={fieldErrors?.defaultUnitPrice ? true : undefined}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="item-quantity"
              label="Default quantity"
              error={fieldErrors?.defaultQuantity}
            >
              <Input
                id="item-quantity"
                type="number"
                inputMode="numeric"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                aria-invalid={fieldErrors?.defaultQuantity ? true : undefined}
              />
            </Field>

          </div>

          <Field id="item-note" label="Note" error={fieldErrors?.note}>
            <Textarea
              id="item-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional. What this rate assumes."
            />
          </Field>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" form="catalog-item-form" loading={mutation.isPending}>
            {item ? "Save changes" : "Create item"}
          </Button>
        </DialogFooter>
    </>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: Readonly<{
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
