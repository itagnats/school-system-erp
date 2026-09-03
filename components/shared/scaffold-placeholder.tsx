import { Construction } from "lucide-react";
import { EmptyState } from "@/components/feedback";
import { Section } from "./section";

/**
 * TEMPORARY. Marks a route that exists so navigation and the shell can be
 * verified, but whose module has not been built yet (scaffold.md §9, §31).
 *
 * Delete this component once the last module lands. Each usage is removed by
 * the feature that replaces it, so a remaining import is a to-do list.
 */
export function ScaffoldPlaceholder({
  module,
  summary,
  spec,
}: {
  /** The feature that will own this route, e.g. "Enrollment". */
  module: string;
  /** One line on what the finished screen does. */
  summary: string;
  /** Where the requirement is written down, e.g. "direction.md §6-8". */
  spec: string;
}) {
  return (
    <Section>
      <EmptyState
        icon={Construction}
        title={`${module} is not built yet`}
        description={`${summary} Specified in ${spec}.`}
      />
    </Section>
  );
}
