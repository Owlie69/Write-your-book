import { supabase, isSupabaseConfigured } from "./supabase";
import { CHARS_PER_PAGE, FREE_MAX_FILES, FREE_MAX_PAGES } from "./constants";
import type { PlanType } from "./constants";

export interface WritingFile {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
}

// ---- Local Storage ----

const LOCAL_STORAGE_KEY = "justwrite_files";
const LOCAL_SETTINGS_KEY = "justwrite_settings";

export interface AppSettings {
  textSize: "small" | "medium" | "large";
  sessionMinutes: number;
}

export function getLocalFiles(): WritingFile[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalFiles(files: WritingFile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(files));
}

export function getLocalSettings(): AppSettings {
  if (typeof window === "undefined")
    return { textSize: "medium", sessionMinutes: 20 };
  try {
    const data = localStorage.getItem(LOCAL_SETTINGS_KEY);
    return data
      ? JSON.parse(data)
      : { textSize: "medium", sessionMinutes: 20 };
  } catch {
    return { textSize: "medium", sessionMinutes: 20 };
  }
}

export function saveLocalSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function calculatePageCount(content: string): number {
  if (!content) return 0;
  return Math.max(1, Math.ceil(content.length / CHARS_PER_PAGE));
}

export function createNewFile(title: string): WritingFile {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title,
    content: "",
    createdAt: now,
    updatedAt: now,
    pageCount: 0,
  };
}

export function canCreateFile(
  currentFileCount: number,
  plan: PlanType
): boolean {
  if (plan !== "free") return true;
  return currentFileCount < FREE_MAX_FILES;
}

export function canAddPages(currentPageCount: number, plan: PlanType): boolean {
  if (plan !== "free") return true;
  return currentPageCount < FREE_MAX_PAGES;
}

// ---- Writing Habit & Session History ----

export interface WritingHabit {
  days: boolean[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  time: string;
  enabled: boolean;
}

export interface SessionRecord {
  date: string; // "2026-02-17"
  fileId: string;
  fileTitle: string;
  durationMinutes: number;
  wordsAdded: number;
}

const HABIT_KEY = "justwrite_habit";
const SESSIONS_KEY = "justwrite_sessions";

const DEFAULT_HABIT: WritingHabit = {
  days: [false, false, false, false, false, false, false],
  time: "09:00",
  enabled: false,
};

export function getWritingHabit(): WritingHabit {
  if (typeof window === "undefined") return DEFAULT_HABIT;
  try {
    const data = localStorage.getItem(HABIT_KEY);
    return data ? JSON.parse(data) : DEFAULT_HABIT;
  } catch {
    return DEFAULT_HABIT;
  }
}

export function saveWritingHabit(habit: WritingHabit): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HABIT_KEY, JSON.stringify(habit));
}

export function getSessionHistory(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addSessionRecord(record: SessionRecord): void {
  if (typeof window === "undefined") return;
  const history = getSessionHistory();
  history.push(record);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(history));
}

export function calculateStreak(sessions: SessionRecord[]): { current: number; longest: number } {
  if (sessions.length === 0) return { current: 0, longest: 0 };

  const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let current = 0;
  let checkDate = dates[0] === today ? today : dates[0] === yesterday ? yesterday : "";

  if (checkDate) {
    for (const date of dates) {
      if (date === checkDate) {
        current++;
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = prev.toISOString().split("T")[0];
      } else if (date < checkDate) {
        break;
      }
    }
  }

  let longest = 0;
  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    const d1 = new Date(dates[i]);
    const d2 = new Date(dates[i - 1]);
    const diff = (d2.getTime() - d1.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak);

  return { current, longest };
}

// ---- Cloud Storage (Supabase) ----

export async function getCloudFiles(userId: string): Promise<WritingFile[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching cloud files:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pageCount: calculatePageCount(row.content),
  }));
}

export async function saveCloudFile(
  userId: string,
  file: WritingFile
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("files").upsert({
    id: file.id,
    user_id: userId,
    title: file.title,
    content: file.content,
    created_at: file.createdAt,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error saving cloud file:", error);
  }
}

export async function deleteCloudFile(
  userId: string,
  fileId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting cloud file:", error);
  }
}

// ---- Sync Logic ----

export async function syncFiles(
  userId: string,
  localFiles: WritingFile[]
): Promise<WritingFile[]> {
  if (!isSupabaseConfigured()) return localFiles;

  const cloudFiles = await getCloudFiles(userId);
  const merged = new Map<string, WritingFile>();

  // Add cloud files
  for (const file of cloudFiles) {
    merged.set(file.id, file);
  }

  // Merge local files (local wins if newer)
  for (const file of localFiles) {
    const existing = merged.get(file.id);
    if (!existing || new Date(file.updatedAt) > new Date(existing.updatedAt)) {
      merged.set(file.id, file);
      await saveCloudFile(userId, file);
    }
  }

  const result = Array.from(merged.values());
  saveLocalFiles(result);
  return result;
}
