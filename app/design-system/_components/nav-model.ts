/**
 * The table of contents for the design system page.
 *
 * Every `id` here must exist as an anchor on a `Section` or `Demo` in
 * `app/design-system/_sections/`. The page renders one group per entry and the
 * nav links into it, so adding a component means adding it in both places and
 * nowhere else.
 */
export interface NavItem {
  id: string;
  label: string;
}

export interface NavGroup {
  id: string;
  label: string;
  /** What the group is for, shown once above its sections. */
  blurb: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "group-foundations",
    label: "Foundations",
    blurb:
      "The token layer everything else is measured against. Change a value here and every component below follows.",
    items: [
      { id: "palette", label: "Palette" },
      { id: "semantic-tokens", label: "Semantic tokens" },
      { id: "status-tokens", label: "Status tokens" },
      { id: "type-scale", label: "Type scale" },
      { id: "density", label: "Density" },
      { id: "radius", label: "Radius" },
      { id: "elevation", label: "Elevation" },
      { id: "structure", label: "Structure" },
      { id: "card-tones", label: "Card tones" },
      { id: "decoration", label: "Decoration" },
    ],
  },
  {
    id: "group-primitives",
    label: "Primitives",
    blurb:
      "components/ui — generic, no domain vocabulary. Everything that renders inline.",
    items: [
      { id: "buttons", label: "Button" },
      { id: "input", label: "Input" },
      { id: "select", label: "Select" },
      { id: "textarea", label: "Textarea" },
      { id: "checkbox-switch", label: "Checkbox & switch" },
      { id: "radio-group", label: "Radio group" },
      { id: "form-bindings", label: "Form bindings" },
      { id: "card", label: "Card" },
      { id: "badge", label: "Badge" },
      { id: "avatar", label: "Avatar" },
      { id: "alert", label: "Alert" },
      { id: "separator", label: "Separator" },
      { id: "skeleton", label: "Skeleton" },
      { id: "table-primitive", label: "Table" },
      { id: "tabs", label: "Tabs" },
      { id: "breadcrumb", label: "Breadcrumb" },
      { id: "scroll-area", label: "Scroll area" },
      { id: "calendar", label: "Calendar" },
    ],
  },
  {
    id: "group-overlays",
    label: "Overlays",
    blurb:
      "components/ui that renders in a portal, plus toasts. These are the only surfaces allowed a shadow.",
    items: [
      { id: "dialog", label: "Dialog" },
      { id: "sheet", label: "Sheet" },
      { id: "popover", label: "Popover" },
      { id: "dropdown-menu", label: "Dropdown menu" },
      { id: "tooltip", label: "Tooltip" },
      { id: "toast", label: "Toast" },
    ],
  },
  {
    id: "group-patterns",
    label: "Patterns",
    blurb:
      "components/shared — application-level compositions. Reusable, still free of business rules.",
    items: [
      { id: "page-header", label: "Page header" },
      { id: "stat-cards", label: "Stat card" },
      { id: "status-badges", label: "Status badge" },
      { id: "filter-data-table", label: "Filter bar & data table" },
      { id: "detail-list", label: "Detail list" },
      { id: "data-states", label: "Data states" },
      { id: "query-boundary", label: "Query boundary" },
      { id: "pagination", label: "Pagination" },
      { id: "form-layout", label: "Form layout" },
      { id: "panel", label: "Panel" },
      { id: "scaffold-placeholder", label: "Scaffold placeholder" },
      { id: "confirmation", label: "Confirmation" },
    ],
  },
];

/** Every anchor on the page, in document order. */
export const NAV_ANCHOR_IDS: string[] = NAV_GROUPS.flatMap((group) => [
  group.id,
  ...group.items.map((item) => item.id),
]);
