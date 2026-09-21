"use client";

import { CalendarIcon, Download, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Section } from "@/components/shared";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RatingScale } from "@/features/evaluation/components/rating-scale";
import { RATING_LABEL, RATING_VALUES } from "@/features/evaluation/constants";
import { formatCurrency, initials } from "@/lib/utils";
import type { RatingValue } from "@/types";
import { Demo } from "../_components/demo";
import { FormDemo } from "./form-demo";

/**
 * Every primitive in components/ui that renders inline. Overlays live in the
 * Overlays tab, and the application-level patterns built on these live in
 * Patterns.
 */
export function PrimitivesSection() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 5, 1));

  return (
    <div className="flex flex-col" style={{ gap: "var(--section-gap)" }}>
      <Section id="buttons"
        title="Buttons"
        description="Sakura pink is the action color: a primary button is pink, and red is reserved for destroying something. One primary per screen; everything else is outline, secondary or ghost."
      >
        <div className="flex flex-col gap-4">
          <Demo
            title="Variants"
            note="Destructive is solid for a confirmation, and destructive-soft for an inline row action where a solid red button would shout."
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="secondary">
                Secondary
              </Button>
              <Button size="sm" variant="outline">
                Outline
              </Button>
              <Button size="sm" variant="ghost">
                Ghost
              </Button>
              <Button size="sm" variant="link">
                Link
              </Button>
              <Button size="sm" variant="destructive">
                Drop student
              </Button>
              <Button size="sm" variant="destructive-soft">
                Remove
              </Button>
            </div>
          </Demo>

          <Demo title="Sizes" note="Default is 32px, matching --control-h.">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="xs">Extra small</Button>
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Add">
                <Plus />
              </Button>
              <Button size="icon-sm" variant="outline" aria-label="Export">
                <Download />
              </Button>
              <Button size="icon-xs" variant="ghost" aria-label="Delete">
                <Trash2 />
              </Button>
            </div>
          </Demo>

          <Demo title="With icons and states">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" className="gap-1.5">
                <Plus className="size-3.5" aria-hidden />
                Add course
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Download className="size-3.5" aria-hidden />
                Export
              </Button>
              <Button size="sm" disabled>
                Disabled
              </Button>
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="form-controls"
        title="Form controls"
        description="All fields sit at --field-h. Labels are always present, because a placeholder is not a label. Invalid, read-only and disabled are in the States group, which owns every condition a control can be in — repeating one of them here is how two parts of a design system end up disagreeing."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Demo id="input" title="Input">
            <div className="grid gap-1.5">
              <Label htmlFor="ds-code" className="text-sm">
                Course code
              </Label>
              <Input
                id="ds-code"
                placeholder="IT101"
                style={{ height: "var(--field-h)" }}
              />
            </div>
          </Demo>

          <Demo id="select" title="Select">
            <div className="grid gap-1.5">
              <Label className="text-sm">Semester</Label>
              <Select defaultValue="202602">
                <SelectTrigger className="w-full" style={{ height: "var(--field-h)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="202601">202601 — First Semester 2026</SelectItem>
                  <SelectItem value="202602">202602 — Second Semester 2026</SelectItem>
                  <SelectItem value="202701">202701 — First Semester 2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Demo>

          <Demo id="textarea" title="Textarea">
            <div className="grid gap-1.5">
              <Label htmlFor="ds-comment" className="text-sm">
                Evaluator comment
              </Label>
              <Textarea id="ds-comment" rows={3} placeholder="Optional" />
            </div>
          </Demo>

          <Demo id="checkbox-switch" title="Checkbox and switch">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Checkbox id="ds-check" defaultChecked />
                <Label htmlFor="ds-check" className="text-sm">
                  Reuse existing student profile
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ds-check-2" />
                <Label htmlFor="ds-check-2" className="text-sm">
                  Send enrollment confirmation
                </Label>
              </div>
              <Separator className="my-1" />
              <div className="flex items-center gap-2">
                <Switch id="ds-switch" defaultChecked />
                <Label htmlFor="ds-switch" className="text-sm">
                  Apply markup to total cost
                </Label>
              </div>
            </div>
          </Demo>

          <Demo
            id="radio-group"
            title="Radio group"
            note="The 1-5 evaluation scale from direction.md §18, read from RATING_LABEL rather than retyped — this demo used to carry its own copy of the words and had capitalized two of them differently."
          >
            <RadioGroup defaultValue="4" className="flex flex-col gap-1.5">
              {RATING_VALUES.map((value) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={String(value)} id={`ds-rate-${value}`} />
                  <Label htmlFor={`ds-rate-${value}`} className="text-sm">
                    <span className="text-muted-foreground" data-numeric>
                      {value}
                    </span>
                    {"  "}
                    {RATING_LABEL[value]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </Demo>

          <Demo
            id="slider"
            title="Slider"
            note="For a value whose position in a range is the point. Named options belong in a radio group instead."
          >
            <SliderDemo />
          </Demo>
        </div>
      </Section>

      <FormDemo />

      <Section id="content"
        title="Content"
        description="Surfaces and inline markers. Card is the generic primitive; Section is the application panel built on the same idea and is documented under Patterns."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo id="card" title="Card" note="CardAction sits in the header rather than the footer, so a card whose only control is one button needs no footer at all.">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">IT101</CardTitle>
                <CardDescription className="text-xs">
                  Introduction to Information Technology
                </CardDescription>
                <CardAction>
                  <Button size="xs" variant="ghost">
                    Open
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Offered in 202601, 202602 and 202701.
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                3 credits
              </CardFooter>
            </Card>
          </Demo>

          <Demo id="badge" title="Badge" note="Generic label. For a lifecycle state use StatusBadge, under Patterns.">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </Demo>

          <Demo id="avatar" title="Avatar" note="Initials are the fallback; PRIME has no uploaded photos in the demo data.">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar>
                <AvatarFallback className="text-xs">
                  {initials("Student", "001")}
                </AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback className="text-xs">
                  {initials("Student", "002")}
                </AvatarFallback>
                <AvatarBadge className="bg-success" />
              </Avatar>
              <AvatarGroup>
                <Avatar>
                  <AvatarFallback className="text-xs">S1</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback className="text-xs">S2</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback className="text-xs">S3</AvatarFallback>
                </Avatar>
                <AvatarGroupCount>+5</AvatarGroupCount>
              </AvatarGroup>
            </div>
          </Demo>

          <Demo id="alert" title="Alert" note="Page or section level messages. A transient confirmation uses a toast instead.">
            <div className="flex flex-col gap-2">
              <Alert>
                <AlertTitle className="text-sm">Weighting is not final</AlertTitle>
                <AlertDescription className="text-xs">
                  Two evaluator roles have not submitted, so this score is provisional.
                </AlertDescription>
                <AlertAction>
                  <Button size="xs" variant="outline">
                    Review
                  </Button>
                </AlertAction>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle className="text-sm">Cost sheet is out of balance</AlertTitle>
                <AlertDescription className="text-xs">
                  Allocated shared cost exceeds 100% for two items.
                </AlertDescription>
              </Alert>
            </div>
          </Demo>

          <Demo id="separator" title="Separator">
            <div className="flex flex-col gap-2 text-sm">
              <span>Course</span>
              <Separator />
              <span>Semester</span>
              <div className="flex h-8 items-center gap-3">
                <span>Group A</span>
                <Separator orientation="vertical" />
                <span>Group B</span>
                <Separator orientation="vertical" />
                <span>Group C</span>
              </div>
            </div>
          </Demo>

          <Demo id="skeleton" title="Skeleton" note="The primitive. Shape-matched compositions are under Patterns.">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-40 rounded-sm" />
              <Skeleton className="h-3 w-24 rounded-sm" />
              <Skeleton className="rounded-sm" style={{ height: "var(--field-h)" }} />
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="table-primitive"
        title="Table primitive"
        description="The raw table elements. Application tables use DataTable, under Patterns, which adds sorting, pagination and the four data states."
        flush
        bodyClassName="p-3.5"
      >
        <div className="overflow-hidden rounded-md border border-hairline">
          <Table>
            <TableCaption className="text-xs">
              Cost items for IT101, semester 202602.
            </TableCaption>
            <TableHeader>
              <TableRow className="bg-surface-sunken hover:bg-surface-sunken">
                <TableHead className="text-xs uppercase">Item</TableHead>
                <TableHead className="text-xs uppercase">Kind</TableHead>
                <TableHead className="text-right text-xs uppercase">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["Instructor", "Direct", 48000],
                ["Teaching assistant", "Direct", 16000],
                ["Laboratory", "Shared", 22500],
              ].map(([name, kind, amount]) => (
                <TableRow key={name as string} className="hairline-b">
                  <TableCell className="text-sm">{name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{kind}</TableCell>
                  <TableCell className="text-right text-sm" data-numeric>
                    {formatCurrency(amount as number)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="text-sm font-medium">Total</TableCell>
                <TableCell />
                <TableCell className="text-right text-sm font-medium" data-numeric>
                  {formatCurrency(86500)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Section>

      <Section id="navigation" title="Navigation">
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo id="tabs" title="Tabs" note="In-page sections. Never for primary navigation, which is the sidebar.">
            <Tabs defaultValue="profile">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="pt-2 text-sm text-muted-foreground">
                Personal information and contact details.
              </TabsContent>
              <TabsContent value="academic" className="pt-2 text-sm text-muted-foreground">
                Program, major, year level, skills and certifications.
              </TabsContent>
              <TabsContent
                value="experience"
                className="pt-2 text-sm text-muted-foreground"
              >
                Projects, clubs, activities and achievements.
              </TabsContent>
            </Tabs>
          </Demo>

          <Demo id="breadcrumb"
            title="Breadcrumb"
            note="The shell derives this from the route. A page that knows the record name should render its own."
          >
            <Breadcrumb>
              <BreadcrumbList className="text-sm">
                <BreadcrumbItem>
                  <span className="text-muted-foreground">Academic</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/courses">Courses</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>IT101</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Demo>

          <Demo id="scroll-area"
            title="Scroll area"
            note="For a bounded region such as the sidebar or a long picker list."
          >
            <ScrollArea className="h-32 rounded-md border border-hairline bg-card">
              <div className="p-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="px-1.5 py-1 text-sm" data-numeric>
                    Student {String(i + 1).padStart(3, "0")}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Demo>

          <Demo id="calendar" title="Calendar" note="Semester start and end dates. Uses the compact control sizes.">
            <div className="flex flex-col gap-2">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border border-hairline bg-card"
              />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon className="size-3" aria-hidden />
                {date ? date.toDateString() : "No date selected"}
              </p>
            </div>
          </Demo>
        </div>
      </Section>
    </div>
  );
}

/**
 * The rating scale, as Your Evaluation renders it.
 *
 * This is the real `RatingScale` from `features/evaluation`, not a copy. It was
 * a 70-line replica here until 2026-09-20, on the reasoning that the design
 * system must not learn domain vocabulary - but that rule is about
 * `components/ui`, and `app/*` sits *above* `features/*` in the layer chain, so
 * importing it breaks nothing.
 *
 * The replica had already drifted in the way a replica does: it announced
 * `aria-valuetext` as "Very good" where the real component announces
 * "4, Very good" - the exact detail the real component's own docstring exists to
 * argue for. A design system demonstrating an accessibility decision incorrectly
 * is worse than one not demonstrating it.
 *
 * Two behaviors are worth playing with rather than reading about, which is why
 * this demo is interactive:
 *
 *   - **zero is "not rated"**, so the range runs 0-5 rather than 1-5. A slider
 *     always has a value, and starting at 1 would make an untouched criterion
 *     look answered;
 *   - **dragging back to zero clears it**, which the button row this replaced
 *     could not do at all.
 *
 * The two instances take different criteria because `RatingScale` derives its
 * control id from the criterion, and the same one twice would be a duplicate id.
 */
function SliderDemo() {
  const [value, setValue] = useState<RatingValue | undefined>(undefined);

  return (
    <div className="grid max-w-sm gap-4">
      <RatingScale
        criterion="participation"
        value={value}
        scaleMax={5}
        disabled={false}
        onChange={setValue}
      />

      <div className="flex items-center gap-2">
        <Button size="xs" variant="outline" onClick={() => setValue(undefined)}>
          Clear
        </Button>
        <span className="text-xs text-muted-foreground">
          Drag to zero, or clear, to unset it
        </span>
      </div>

      {/* Disabled is the state a closed evaluation window renders in, so it is
          worth seeing beside the live one rather than only in the matrix. */}
      <div className="border-t border-hairline pt-3">
        <RatingScale
          criterion="teamwork"
          value={4}
          scaleMax={5}
          disabled
          onChange={() => {}}
        />
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Disabled — a closed window is read-only
        </p>
      </div>
    </div>
  );
}
