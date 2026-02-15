"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getLocalFiles,
  saveLocalFiles,
  createNewFile,
  canCreateFile,
  calculatePageCount,
  syncFiles,
  type WritingFile,
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
  const [files, setFiles] = useState<WritingFile[]>([]);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    const local = getLocalFiles();
    if (user && (plan === "cloud" || plan === "desktop")) {
      const synced = await syncFiles(user.id, local);
      setFiles(synced);
    } else {
      setFiles(local);
    }
  }, [user, plan]);

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

  return (
    <div className="min-h-screen bg-bg paper-texture">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-6 max-w-5xl mx-auto">
        <Link href="/" className="font-mono text-xl tracking-tight">
          <span className="text-accent">Just</span>Write
        </Link>
        <div className="flex items-center gap-4">
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
              Sign In for Cloud Sync
            </Link>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="px-6 md:px-12 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-mono text-2xl mb-1">Your Writing</h1>
            <p className="text-text-muted text-sm">
              {files.length}
              {plan === "free" ? ` / ${FREE_MAX_FILES}` : ""} file
              {files.length !== 1 ? "s" : ""}
            </p>
          </div>
          {canCreate ? (
            <button
              onClick={() => setShowNewFile(true)}
              className="bg-accent text-bg px-5 py-2.5 rounded font-mono text-sm hover:bg-accent-hover transition-colors"
            >
              + New File
            </button>
          ) : (
            <Link
              href="/#pricing"
              className="border border-accent text-accent px-5 py-2.5 rounded font-mono text-sm hover:bg-accent hover:text-bg transition-colors"
            >
              Upgrade for More Files
            </Link>
          )}
        </div>

        {/* New file modal */}
        {showNewFile && (
          <div className="mb-8 border border-border rounded-lg p-6 bg-bg-card fade-in">
            <h2 className="font-mono text-lg mb-4">New Writing File</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFile()}
                placeholder="My Novel, Daily Journal, Short Stories..."
                className="flex-1 bg-bg-input border border-border rounded px-4 py-3 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                autoFocus
              />
              <button
                onClick={handleCreateFile}
                disabled={!newTitle.trim()}
                className="bg-accent text-bg px-6 py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewFile(false);
                  setNewTitle("");
                }}
                className="border border-border px-4 py-3 rounded font-mono text-sm hover:border-text-dim transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Files grid */}
        {files.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-text-dim text-6xl mb-6 font-serif">&ldquo;&rdquo;</div>
            <h2 className="font-mono text-xl mb-3">No files yet</h2>
            <p className="text-text-muted mb-6">
              Create your first writing file and start putting words on the page.
            </p>
            <button
              onClick={() => setShowNewFile(true)}
              className="bg-accent text-bg px-6 py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors"
            >
              Create Your First File
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {files.map((file) => {
              const pages = calculatePageCount(file.content);
              const maxPages = plan === "free" ? FREE_MAX_PAGES : Infinity;
              const updated = new Date(file.updatedAt);
              const timeAgo = getTimeAgo(updated);

              return (
                <div
                  key={file.id}
                  className="border border-border rounded-lg p-6 bg-bg-card hover:bg-bg-card-hover transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-mono text-lg mb-1">{file.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-text-muted">
                        <span>
                          {pages}{plan === "free" ? ` / ${maxPages}` : ""} page{pages !== 1 ? "s" : ""}
                        </span>
                        <span>&middot;</span>
                        <span>{file.content.split(/\s+/).filter(Boolean).length} words</span>
                        <span>&middot;</span>
                        <span>Edited {timeAgo}</span>
                      </div>
                      {file.content && (
                        <p className="text-text-dim text-sm mt-3 line-clamp-2 max-w-2xl">
                          {file.content.substring(0, 200)}
                          {file.content.length > 200 ? "..." : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link
                        href={`/write/${file.id}`}
                        className="bg-accent text-bg px-4 py-2 rounded font-mono text-sm hover:bg-accent-hover transition-colors"
                      >
                        Write
                      </Link>
                      {plan !== "free" ? (
                        <button
                          onClick={() => downloadFile(file)}
                          className="border border-border px-3 py-2 rounded font-mono text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
                          title="Download as .txt"
                        >
                          .txt
                        </button>
                      ) : (
                        <button
                          onClick={() => {}}
                          className="border border-border px-3 py-2 rounded font-mono text-xs text-text-dim cursor-not-allowed opacity-50"
                          title="Upgrade to download files"
                          disabled
                        >
                          .txt
                        </button>
                      )}
                      {deleteConfirm === file.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-danger text-sm font-mono hover:underline"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-text-dim text-sm font-mono hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(file.id)}
                          className="text-text-dim hover:text-danger text-sm font-mono transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Plan info */}
        {plan === "free" && files.length > 0 && (
          <div className="mt-12 text-center border-t border-border pt-8">
            <p className="text-text-muted text-sm mb-3">
              Free plan: {FREE_MAX_FILES} files, {FREE_MAX_PAGES} pages each.
            </p>
            <Link
              href="/#pricing"
              className="text-accent hover:underline text-sm font-mono"
            >
              Upgrade for unlimited files &amp; cloud sync &rarr;
            </Link>
          </div>
        )}
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
