"use client";

import { ChevronRight, Columns3, Copy, Eye, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Everything that renders in a portal above the page.
 *
 * These are the only surfaces allowed a shadow. On a paper ground, elevation
 * has to mean "this genuinely floats" or it just reads as a smudge.
 */
export function OverlaysSection() {
  const [columns, setColumns] = useState({ group: true, score: true, status: false });
  const [scope, setScope] = useState("group");

  return (
    <div className="flex flex-col" style={{ gap: "var(--section-gap)" }}>
      <Section id="dialog"
        title="Dialog"
        description="A focused task or a confirmation. ConfirmDialog under Patterns wraps this for destructive actions; use the raw primitive for anything else."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Edit evaluation group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">Rename evaluation group</DialogTitle>
                <DialogDescription className="text-sm">
                  Group names are shown to students on their individual report.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-1.5">
                <Label htmlFor="ds-group-name" className="text-sm">
                  Group name
                </Label>
                <Input
                  id="ds-group-name"
                  defaultValue="Group A"
                  style={{ height: "var(--field-h)" }}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button size="sm" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button size="sm" onClick={() => toast.success("Group renamed")}>
                    Save
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Section>

      <Section id="sheet"
        title="Sheet"
        description="A side panel for a longer flow that should not lose the page behind it. The mobile navigation drawer is the shell's use of this."
      >
        <div className="flex flex-wrap items-center gap-2">
          {(["right", "left"] as const).map((side) => (
            <Sheet key={side}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="capitalize">
                  Open {side}
                </Button>
              </SheetTrigger>
              <SheetContent side={side} className="w-[22rem]">
                <SheetHeader>
                  <SheetTitle className="text-base">Add student</SheetTitle>
                  <SheetDescription className="text-sm">
                    Existing profile, previous course, or a new student.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 text-sm text-muted-foreground">
                  The enrollment module will own this flow (direction.md §7).
                </div>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button size="sm" variant="outline">
                      Close
                    </Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ))}
        </div>
      </Section>

      <Section id="popover"
        title="Popover"
        description="A small amount of interactive content anchored to its trigger. If it needs a title, a footer and a decision, use a dialog instead."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                Score breakdown
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <PopoverHeader>
                <PopoverTitle className="text-sm">Final score 91.55</PopoverTitle>
                <PopoverDescription className="text-xs">
                  Weighted across four evaluator roles.
                </PopoverDescription>
              </PopoverHeader>
              <div className="mt-2 flex flex-col gap-1 text-xs">
                {[
                  ["Peer", "88 × 30%", "26.40"],
                  ["Inspector", "92 × 20%", "18.40"],
                  ["Teacher", "95 × 35%", "33.25"],
                  ["TA", "90 × 15%", "13.50"],
                ].map(([role, math, value]) => (
                  <div key={role} className="flex items-center justify-between gap-3">
                    <span>{role}</span>
                    <span className="text-muted-foreground" data-numeric>
                      {math}
                    </span>
                    <span className="w-12 text-right font-medium" data-numeric>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </Section>

      <Section id="dropdown-menu"
        title="Dropdown menu"
        description="Row actions, column visibility and scope switching. The row-action wrapper under Patterns adds the separator rule for destructive entries."
      >
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              <DropdownMenuLabel className="text-xs">Student 001</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2">
                  <Eye className="size-3.5 text-muted-foreground" aria-hidden />
                  View
                  <DropdownMenuShortcut>⏎</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Pencil className="size-3.5 text-muted-foreground" aria-hidden />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Copy className="size-3.5 text-muted-foreground" aria-hidden />
                    Move to group
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Group A</DropdownMenuItem>
                    <DropdownMenuItem>Group B</DropdownMenuItem>
                    <DropdownMenuItem>Group C</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" className="gap-2">
                <Trash2 className="size-3.5" aria-hidden />
                Drop student
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Columns3 className="size-3.5" aria-hidden />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-40">
              <DropdownMenuLabel className="text-xs">Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(
                [
                  ["group", "Group"],
                  ["score", "Final score"],
                  ["status", "Status"],
                ] as const
              ).map(([key, label]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={columns[key]}
                  onCheckedChange={(checked) =>
                    setColumns((prev) => ({ ...prev, [key]: checked === true }))
                  }
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                Ranking scope
                <ChevronRight className="size-3.5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              <DropdownMenuLabel className="text-xs">
                Ranking must state its scope
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={scope} onValueChange={setScope}>
                <DropdownMenuRadioItem value="group">Evaluation group</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="course">
                  Course and semester
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Section>

      <Section id="tooltip"
        title="Tooltip"
        description="Supplementary detail only, never the sole carrier of information: it is unreachable on touch and invisible to a print-out."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline">
                Coverage 80%
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="text-xs">TA evaluation has not been submitted</span>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Copy student ID">
                <Copy className="size-3.5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="text-xs">Copy student ID</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </Section>

      <Section id="toast"
        title="Toast"
        description="Transient confirmation of something the user just did. Anything needing a decision belongs in a dialog, and anything persistent belongs in an Alert. The Toaster itself is mounted once in AppProviders, so any module can call toast() without rendering a host."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => toast("Draft saved")}>
            Neutral
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success("Evaluation submitted")}
          >
            Success
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.warning("Two roles have not submitted")}
          >
            Warning
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.error("The cost sheet could not be saved")}
          >
            Error
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast("Student dropped", {
                description: "Student 001 — ST-2026-001, Group A",
                action: { label: "Undo", onClick: () => toast.success("Restored") },
              })
            }
          >
            With action
          </Button>
        </div>
      </Section>
    </div>
  );
}
