"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  getLocalFiles,
  saveLocalFiles,
  getLocalSettings,
  saveLocalSettings,
  calculatePageCount,
  canAddPages,
  saveCloudFile,
  type WritingFile,
  type AppSettings,
} from "@/lib/storage";
import {
  DEFAULT_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  MAX_SESSION_MINUTES,
  FREE_MAX_PAGES,
  TEXT_SIZES,
  PLANS,
  type TextSize,
} from "@/lib/constants";

type EditorState = "setup" | "writing" | "done";

export default function WritePage() {
  const params = useParams();
  const router = useRouter();
  const { user, plan } = useAuth();
  const fileId = params.id as string;

  const [file, setFile] = useState<WritingFile | null>(null);
  const [editorState, setEditorState] = useState<EditorState>("setup");
  const [settings, setSettings] = useState<AppSettings>(getLocalSettings());
  const [timeLeft, setTimeLeft] = useState(settings.sessionMinutes * 60);
  const [sessionMinutes, setSessionMinutes] = useState(settings.sessionMinutes);
  const [wordCount, setWordCount] = useState(0);
  const [sessionWordCount, setSessionWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startWordCountRef = useRef(0);
  const contentRef = useRef("");

  // Load the file
  useEffect(() => {
    const files = getLocalFiles();
    const found = files.find((f) => f.id === fileId);
    if (found) {
      setFile(found);
      contentRef.current = found.content;
      const wc = found.content.split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
      startWordCountRef.current = wc;
    }
  }, [fileId]);

  // Auto-save every 10 seconds during writing
  const saveFile = useCallback(
    async (content: string) => {
      if (!file) return;
      setIsSaving(true);

      const files = getLocalFiles();
      const idx = files.findIndex((f) => f.id === file.id);
      if (idx !== -1) {
        files[idx] = {
          ...files[idx],
          content,
          updatedAt: new Date().toISOString(),
          pageCount: calculatePageCount(content),
        };
        saveLocalFiles(files);
        setFile(files[idx]);

        // Cloud sync if user is signed in with cloud plan
        if (user && (plan === "cloud" || plan === "desktop")) {
          await saveCloudFile(user.id, files[idx]);
        }
      }

      setLastSaved(new Date());
      setIsSaving(false);
    },
    [file, user, plan]
  );

  // Auto-save interval
  useEffect(() => {
    if (editorState !== "writing") return;

    const interval = setInterval(() => {
      saveFile(contentRef.current);
    }, 10000);

    return () => clearInterval(interval);
  }, [editorState, saveFile]);

  // Timer
  useEffect(() => {
    if (editorState !== "writing") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up
          clearInterval(timerRef.current!);
          saveFile(contentRef.current);
          setEditorState("done");
          exitFullscreen();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [editorState, saveFile]);

  // Prevent leaving during session
  useEffect(() => {
    if (editorState !== "writing") return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue =
        "Your writing session is still active. Are you sure you want to leave?";
      return e.returnValue;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Block Escape during session
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
      // Block Ctrl/Cmd+W (close tab)
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
      }
      // Block Ctrl/Cmd+T (new tab)
      if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editorState]);

  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }

  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function startSession() {
    // Save settings
    const newSettings = { ...settings, sessionMinutes };
    setSettings(newSettings);
    saveLocalSettings(newSettings);

    setTimeLeft(sessionMinutes * 60);
    startWordCountRef.current = wordCount;
    setSessionWordCount(0);
    setEditorState("writing");
    enterFullscreen();

    // Focus textarea after transition
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const content = e.target.value;

    // Check page limit for free users
    if (plan === "free") {
      const pages = calculatePageCount(content);
      if (!canAddPages(pages, plan)) {
        return; // Don't allow more content
      }
    }

    contentRef.current = content;
    const wc = content.split(/\s+/).filter(Boolean).length;
    setWordCount(wc);
    setSessionWordCount(wc - startWordCountRef.current);
  }

  function handleTextSizeChange(size: TextSize) {
    const newSettings = { ...settings, textSize: size };
    setSettings(newSettings);
    saveLocalSettings(newSettings);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted mb-4">File not found</p>
          <Link
            href="/dashboard"
            className="text-accent hover:underline font-mono text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ---- SETUP SCREEN ----
  if (editorState === "setup") {
    const canCustomize = PLANS[plan].customTimer;

    return (
      <div className="min-h-screen bg-bg paper-texture flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center fade-in">
          <Link href="/dashboard" className="text-text-dim hover:text-text-muted text-sm font-mono transition-colors">
            &larr; Back
          </Link>

          <h1 className="font-mono text-2xl mt-8 mb-2">{file.title}</h1>
          <p className="text-text-muted text-sm mb-10">
            {wordCount} words &middot; {calculatePageCount(file.content)} pages
          </p>

          {/* Timer setting */}
          <div className="border border-border rounded-lg p-6 bg-bg-card mb-6">
            <label className="block text-sm font-mono text-text-muted mb-3">
              Session Length
            </label>
            {canCustomize ? (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() =>
                    setSessionMinutes((m) => Math.max(MIN_SESSION_MINUTES, m - 5))
                  }
                  className="w-10 h-10 rounded border border-border hover:border-accent text-text-muted hover:text-accent transition-colors font-mono"
                >
                  -
                </button>
                <span className="font-mono text-4xl text-accent w-24">
                  {sessionMinutes}
                </span>
                <button
                  onClick={() =>
                    setSessionMinutes((m) => Math.min(MAX_SESSION_MINUTES, m + 5))
                  }
                  className="w-10 h-10 rounded border border-border hover:border-accent text-text-muted hover:text-accent transition-colors font-mono"
                >
                  +
                </button>
              </div>
            ) : (
              <div className="font-mono text-4xl text-accent">
                {DEFAULT_SESSION_MINUTES}
              </div>
            )}
            <p className="text-text-dim text-xs mt-2 font-mono">
              {canCustomize ? "minutes" : "minutes (upgrade to customize)"}
            </p>
          </div>

          {/* Text size */}
          <div className="border border-border rounded-lg p-6 bg-bg-card mb-8">
            <label className="block text-sm font-mono text-text-muted mb-3">
              Text Size
            </label>
            <p className="text-text-dim text-xs mb-4">
              Focus on writing, not formatting. Pick a size that&apos;s comfortable.
            </p>
            <div className="flex items-center justify-center gap-3">
              {(Object.entries(TEXT_SIZES) as [TextSize, { label: string; class: string }][]).map(
                ([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleTextSizeChange(key)}
                    className={`w-12 h-12 rounded border font-mono transition-colors ${
                      settings.textSize === key
                        ? "border-accent bg-accent text-bg"
                        : "border-border hover:border-accent text-text-muted hover:text-accent"
                    }`}
                  >
                    {value.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={startSession}
            className="w-full bg-accent text-bg py-4 rounded font-mono text-lg hover:bg-accent-hover transition-colors pulse-glow"
          >
            Lock In &amp; Write
          </button>

          <p className="text-text-dim text-xs mt-4">
            Once you start, the app goes fullscreen.
            <br />
            No going back until the timer runs out.
          </p>

          {plan === "free" && (
            <p className="text-text-dim text-xs mt-4">
              Free plan: {FREE_MAX_PAGES} pages max per file.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ---- WRITING SCREEN (LOCKED IN) ----
  if (editorState === "writing") {
    const progress = 1 - timeLeft / (sessionMinutes * 60);
    const isLowTime = timeLeft <= 60;

    return (
      <div className="fixed inset-0 bg-bg-warm z-50 flex flex-col">
        {/* Top bar — minimal */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/50">
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm text-text-dim">{file.title}</span>
          </div>

          {/* Timer */}
          <div
            className={`font-mono text-lg ${
              isLowTime ? "text-danger" : "text-accent"
            }`}
          >
            {formatTime(timeLeft)}
          </div>

          <div className="flex items-center gap-4">
            {/* Save indicator */}
            <span className="text-xs font-mono text-text-dim">
              {isSaving
                ? "Saving..."
                : lastSaved
                ? `Saved ${lastSaved.toLocaleTimeString()}`
                : ""}
            </span>
            {/* Text size toggle */}
            <div className="flex items-center gap-1">
              {(Object.entries(TEXT_SIZES) as [TextSize, { label: string; class: string }][]).map(
                ([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleTextSizeChange(key)}
                    className={`w-7 h-7 rounded text-xs font-mono transition-colors ${
                      settings.textSize === key
                        ? "bg-accent/20 text-accent"
                        : "text-text-dim hover:text-text-muted"
                    }`}
                  >
                    {value.label}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-border/30">
          <div
            className="h-full bg-accent transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Writing area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 md:px-12 py-8 h-full">
            <textarea
              ref={textareaRef}
              defaultValue={file.content}
              onChange={handleContentChange}
              placeholder="Start writing..."
              className={`writing-area w-full h-full bg-transparent text-text resize-none font-serif ${TEXT_SIZES[settings.textSize].class}`}
              spellCheck
              autoFocus
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-6 py-2 border-t border-border/50 text-xs font-mono text-text-dim">
          <span>{wordCount} words total</span>
          <span>+{sessionWordCount} this session</span>
          <span>
            {calculatePageCount(contentRef.current)}
            {plan === "free" ? ` / ${FREE_MAX_PAGES}` : ""} pages
          </span>
        </div>
      </div>
    );
  }

  // ---- SESSION DONE SCREEN ----
  return (
    <div className="min-h-screen bg-bg paper-texture flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center fade-in">
        <div className="text-accent text-6xl mb-6">&#10003;</div>
        <h1 className="font-mono text-2xl mb-2">Session Complete</h1>
        <p className="text-text-muted mb-8">
          You stayed locked in and wrote. That&apos;s what matters.
        </p>

        <div className="border border-border rounded-lg p-6 bg-bg-card mb-8">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="font-mono text-2xl text-accent">
                {sessionMinutes}
              </div>
              <div className="text-text-dim text-xs">minutes</div>
            </div>
            <div>
              <div className="font-mono text-2xl text-accent">
                +{sessionWordCount}
              </div>
              <div className="text-text-dim text-xs">words written</div>
            </div>
            <div>
              <div className="font-mono text-2xl text-accent">
                {calculatePageCount(contentRef.current)}
              </div>
              <div className="text-text-dim text-xs">total pages</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setEditorState("setup");
            }}
            className="w-full bg-accent text-bg py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors"
          >
            Write Again
          </button>
          {plan !== "free" ? (
            <button
              onClick={() => {
                const blob = new Blob([contentRef.current], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${file.title.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "untitled"}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="w-full border border-accent text-accent py-3 rounded font-mono text-sm hover:bg-accent hover:text-bg transition-colors"
            >
              Download as .txt
            </button>
          ) : (
            <Link
              href="/#pricing"
              className="w-full border border-border py-3 rounded font-mono text-sm text-text-dim hover:border-accent hover:text-accent transition-colors block text-center"
            >
              Upgrade to Download Files
            </Link>
          )}
          <Link
            href="/dashboard"
            className="w-full border border-border py-3 rounded font-mono text-sm hover:border-accent hover:text-accent transition-colors block"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="text-text-dim text-xs mt-8">
          &ldquo;A professional writer is an amateur who didn&apos;t quit.&rdquo;
        </p>
      </div>
    </div>
  );
}
