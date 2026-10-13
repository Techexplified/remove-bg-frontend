import type { RecentBackgroundItem, GradientConfig } from "../types";

const STORAGE_KEY = "removebg_studio_recent_bg";
const MAX_RECENT_ITEMS = 5;

export function getRecentBackgrounds(): RecentBackgroundItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_ITEMS) : [];
  } catch {
    return [];
  }
}

export function saveRecentBackground(
  type: "color" | "gradient" | "image",
  value: string,
  gradient?: GradientConfig
): RecentBackgroundItem[] {
  const current = getRecentBackgrounds().filter(x => x.value.toLowerCase() !== value.toLowerCase());
  const updated: RecentBackgroundItem[] = [
    { id: `rec_${Date.now()}`, type, value, gradient, timestamp: Date.now() },
    ...current,
  ].slice(0, MAX_RECENT_ITEMS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}
