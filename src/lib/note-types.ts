import type { AnnotationType, NoteTypeDefinition } from "@/types/design-library";

const names: AnnotationType[] = ["Interaction", "Behavior", "Validation", "Component", "Content", "Navigation", "Accessibility"];

export const predefinedNoteTypes: NoteTypeDefinition[] = names.map((name) => ({
  id: `builtin.${name.toLocaleLowerCase()}`,
  name,
}));

export function validateNoteTypeName(value: string, types: NoteTypeDefinition[]) {
  const name = value.trim();
  if (!name) return "Type name is required.";
  if (name.length > 40) return "Type name must be 40 characters or fewer.";
  if (types.some((type) => type.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) return "This type already exists.";
  return undefined;
}

export function resolveNoteTypeId(name: string, typeId: string | undefined, types: NoteTypeDefinition[]) {
  return typeId ?? types.find((type) => type.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.id;
}
