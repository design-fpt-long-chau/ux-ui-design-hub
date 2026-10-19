export function storageErrorMessage(cause: unknown) {
  const name = cause && typeof cause === "object" && "name" in cause ? cause.name : "";
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return "Browser storage is full. Your changes are not fully saved. Keep this form open and try a smaller image.";
  }
  return cause instanceof Error ? cause.message : "Changes could not be saved. Keep this form open and try again.";
}
