"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  getLocalFiles,
  saveLocalFiles,
  createNewFile,
  canCreateFile,
  calculatePageCount,
  syncFiles,
  getSessionHistory,
  type WritingFile,
  type SessionRecord,
} from "@/lib/storage";
import { FREE_MAX_FILES, FREE_MAX_PAGES } from "@/lib/constants";

function downloadFile(file: WritingFile) {
  const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${file.title.replace(/[^a-zA-Z0-9\s-_]/g, "").trim() || "untitled"}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const { user, plan, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [files, setFiles] = useState<WritingFile[]>([]);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const loadFiles = useCallback(async () => {
    const local = getLocalFiles();
    if (user) {
      const synced = await syncFiles(user.id, local);
      setFiles(synced);
    } else {
      setFiles(local);
    }
  }, [user]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  function handleCreateFile() {
    if (!newTitle.trim()) return;
    if (!canCreateFile(files.length, plan)) return;

    const file = createNewFile(newTitle.trim());
    const updated = [file, ...files];
    setFiles(updated);
    saveLocalFiles(updated);
    setShowNewFile(false);
    setNewTitle("");
  }

  function handleDeleteFile(id: string) {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    saveLocalFiles(updated);
    setDeleteConfirm(null);
  }

  const maxFiles = plan === "free" ? FREE_MAX_FILES : Infinity;
  const canCreate = files.length < maxFiles;

  // Filter files by search query
  const filteredFiles = searchQuery.trim()
    ? files.filter((f) => {
        const q = searchQuery.toLowerCase();
        return f.title.toLowerCase().includes(q) || f.content.toLowerCase().includes(q);
      })
    : files;

  return (
    <div className="min-h-screen bg-bg paper-texture">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-5 sm:py-7 max-w-4xl mx-auto">
        <Link href="/" className="font-mono text-xl sm:text-2xl tracking-tight">
          <span className="text-accent">Just</span>Write
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <span className="text-text-muted text-sm font-mono hidden sm:inline">
                {user.email}
              </span>
              <span className="text-xs font-mono px-2 py-1 rounded bg-bg-card border border-border text-accent uppercase">
                {plan}
              </span>
              <button
                onClick={signOut}
                className="text-text-dim hover:text-text text-sm font-mono transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="text-text-muted hover:text-text text-sm font-mono transition-colors"
            >
              Sign In to Save to Cloud
            </Link>
          )}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Toggle theme"
          >
            {theme === "light" ? "\u263E" : "\u2600"}
          </button>
        </div>
      </nav>

      {/* Content — centered, narrow, breathable */}
      <div className="px-4 sm:px-8 py-10 sm:py-16 max-w-3xl mx-auto">
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="font-mono text-2xl sm:text-4xl mb-3">Your Writing</h1>
          <p className="text-text-muted text-sm sm:text-base">
            {files.length}
            {plan === "free" ? ` / ${FREE_MAX_FILES}` : ""} file
            {files.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* New file button + search */}
        <div className="flex items-center justify-center gap-3 mb-10 sm:mb-16">
          {canCreate ? (
            <button
              onClick={() => setShowNewFile(true)}
              className="bg-accent text-white px-8 py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors"
            >
              + New File
            </button>
          ) : (
            <Link
              href="/#pricing"
              className="inline-block border border-accent text-accent px-8 py-3 rounded font-mono text-sm hover:bg-accent hover:text-white transition-colors"
            >
              Upgrade for More Files
            </Link>
          )}
          {files.length > 0 && (
            plan !== "free" ? (
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`border px-4 py-3 rounded font-mono text-sm transition-colors ${
                  showSearch ? "border-accent text-accent" : "border-border text-text-dim hover:border-accent hover:text-accent"
                }`}
                title="Search files"
              >
                &#128269;
              </button>
            ) : (
              <button
                className="border border-border px-4 py-3 rounded font-mono text-sm text-text-dim opacity-40 cursor-not-allowed"
                title="Upgrade for file search"
                disabled
              >
                &#128269;
              </button>
            )
          )}
        </div>

        {/* Search bar */}
        {showSearch && plan !== "free" && (
          <div className="mb-8 fade-in">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles and content..."
              className="w-full bg-bg-input border border-border rounded-lg px-5 py-3.5 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
              autoFocus
            />
            {searchQuery && (
              <p className="text-text-dim text-xs font-mono mt-2 text-center">
                {filteredFiles.length} result{filteredFiles.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* New file modal */}
        {showNewFile && (
          <div className="mb-10 sm:mb-16 border border-border rounded-lg p-5 sm:p-8 bg-bg-card card-elevated fade-in text-center">
            <h2 className="font-mono text-lg mb-6">New Writing File</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFile()}
              placeholder="My Novel, Daily Journal, Short Stories..."
              className="w-full bg-bg-input border border-border rounded px-4 py-3 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors mb-6 text-center"
              autoFocus
            />
            <div className="flex justify-center gap-4">
              <button
                onClick={handleCreateFile}
                disabled={!newTitle.trim()}
                className="bg-accent text-white px-8 py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewFile(false);
                  setNewTitle("");
                }}
                className="border border-border px-6 py-3 rounded font-mono text-sm hover:border-text-dim transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Files list */}
        {files.length === 0 ? (
          <div className="text-center py-16 sm:py-24">
            <div className="text-text-dim text-5xl sm:text-6xl mb-6 sm:mb-8 font-serif">&ldquo;&rdquo;</div>
            <h2 className="font-mono text-lg sm:text-xl mb-4">No files yet</h2>
            <p className="text-text-muted mb-8 leading-relaxed">
              Create your first writing file and start<br />
              putting words on the page.
            </p>
            <button
              onClick={() => setShowNewFile(true)}
              className="bg-accent text-white px-8 py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors"
            >
              Create Your First File
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFiles.map((file) => {
              const pageCount = calculatePageCount(file.content);
              const maxPages = plan === "free" ? FREE_MAX_PAGES : Infinity;
              const updated = new Date(file.updatedAt);
              const timeAgo = getTimeAgo(updated);

              return (
                <Link
                  key={file.id}
                  href={`/write/${file.id}`}
                  className="block border border-border rounded-xl p-6 sm:p-10 bg-bg-card card-elevated hover:bg-bg-card-hover hover:border-accent/40 transition-colors group text-center cursor-pointer"
                >
                  <h3 className="font-mono text-xl sm:text-2xl mb-2 sm:mb-3">{file.title}</h3>
                  <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-text-muted mb-3 sm:mb-4 flex-wrap">
                    <span>
                      {pageCount}{plan === "free" ? ` / ${maxPages}` : ""} page{pageCount !== 1 ? "s" : ""}
                    </span>
                    <span>&middot;</span>
                    <span>{file.content.split(/\s+/).filter(Boolean).length} words</span>
                    <span>&middot;</span>
                    <span>{timeAgo}</span>
                  </div>
                  {file.content && (
                    <p className="text-text-dim text-sm mb-6 line-clamp-2 max-w-lg mx-auto leading-relaxed">
                      {file.content.substring(0, 200)}
                      {file.content.length > 200 ? "..." : ""}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap" onClick={(e) => e.preventDefault()}>
                    <Link
                      href={`/write/${file.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-accent text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded font-mono text-xs sm:text-sm hover:bg-accent-hover transition-colors"
                    >
                      Open
                    </Link>
                    {plan !== "free" ? (
                      <button
                        onClick={(e) => { e.preventDefault(); downloadFile(file); }}
                        className="border border-border px-4 py-2.5 rounded font-mono text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
                        title="Download file"
                      >
                        Download
                      </button>
                    ) : (
                      <button
                        className="border border-border px-4 py-2.5 rounded font-mono text-xs text-text-dim cursor-not-allowed opacity-50"
                        title="Upgrade to download files"
                        disabled
                        onClick={(e) => e.preventDefault()}
                      >
                        Download
                      </button>
                    )}
                    {deleteConfirm === file.id ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => { e.preventDefault(); handleDeleteFile(file.id); }}
                          className="text-danger text-sm font-mono hover:underline"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); setDeleteConfirm(null); }}
                          className="text-text-dim text-sm font-mono hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.preventDefault(); setDeleteConfirm(file.id); }}
                        className="text-text-dim hover:text-danger text-xs sm:text-sm font-mono transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Monthly Progress */}
        {files.length > 0 && (
          <div className="mt-10 sm:mt-16">
            <MonthlyProgressSection isPaid={plan !== "free"} />
          </div>
        )}

        {/* Plan info */}
        {plan === "free" && files.length > 0 && (
          <div className="mt-10 text-center">
            <div className="border-t border-border/50 mb-10" />
            <p className="text-text-muted text-sm mb-4">
              Free plan: {FREE_MAX_FILES} files, {FREE_MAX_PAGES} pages each.
            </p>
            <Link
              href="/#pricing"
              className="text-accent hover:underline text-sm font-mono"
            >
              Upgrade for unlimited files &amp; pages &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function getMonthlyStats(sessions: SessionRecord[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Get previous month
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const thisMonthSessions = sessions.filter((s) => {
    const d = new Date(s.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const lastMonthSessions = sessions.filter((s) => {
    const d = new Date(s.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const thisMonthWords = thisMonthSessions.reduce((sum, s) => sum + s.wordsAdded, 0);
  const lastMonthWords = lastMonthSessions.reduce((sum, s) => sum + s.wordsAdded, 0);

  const thisMonthMinutes = thisMonthSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const lastMonthMinutes = lastMonthSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const thisMonthWPM = thisMonthMinutes > 0 ? Math.round(thisMonthWords / thisMonthMinutes) : 0;
  const lastMonthWPM = lastMonthMinutes > 0 ? Math.round(lastMonthWords / lastMonthMinutes) : 0;

  const wordChange = lastMonthWords > 0
    ? Math.round(((thisMonthWords - lastMonthWords) / lastMonthWords) * 100)
    : thisMonthWords > 0 ? 100 : 0;

  const wpmChange = lastMonthWPM > 0
    ? Math.round(((thisMonthWPM - lastMonthWPM) / lastMonthWPM) * 100)
    : thisMonthWPM > 0 ? 100 : 0;

  return {
    thisMonthWords,
    lastMonthWords,
    thisMonthWPM,
    lastMonthWPM,
    thisMonthSessions: thisMonthSessions.length,
    lastMonthSessions: lastMonthSessions.length,
    wordChange,
    wpmChange,
  };
}

function MonthlyProgressSection({ isPaid }: { isPaid: boolean }) {
  const sessions = getSessionHistory();
  const stats = getMonthlyStats(sessions);
  const monthName = new Date().toLocaleString("default", { month: "long" });

  const content = (
    <div className="border border-border rounded-lg p-5 sm:p-8 bg-bg-card card-elevated">
      <h2 className="font-mono text-sm text-text-muted mb-6 uppercase tracking-wider text-center">
        Your Progress This Month
      </h2>

      <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6">
        <div className="text-center">
          <div className="font-mono text-2xl sm:text-3xl text-accent">
            {stats.thisMonthWords.toLocaleString()}
          </div>
          <div className="text-text-dim text-xs mt-1">words written</div>
          {stats.wordChange !== 0 && (
            <div className={`text-xs font-mono mt-1 ${stats.wordChange > 0 ? "text-success" : "text-danger"}`}>
              {stats.wordChange > 0 ? "+" : ""}{stats.wordChange}% vs last month
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="font-mono text-2xl sm:text-3xl text-accent">
            {stats.thisMonthWPM}
          </div>
          <div className="text-text-dim text-xs mt-1">avg words/min</div>
          {stats.wpmChange !== 0 && (
            <div className={`text-xs font-mono mt-1 ${stats.wpmChange > 0 ? "text-success" : "text-danger"}`}>
              {stats.wpmChange > 0 ? "+" : ""}{stats.wpmChange}% vs last month
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="font-mono text-2xl sm:text-3xl text-accent">
            {stats.thisMonthSessions}
          </div>
          <div className="text-text-dim text-xs mt-1">sessions in {monthName}</div>
        </div>
      </div>

      {/* Mini bar chart showing this month vs last month */}
      <div className="border-t border-border pt-5">
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
          <div>
            <div className="text-text-dim text-xs font-mono mb-2">Word output</div>
            <div className="flex items-end gap-2 h-12">
              <div className="flex-1 flex flex-col justify-end">
                <div
                  className="bg-border rounded-t"
                  style={{ height: `${stats.lastMonthWords > 0 ? Math.max(8, (stats.lastMonthWords / Math.max(stats.thisMonthWords, stats.lastMonthWords, 1)) * 48) : 8}px` }}
                />
                <div className="text-text-dim-extra text-[10px] font-mono mt-1 text-center">Last</div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <div
                  className="bg-accent rounded-t"
                  style={{ height: `${stats.thisMonthWords > 0 ? Math.max(8, (stats.thisMonthWords / Math.max(stats.thisMonthWords, stats.lastMonthWords, 1)) * 48) : 8}px` }}
                />
                <div className="text-text-dim-extra text-[10px] font-mono mt-1 text-center">Now</div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-text-dim text-xs font-mono mb-2">Typing speed</div>
            <div className="flex items-end gap-2 h-12">
              <div className="flex-1 flex flex-col justify-end">
                <div
                  className="bg-border rounded-t"
                  style={{ height: `${stats.lastMonthWPM > 0 ? Math.max(8, (stats.lastMonthWPM / Math.max(stats.thisMonthWPM, stats.lastMonthWPM, 1)) * 48) : 8}px` }}
                />
                <div className="text-text-dim-extra text-[10px] font-mono mt-1 text-center">Last</div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <div
                  className="bg-accent rounded-t"
                  style={{ height: `${stats.thisMonthWPM > 0 ? Math.max(8, (stats.thisMonthWPM / Math.max(stats.thisMonthWPM, stats.lastMonthWPM, 1)) * 48) : 8}px` }}
                />
                <div className="text-text-dim-extra text-[10px] font-mono mt-1 text-center">Now</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isPaid) {
    return content;
  }

  // Free users: greyed out with upgrade overlay
  return (
    <div className="relative">
      <div className="opacity-30 blur-[2px] pointer-events-none select-none">
        {content}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-center px-6">
          <p className="font-mono text-sm mb-2">Track your writing evolution</p>
          <p className="text-text-muted text-xs mb-5 max-w-xs leading-relaxed">
            See how your word count and typing speed improve month over month.
          </p>
          <Link
            href="/#pricing"
            className="inline-block bg-accent text-white px-6 py-2.5 rounded font-mono text-sm hover:bg-accent-hover transition-colors"
          >
            Unlock Progress Insights
          </Link>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
