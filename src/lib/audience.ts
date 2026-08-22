import type { BroadcastAudience, Contact } from "./types";

/** Returns contacts matching broadcast audience filters. */
export function filterAudience(
  contacts: Contact[],
  audience: BroadcastAudience,
): Contact[] {
  return contacts.filter((c) => {
    const { includeTagIds, excludeTagIds, tagMode, fieldId, fieldValue } =
      audience;

    if (includeTagIds.length > 0) {
      if (tagMode === "all") {
        if (!includeTagIds.every((id) => c.tagIds.includes(id))) return false;
      } else {
        if (!includeTagIds.some((id) => c.tagIds.includes(id))) return false;
      }
    }

    if (excludeTagIds.length > 0) {
      if (excludeTagIds.some((id) => c.tagIds.includes(id))) return false;
    }

    if (fieldId && fieldValue?.trim()) {
      const v = (c.customFields[fieldId] ?? "").toLowerCase().trim();
      if (v !== fieldValue.toLowerCase().trim()) return false;
    }

    if (audience.stageId) {
      // stage filter applied by caller with deals; keep contact if no extra ctx
    }

    return true;
  });
}

export function countAudience(
  contacts: Contact[],
  audience: BroadcastAudience,
): number {
  return filterAudience(contacts, audience).length;
}
