import { flowOwnerGroupId, resolveFlowId, currentAuthGroupId, legacyAuthGroupId } from "@/lib/flow-context";
import type { Flow, ScreenGroup } from "@/types/design-library";
import type { ScreenDraft } from "@/lib/repositories/client";

export interface AddScreenContext {
  businessUnitId?: string;
  screenGroupId?: string;
  flowId?: string;
}

function groupBusinessUnitId(group: ScreenGroup) {
  return group.businessUnitId ?? group.id.split(".")[0];
}

export function addScreenHref(context: { businessUnitId: string; screenGroupId: string; flowId?: string }) {
  const params = new URLSearchParams(context);
  return `/manage/screens/new?${params.toString()}`;
}

export function applyAddScreenContext(draft: ScreenDraft, context: AddScreenContext, groups: ScreenGroup[], flows: Flow[] = []): ScreenDraft {
  if (draft.screenGroupId === legacyAuthGroupId) {
    const flow = draft.flowId ? flows.find(item => item.id === resolveFlowId(draft.flowId!, flows)) : undefined;
    if (!flow) throw new Error("Auth mapping required for the saved Add Screen draft. Choose its intended group before continuing; saved data is unchanged.");
    draft = { ...draft, screenGroupId: flowOwnerGroupId(flow) };
  }
  if (!context.businessUnitId) return draft;
  if (!context.screenGroupId) return { ...draft, businessUnitId: context.businessUnitId, screenGroupId: "" };

  const group = groups.find((item) => item.id === currentAuthGroupId(context.screenGroupId!));
  if (!group || groupBusinessUnitId(group) !== context.businessUnitId) return draft;

  const flow = context.flowId ? flows.find((item) => item.id === resolveFlowId(context.flowId!, flows) && item.businessUnitId === context.businessUnitId && flowOwnerGroupId(item) === group.id) : undefined;
  return {
    ...draft,
    businessUnitId: context.businessUnitId,
    screenGroupId: group.id,
    ...(flow ? { flowMode: "existing" as const, flowId: flow.id, insertAfterScreenId: flow.screenIds.at(-1) ?? null } : {}),
    currentStep: "information",
  };
}

export function screenNameFromFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.(png|jpe?g|webp)$/i, "");
  const cleaned = withoutExtension
    .replace(/^\s*\d+[\s._-]*/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.charAt(0).toLocaleUpperCase() + cleaned.slice(1) : "";
}
