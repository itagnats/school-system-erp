"use client";

import { useState } from "react";
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/feedback";
import { FilterBar, FilterSelect, SearchInput, Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { CatalogueGroup, CatalogueItem, Option } from "@/types";
import {
  CATALOGUE_STATUS_LABEL,
  CATALOGUE_STATUS_OPTIONS,
  CATALOGUE_STATUS_TONE,
  SNAPSHOT_NOTE,
} from "../constants";
import { useCatalogue, useCatalogueMutations } from "../hooks/use-catalogue";
import { CatalogueGroupDialog } from "./catalogue-group-dialog";
import { CatalogueItemDialog } from "./catalogue-item-dialog";

const KIND_OPTIONS: Option[] = [
  { value: "direct", label: "Direct" },
  { value: "shared", label: "Shared" },
];

/**
 * The master cost catalogue (direction.md §12a).
 *
 * Rendered as a list of groups rather than one flat table, because the group is
 * how the catalogue is maintained and how a sheet draws on it. A flat table
 * sorted by group would look tidier and would lose the thing being edited.
 */
export function CatalogueScreen() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");

  const query = useCatalogue({
    search: search || undefined,
    status: status === "all" ? undefined : status,
    kind: kind === "all" ? undefined : kind,
  });

  const [groupDialog, setGroupDialog] = useState<{ group?: CatalogueGroup } | null>(null);
  const activeFilters = [search !== "", status !== "all", kind !== "all"].filter(
    Boolean,
  ).length;

  return (
    <>
      <Section title="How the catalogue reaches a sheet" description={SNAPSHOT_NOTE}>
        <FilterBar
          activeCount={activeFilters}
          onClear={() => {
            setSearch("");
            setStatus("all");
            setKind("all");
          }}
          actions={
            <Button size="sm" onClick={() => setGroupDialog({})}>
              <Plus aria-hidden className="size-4" />
              New group
            </Button>
          }
        >
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search groups or items"
            aria-label="Search the cost catalogue"
            className="w-full max-w-xs"
          />
          <FilterSelect
            label="Status"
            value={status}
            options={CATALOGUE_STATUS_OPTIONS}
            onValueChange={setStatus}
          />
          <FilterSelect
            label="Kind"
            value={kind}
            options={KIND_OPTIONS}
            onValueChange={setKind}
          />
        </FilterBar>
      </Section>

      {query.isPending ? <TableSkeleton rows={6} columns={5} /> : null}

      {query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : null}

      {query.data?.length === 0 ? (
        <Section title="Nothing here yet" className="mt-4">
          <EmptyState
            variant={activeFilters > 0 ? "no-results" : "empty"}
            title={
              activeFilters > 0
                ? "No catalogue entry matches these filters"
                : "The catalogue is empty"
            }
            description={
              activeFilters > 0
                ? "Clear the filters to see everything."
                : "Create a cost group, then add the items that belong in it."
            }
          />
        </Section>
      ) : null}

      {query.data?.map((group) => (
        <CatalogueGroupPanel
          key={group.id}
          group={group}
          onEdit={() => setGroupDialog({ group })}
        />
      ))}

      <CatalogueGroupDialog
        group={groupDialog?.group}
        open={groupDialog !== null}
        onOpenChange={(open) => setGroupDialog(open ? groupDialog : null)}
      />
    </>
  );
}

function CatalogueGroupPanel({
  group,
  onEdit,
}: Readonly<{ group: CatalogueGroup; onEdit: () => void }>) {
  const mutation = useCatalogueMutations();
  const [itemDialog, setItemDialog] = useState<{ item?: CatalogueItem } | null>(null);

  return (
    <Section
      title={group.name}
      description={group.description}
      className="mt-4"
      flush
      actions={
        <div className="flex items-center gap-2">
          <StatusBadge
            tone={CATALOGUE_STATUS_TONE[group.status]}
            label={CATALOGUE_STATUS_LABEL[group.status]}
          />
          <Button variant="outline" size="xs" onClick={onEdit}>
            <Pencil aria-hidden className="size-3.5" />
            Edit
          </Button>
          <Button size="xs" onClick={() => setItemDialog({})}>
            <Plus aria-hidden className="size-3.5" />
            Add item
          </Button>
        </div>
      }
    >
      {group.items.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          No items in this group yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
              <TableHead>Item</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead className="text-right">Default price</TableHead>
              <TableHead className="text-right">Default qty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="font-medium">{item.name}</span>
                  {item.status === "archived" ? (
                    <StatusBadge
                      className="ml-2"
                      tone={CATALOGUE_STATUS_TONE.archived}
                      label="Archived"
                    />
                  ) : null}
                  {item.note ? (
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.kind === "direct" ? "Direct" : "Shared"}
                </TableCell>
                <TableCell className="text-right" data-numeric>
                  {item.options.length > 0 ? (
                    <span className="text-muted-foreground">
                      {item.options.length} options
                    </span>
                  ) : (
                    formatCurrency(item.defaultUnitPrice, "THB")
                  )}
                </TableCell>
                <TableCell className="text-right" data-numeric>
                  {item.defaultQuantity}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setItemDialog({ item })}
                    >
                      <Pencil aria-hidden className="size-3.5" />
                      <span className="sr-only">Edit {item.name}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      loading={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({
                          kind: "update-item",
                          groupId: group.id,
                          itemId: item.id,
                          input: {
                            status: item.status === "archived" ? "active" : "archived",
                          },
                        })
                      }
                    >
                      {item.status === "archived" ? (
                        <RotateCcw aria-hidden className="size-3.5" />
                      ) : (
                        <Archive aria-hidden className="size-3.5" />
                      )}
                      <span className="sr-only">
                        {item.status === "archived" ? "Restore" : "Archive"} {item.name}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        mutation.mutate({
                          kind: "delete-item",
                          groupId: group.id,
                          itemId: item.id,
                        })
                      }
                    >
                      <Trash2 aria-hidden className="size-3.5" />
                      <span className="sr-only">Delete {item.name}</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* A delete the server refused, because sheets have copied the item. */}
      {mutation.error && "fieldErrors" in (mutation.error as object) ? (
        <p role="alert" className="border-t border-hairline p-4 text-xs text-warning-soft-foreground">
          {(mutation.error as { fieldErrors?: Record<string, string> }).fieldErrors?.status}
        </p>
      ) : null}

      <CatalogueItemDialog
        groupId={group.id}
        groupName={group.name}
        item={itemDialog?.item}
        open={itemDialog !== null}
        onOpenChange={(open) => setItemDialog(open ? itemDialog : null)}
      />
    </Section>
  );
}
