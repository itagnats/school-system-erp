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
import { Textarea } from "@/components/ui/textarea";
import { HttpError } from "@/lib/api";
import type { CatalogGroup } from "@/types";
import { useCatalogMutations } from "../hooks/use-catalog";

/** Create or rename a master cost group (direction.md §12a). */
export function CatalogGroupDialog({
  group,
  open,
  onOpenChange,
}: Readonly<{
  /** Absent when creating. */
  group?: CatalogGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/*
          Keyed, so opening on a different group mounts a fresh form rather than
          copying the new values over the old ones in an effect.
        */}
        <GroupForm
          key={`${group?.id ?? "new"}-${String(open)}`}
          group={group}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function GroupForm({
  group,
  onDone,
}: Readonly<{ group?: CatalogGroup; onDone: () => void }>) {
  const mutation = useCatalogMutations();
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;

  return (
    <>
        <DialogHeader>
          <DialogTitle>{group ? "Edit cost group" : "New cost group"}</DialogTitle>
          <DialogDescription>
            A group gathers related cost items — teaching, facilities, student
            activities. Sheets draw their own groups from these.
          </DialogDescription>
        </DialogHeader>

        <form
          id="catalog-group-form"
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const input = {
              name,
              description: description.trim() === "" ? undefined : description.trim(),
            };
            mutation.mutate(
              group
                ? { kind: "update-group", groupId: group.id, input }
                : { kind: "create-group", input },
              { onSuccess: onDone },
            );
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={fieldErrors?.name ? true : undefined}
              aria-describedby={fieldErrors?.name ? "group-name-error" : undefined}
            />
            {fieldErrors?.name ? (
              <p id="group-name-error" role="alert" className="text-xs font-medium text-destructive">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional. What belongs in this group."
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" form="catalog-group-form" loading={mutation.isPending}>
            {group ? "Save changes" : "Create group"}
          </Button>
        </DialogFooter>
    </>
  );
}
