/** Shared error slot keeps the control separate from its label and feedback. */
export function FieldError({ children, id }: { children?: string; id?: string }) {
  return <p id={id} role={children ? "alert" : undefined} aria-hidden={!children || undefined} className="form-error">{children || "\u00a0"}</p>;
}
