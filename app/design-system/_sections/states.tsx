import type { ReactNode } from "react";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Demo } from "../_components/demo";
import { PendingButtonDemo } from "../_components/state-lab";

/**
 * One labelled cell in a state matrix.
 *
 * `replica` is the honest part. Hover and press cannot be shown in a static
 * cell, so those cells hand-apply the same classes the real variant applies
 * and are marked as reproductions rather than passed off as the live thing.
 */
function State({
  label,
  replica = false,
  hint,
  children,
}: {
  label: string;
  replica?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {label}
        </span>
        {replica ? (
          <span className="text-[10px] text-muted-foreground/70">replica</span>
        ) : null}
      </div>
      <div className="flex min-h-9 items-center">{children}</div>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Matrix({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid gap-x-5 gap-y-4",
        cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

export function StatesSection() {
  return (
    <div className="flex flex-col" style={{ gap: "var(--section-gap)" }}>
      <Section
        id="state-principles"
        title="How a state is expressed"
        description="Every interactive control in PRIME answers the same four questions, and answers them the same way."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              q: "Can I interact with it?",
              a: "Opacity and cursor. Disabled drops to 50% and takes pointer-events-none, so a disabled control cannot be hovered into looking live.",
            },
            {
              q: "Where am I?",
              a: "One focus treatment for the whole application: a 2px ring in --ring at 2px offset, defined once in globals.css under :focus-visible. Never removed, never restyled per component.",
            },
            {
              q: "Is something wrong?",
              a: "aria-invalid drives the treatment. The red border is a consequence of the attribute rather than a class someone remembered to add, so the error is always announced as well as shown.",
            },
            {
              q: "Is something happening?",
              a: "A spinner plus aria-busy, and the control stops accepting input. Never a state that only looks busy.",
            },
          ].map((item) => (
            <div
              key={item.q}
              className="rounded-md border border-hairline bg-surface-sunken p-3"
            >
              <p className="text-xs font-medium text-foreground">{item.q}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="state-button"
        title="Button"
        description="Eight states. Tab through the row to see the real focus ring rather than a picture of one."
      >
        <div className="flex flex-col gap-5">
          <Matrix>
            <State label="Default">
              <Button>Save changes</Button>
            </State>
            <State label="Hover" replica hint="bg-primary/80">
              <Button className="bg-primary/80">Save changes</Button>
            </State>
            <State label="Focus" hint="Tab to it. The ring is real.">
              <Button>Save changes</Button>
            </State>
            <State label="Active" replica hint="translate-y-px">
              <Button className="translate-y-px bg-primary/80">Save changes</Button>
            </State>
            <State label="Disabled">
              <Button disabled>Save changes</Button>
            </State>
            <State label="Loading">
              <Button loading>Saving…</Button>
            </State>
            <State label="Invalid" hint="aria-invalid on a submit that failed">
              <Button aria-invalid>Save changes</Button>
            </State>
            <State label="Destructive">
              <Button variant="destructive">Delete course</Button>
            </State>
          </Matrix>

          <Demo
            title="Pending, on a real click"
            note="The only state that needs to be demonstrated rather than shown, because the point of it is what it prevents."
          >
            <PendingButtonDemo />
          </Demo>
        </div>
      </Section>

      <Section
        id="state-field"
        title="Text fields"
        description="Input, Textarea and Select share one set of states, so a form never mixes two visual languages for the same condition."
      >
        <div className="flex flex-col gap-5">
          <Matrix>
            <State label="Default">
              <Input defaultValue="IT101" style={{ height: "var(--field-h)" }} />
            </State>
            <State label="Placeholder">
              <Input placeholder="Course code" style={{ height: "var(--field-h)" }} />
            </State>
            <State label="Focus" hint="Click into it.">
              <Input defaultValue="IT101" style={{ height: "var(--field-h)" }} />
            </State>
            <State label="Invalid" hint="aria-invalid, plus a message below">
              <Input
                defaultValue="IT-1"
                aria-invalid
                aria-describedby="ds-state-error"
                style={{ height: "var(--field-h)" }}
              />
            </State>
            <State label="Read-only" hint="Shows a value that is not editable here">
              <Input
                defaultValue="202602"
                readOnly
                style={{ height: "var(--field-h)" }}
              />
            </State>
            <State label="Disabled" hint="Not applicable at all right now">
              <Input
                defaultValue="202602"
                disabled
                style={{ height: "var(--field-h)" }}
              />
            </State>
            <State label="Select">
              <Select defaultValue="202602">
                <SelectTrigger className="w-full" style={{ height: "var(--field-h)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="202601">202601</SelectItem>
                  <SelectItem value="202602">202602</SelectItem>
                </SelectContent>
              </Select>
            </State>
            <State label="Select, invalid">
              <Select defaultValue="202602">
                <SelectTrigger
                  aria-invalid
                  className="w-full"
                  style={{ height: "var(--field-h)" }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="202601">202601</SelectItem>
                  <SelectItem value="202602">202602</SelectItem>
                </SelectContent>
              </Select>
            </State>
          </Matrix>

          <p id="ds-state-error" className="max-w-prose text-xs text-error">
            Read-only and disabled are not interchangeable. Read-only says
            &ldquo;this value is real but is not edited here&rdquo; and stays in the tab
            order and in the submitted payload; disabled says &ldquo;this does not
            apply&rdquo; and leaves both. Choosing disabled for a value the reader still
            needs is the more common mistake.
          </p>

          <Demo
            title="Textarea"
            note="Same four states, one control. Growing is left to the browser."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Textarea placeholder="Course description" rows={3} />
              <Textarea
                defaultValue="Too short"
                aria-invalid
                rows={3}
              />
            </div>
          </Demo>
        </div>
      </Section>

      <Section
        id="state-choice"
        title="Choice controls"
        description="Checkbox, switch and radio. A switch takes effect immediately; a checkbox waits for a submit. Using a switch inside a form that has a Save button is the mistake this section exists to prevent."
      >
        <Matrix cols={3}>
          <State label="Checkbox">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox id="ds-st-c1" />
                <Label htmlFor="ds-st-c1">Unchecked</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ds-st-c2" defaultChecked />
                <Label htmlFor="ds-st-c2">Checked</Label>
              </div>
            </div>
          </State>
          <State label="Checkbox, unavailable">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox id="ds-st-c3" disabled />
                <Label htmlFor="ds-st-c3">Disabled</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ds-st-c4" defaultChecked disabled />
                <Label htmlFor="ds-st-c4">Disabled, checked</Label>
              </div>
            </div>
          </State>
          <State label="Checkbox, invalid" hint="A required consent left unticked">
            <div className="flex items-center gap-2">
              <Checkbox id="ds-st-c5" aria-invalid />
              <Label htmlFor="ds-st-c5">Required</Label>
            </div>
          </State>
          <State label="Switch">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Switch id="ds-st-s1" />
                <Label htmlFor="ds-st-s1">Off</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ds-st-s2" defaultChecked />
                <Label htmlFor="ds-st-s2">On</Label>
              </div>
            </div>
          </State>
          <State label="Switch, unavailable">
            <div className="flex items-center gap-2">
              <Switch id="ds-st-s3" disabled defaultChecked />
              <Label htmlFor="ds-st-s3">Disabled</Label>
            </div>
          </State>
          <State label="Radio group" hint="One choice from a small, visible set">
            <RadioGroup defaultValue="peer" className="gap-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="peer" id="ds-st-r1" />
                <Label htmlFor="ds-st-r1">Peer</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="inspector" id="ds-st-r2" />
                <Label htmlFor="ds-st-r2">Inspector</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ta" id="ds-st-r3" disabled />
                <Label htmlFor="ds-st-r3">TA (disabled)</Label>
              </div>
            </RadioGroup>
          </State>
        </Matrix>
      </Section>

      <Section
        id="state-row"
        title="Table rows"
        description="A row has three states worth distinguishing, and one of them is easy to get wrong: hover means pointable, selected means chosen, and they must not look the same."
        flush
      >
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Student 001</TableCell>
                <TableCell>Group A</TableCell>
                <TableCell>
                  <StatusBadge tone="success" label="Enrolled" />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  Default — hover it
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/50">
                <TableCell>Student 002</TableCell>
                <TableCell>Group A</TableCell>
                <TableCell>
                  <StatusBadge tone="warning" label="Pending" />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  Hover (replica)
                </TableCell>
              </TableRow>
              <TableRow data-state="selected">
                <TableCell>Student 003</TableCell>
                <TableCell>Group B</TableCell>
                <TableCell>
                  <StatusBadge tone="success" label="Enrolled" />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  Selected
                </TableCell>
              </TableRow>
              <TableRow className="opacity-50">
                <TableCell>Student 004</TableCell>
                <TableCell>Group B</TableCell>
                <TableCell>
                  <StatusBadge tone="error" label="Dropped" />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  Inactive record
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section
        id="state-screen"
        title="Screen states"
        description="Loading, empty and error belong to the screen rather than to a control, and they already have components. This section is only about the controls."
      >
        <p className="max-w-prose text-xs text-muted-foreground">
          Every data-driven screen in PRIME implements all four of loading, success,
          empty and error — no blank screens. Those are
          <code className="mx-1">LoadingState</code>,
          <code className="mx-1">EmptyState</code> and
          <code className="mx-1">ErrorState</code>, wired together by
          <code className="mx-1">QueryBoundary</code>, and they are documented under
          <a
            className="mx-1 text-primary underline-offset-4 hover:underline"
            href="#data-states"
          >
            Patterns → Data states
          </a>
          rather than repeated here.
        </p>
      </Section>
    </div>
  );
}
