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
