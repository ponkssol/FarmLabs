/** Parse `Project.detailImages` from DB: JSON string array, up to 3 URLs. */
export function parseDetailImagesJson(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .filter((x): x is string => typeof x === "string" && x.length > 0)
      .slice(0, 3);
  }
  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x): x is string => typeof x === "string" && x.length > 0)
        .slice(0, 3);
    } catch {
      return [];
    }
  }
  return [];
}
