"use client";
import { useSyncExternalStore } from "react";
import { repositories } from "@/lib/repositories/provider";
const subscribe = (listener: () => void) => repositories.identity.subscribe?.(listener) ?? (() => {});
const snapshot = () => repositories.identity.current();
const serverSnapshot = () => repositories.identity.getServerSnapshot?.() ?? repositories.identity.current();
export function useIdentity() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
