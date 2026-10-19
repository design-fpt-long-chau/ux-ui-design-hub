import type { BusinessUnit, ScreenGroup, Flow, Screen, NoteTypeDefinition } from "@/types/design-library";
export interface LibraryData {
  products: BusinessUnit[]; groups: ScreenGroup[]; flows: Flow[]; screens: Screen[];
  noteTypes: NoteTypeDefinition[]; componentTags: string[];
  // Recovery-only appendix; never automatically applied by an import.
  localRecovery?: Record<string, unknown>;
}
export type ImportStrategy = "keep-existing" | "use-incoming" | "restore-clean";
export interface ImportSummary {
  added: number; identical: number; conflicts: { entity: string; id: string; name: string }[];
  counts: Record<string, number>; warnings: string[];
}
export interface ImportPlan { token: string; summary: ImportSummary; }
export interface PortabilityRepository {
  exportLibrary(kind: "export" | "backup"): Promise<{ filename: string; bytes: Uint8Array; counts: Record<string, number>; warnings: string[] }>;
  previewImport(bytes: Uint8Array, strategy: ImportStrategy): Promise<ImportPlan>;
  applyImport(token: string): Promise<void>;
}
