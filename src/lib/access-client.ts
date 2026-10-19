"use client";
import { useSyncExternalStore } from "react";
import { createAccessController } from "@/lib/access";
import { repositories } from "@/lib/repositories/provider";
export const accessController = createAccessController(repositories.identity);
export function useAccess() {
  return useSyncExternalStore(accessController.subscribe, accessController.getSnapshot, accessController.getServerSnapshot);
}
export const logoutIdentity = () => accessController.logout();
