import type { Screen, ScreenGroup } from "@/types/design-library";
import { groupPath } from "@/lib/screen-groups";

export function flowSections(screens: Screen[], groups: ScreenGroup[]) {
  const sections: { context: ScreenGroup[]; steps: { screen: Screen; index: number }[] }[] = [];
  screens.forEach((screen, index) => {
    const group = groups.find((item) => item.id === screen.screenGroupId);
    const context = group ? (groupPath(group, groups) ?? []).slice(1) : [];
    const previous = sections.at(-1);
    // Only consecutive runs share a section. Never reorder the stored journey.
    if (previous && previous.context.at(-1)?.id === context.at(-1)?.id) {
      previous.steps.push({ screen, index });
    } else sections.push({ context, steps: [{ screen, index }] });
  });
  return sections;
}
