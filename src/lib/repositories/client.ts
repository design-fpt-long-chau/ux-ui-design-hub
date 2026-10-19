"use client";
import { useSyncExternalStore } from "react";
import { repositories } from "@/lib/repositories/provider";
export type { ScreenDraft, RepresentationDraft } from "@/lib/repositories/drafts";
export function useScreenInventory() { return useSyncExternalStore(repositories.screens.subscribe, repositories.screens.getSnapshot, repositories.screens.getServerSnapshot); }
export function useFlowInventory() { return useSyncExternalStore(repositories.flows.subscribe, repositories.flows.getSnapshot, repositories.flows.getServerSnapshot); }
export function useScreenGroupInventory() { return useSyncExternalStore(repositories.groups.subscribe, repositories.groups.getSnapshot, repositories.groups.getServerSnapshot); }
export function useCustomNoteTypes() { return useSyncExternalStore(repositories.noteTypes.subscribe, repositories.noteTypes.getSnapshot, repositories.noteTypes.getServerSnapshot); }
export function useBusinessUnitInventory() { return useSyncExternalStore(repositories.products.subscribe, repositories.products.getSnapshot, repositories.products.getServerSnapshot); }
export const publishLocalScreen = repositories.screens.publish;
export const deleteLocalScreen = repositories.screens.delete;
export const updateExistingScreenPreview = repositories.screens.updatePreview;
export const recordFigmaCheck = repositories.screens.recordFigmaCheck;
export const createVersionFromFigma = repositories.screens.createVersionFromFigma;
export const saveScreenDraft = repositories.screens.saveDraft;
export const loadScreenDraft = repositories.screens.loadDraft;
export const clearScreenDraft = repositories.screens.discardDraft;
export const createLocalFlow = repositories.flows.create;
export const createLocalFlowInGroup = repositories.flows.createInGroup;
export const updateLocalFlow = repositories.flows.update;
export const deleteLocalFlow = repositories.flows.delete;
export const reorderLocalFlowScreens = repositories.flows.reorder;
export const reorderLocalFlows = repositories.flows.reorderSiblings;
export const createLocalScreenGroup = repositories.groups.create;
export const renameLocalScreenGroup = repositories.groups.rename;
export const moveLocalScreenGroup = repositories.groups.move;
export const groupDeletionBlocker = repositories.groups.deletionBlocker;
export const permanentGroupDeletionBlocker = repositories.groups.permanentDeletionBlocker;
export const deleteEmptyLocalScreenGroup = repositories.groups.deleteEmpty;
export const deleteLocalScreenGroup = repositories.groups.delete;
export const permanentlyDeleteLocalScreenGroup = repositories.groups.deletePermanently;
export const createLocalBusinessUnit = repositories.products.create;
export const renameLocalBusinessUnit = repositories.products.rename;
export const deleteLocalBusinessUnit = repositories.products.delete;
export const businessUnitContents = repositories.products.contents;
export const createCustomNoteType = repositories.noteTypes.create;
export const localInventoryNotice = repositories.persistenceNotice;
