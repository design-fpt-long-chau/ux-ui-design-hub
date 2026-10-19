"use client";
import { useSyncExternalStore } from "react";
import { useScreenInventory } from "@/lib/repositories/client";
import { repositories } from "@/lib/repositories/provider";
import { componentNames } from "@/lib/metadata-values";
export const registerComponentTag = repositories.componentTags.register;
export function useComponentTags() {
  const screens = useScreenInventory();
  const custom = useSyncExternalStore(repositories.componentTags.subscribe, repositories.componentTags.getSnapshot, repositories.componentTags.getServerSnapshot);
  const used = screens.flatMap(screen => [
    ...componentNames(screen.components),
    ...Object.values(screen.versionHistory ?? {}).flat().flatMap(version => componentNames(version.components)),
    ...Object.values(screen.representations ?? {}).flatMap(rep => rep ? [...componentNames(rep.components), ...(rep.versionHistory ?? []).flatMap(version => componentNames(version.components))] : []),
  ]);
  return componentNames([...used, ...custom]).sort((a, b) => a.localeCompare(b));
}
