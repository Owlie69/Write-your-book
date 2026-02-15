"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
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

interface SessionStats {
  wordsAdded: number;
  wordsErased: number;
  netWords: number;
  charsTyped: number;
  charsDeleted: number;
  peakWordCount: number;
  totalPages: number;
  durationMinutes: number;
  wordsPerMinute: number;
}

const DISSUASIVE_MESSAGES = [
  { title: "Wait — you were in the zone!", body: "Your best writing happens when you stay locked in. The timer is still running. Get back in there." },
  { title: "Don't break the flow.", body: "Every great writer pushes through the urge to stop. You've got words left in you. Keep going." },
  { title: "Your future self will thank you.", body: "Quitting now means starting over tomorrow with less momentum. Stay in the session." },
  { title: "The resistance is lying to you.", body: "That voice telling you to stop? It's the same one that's kept your book unfinished. Ignore it. Write." },
];

// 25 lines per A4 page
const LINES_PER_PAGE = 25;

function splitIntoPages(content: string): string[] {
  if (!content) return [""];
  const lines = content.split("\n");
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + LINES_PER_PAGE).join("\n"));
  }
  if (pages.length === 0) pages.push("");
  return pages;
}

function joinPages(pages: string[]): string {
  return pages.join("\n");
}

export default function WritePage() {
  const params = useParams();
  const router = useRouter();
  const { user, plan } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [showDissuasive, setShowDissuasive] = useState(false);
  const [dissuasiveMsg, setDissuasiveMsg] = useState(DISSUASIVE_MESSAGES[0]);

  // Pagination
  const [pages, setPages] = useState<string[]>([""]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageFlipAnim, setPageFlipAnim] = useState(false);

  // Next session scheduler
  const [nextSessionDate, setNextSessionDate] = useState("");
  const [nextSessionTime, setNextSessionTime] = useState("");
  const [reminderSent, setReminderSent] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startWordCountRef = useRef(0);
  const contentRef = useRef("");

  // Stats tracking refs
  const totalWordsAddedRef = useRef(0);
  const totalWordsErasedRef = useRef(0);
  const totalCharsTypedRef = useRef(0);
  const totalCharsDeletedRef = useRef(0);
  const peakWordCountRef = useRef(0);
  const prevContentLenRef = useRef(0);
  const prevWordCountRef = useRef(0);

  // Load the file
  useEffect(() => {
    const files = getLocalFiles();
    const found = files.find((f) => f.id === fileId);
    if (found) {
      setFile(found);
      contentRef.current = found.content;
      prevContentLenRef.current = found.content.length;
      const wc = found.content.split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
      startWordCountRef.current = wc;
      prevWordCountRef.current = wc;
      peakWordCountRef.current = wc;
      const initialPages = splitIntoPages(found.content);
      setPages(initialPages);
      setCurrentPageIndex(initialPages.length - 1);
    }
  }, [fileId]);

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

  const finishSession = useCallback(() => {
    saveFile(contentRef.current);
    const finalWc = contentRef.current.split(/\s+/).filter(Boolean).length;
    const netWords = finalWc - startWordCountRef.current;
    const actualMinutes = sessionMinutes - Math.floor(timeLeft / 60);
    const wpm = actualMinutes > 0 ? Math.round(Math.max(0, totalWordsAddedRef.current) / actualMinutes) : 0;

    setSessionStats({
      wordsAdded: totalWordsAddedRef.current,
      wordsErased: totalWordsErasedRef.current,
      netWords,
      charsTyped: totalCharsTypedRef.current,
      charsDeleted: totalCharsDeletedRef.current,
      peakWordCount: peakWordCountRef.current,
      totalPages: calculatePageCount(contentRef.current),
      durationMinutes: Math.max(1, actualMinutes),
      wordsPerMinute: wpm,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNextSessionDate(tomorrow.toISOString().split("T")[0]);
    setNextSessionTime("09:00");

    setEditorState("done");
    exitFullscreen();
  }, [saveFile, sessionMinutes, timeLeft]);

  // Timer
  useEffect(() => {
    if (editorState !== "writing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          finishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [editorState, finishSession]);

  // Detect fullscreen exit
  useEffect(() => {
    if (editorState !== "writing") return;
    function handleFullscreenChange() {
      if (!document.fullscreenElement && editorState === "writing") {
        const msg = DISSUASIVE_MESSAGES[Math.floor(Math.random() * DISSUASIVE_MESSAGES.length)];
        setDissuasiveMsg(msg);
        setShowDissuasive(true);
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [editorState]);

  // Prevent leaving
  useEffect(() => {
    if (editorState !== "writing") return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "Your writing session is still active. Are you sure you want to leave?";
      return e.returnValue;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "w") { e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "t") { e.preventDefault(); }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editorState]);

  // Keyboard arrow nav between pages
  useEffect(() => {
    if (editorState !== "writing") return;
    function handleKeyNav(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentPageIndex((i) => Math.max(0, i - 1));
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
      if (e.ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentPageIndex((i) => Math.min(pages.length - 1, i + 1));
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    }
    document.addEventListener("keydown", handleKeyNav);
    return () => document.removeEventListener("keydown", handleKeyNav);
  }, [editorState, pages.length]);

  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }

  function exitFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  function handleGoBackToWriting() {
    setShowDissuasive(false);
    enterFullscreen();
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function handleContinueWithoutFullscreen() {
    setShowDissuasive(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function startSession() {
    const newSettings = { ...settings, sessionMinutes };
    setSettings(newSettings);
    saveLocalSettings(newSettings);

    totalWordsAddedRef.current = 0;
    totalWordsErasedRef.current = 0;
    totalCharsTypedRef.current = 0;
    totalCharsDeletedRef.current = 0;
    prevContentLenRef.current = contentRef.current.length;
    const wc = contentRef.current.split(/\s+/).filter(Boolean).length;
    prevWordCountRef.current = wc;
    startWordCountRef.current = wc;
    peakWordCountRef.current = wc;

    setTimeLeft(sessionMinutes * 60);
    setSessionWordCount(0);
    setSessionStats(null);
    setReminderSent(false);
    setReminderError(null);
    setShowDissuasive(false);
    setEditorState("writing");
    enterFullscreen();

    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const pageContent = e.target.value;
    const lineCount = pageContent.split("\n").length;

    // Build full content
    const newPages = [...pages];
    newPages[currentPageIndex] = pageContent;

    // Auto-flip: if lines exceed LINES_PER_PAGE, push overflow to next page
    if (lineCount > LINES_PER_PAGE) {
      const lines = pageContent.split("\n");
      const keep = lines.slice(0, LINES_PER_PAGE).join("\n");
      const overflow = lines.slice(LINES_PER_PAGE).join("\n");

      newPages[currentPageIndex] = keep;
      const nextIdx = currentPageIndex + 1;
      if (nextIdx >= newPages.length) {
        newPages.push(overflow);
      } else {
        newPages[nextIdx] = overflow + (newPages[nextIdx] ? "\n" + newPages[nextIdx] : "");
      }

      const fullContent = joinPages(newPages);
      updateStats(fullContent);
      contentRef.current = fullContent;
      setPages([...newPages]);

      // Animate page flip
      setPageFlipAnim(true);
      setCurrentPageIndex(nextIdx);
      setTimeout(() => {
        setPageFlipAnim(false);
        textareaRef.current?.focus();
        if (textareaRef.current) {
          textareaRef.current.selectionStart = overflow.length;
          textareaRef.current.selectionEnd = overflow.length;
        }
      }, 400);
      return;
    }

    const fullContent = joinPages(newPages);

    if (plan === "free") {
      const pageCount = calculatePageCount(fullContent);
      if (!canAddPages(pageCount, plan)) return;
    }

    updateStats(fullContent);
    contentRef.current = fullContent;
    setPages(newPages);
  }

  function updateStats(fullContent: string) {
    const lenDiff = fullContent.length - prevContentLenRef.current;
    if (lenDiff > 0) totalCharsTypedRef.current += lenDiff;
    else if (lenDiff < 0) totalCharsDeletedRef.current += Math.abs(lenDiff);
    prevContentLenRef.current = fullContent.length;

    const wc = fullContent.split(/\s+/).filter(Boolean).length;
    const wcDiff = wc - prevWordCountRef.current;
    if (wcDiff > 0) totalWordsAddedRef.current += wcDiff;
    else if (wcDiff < 0) totalWordsErasedRef.current += Math.abs(wcDiff);
    prevWordCountRef.current = wc;

    if (wc > peakWordCountRef.current) peakWordCountRef.current = wc;

    setWordCount(wc);
    setSessionWordCount(wc - startWordCountRef.current);
  }

  function goToPage(idx: number) {
    if (idx < 0 || idx >= pages.length) return;
    setCurrentPageIndex(idx);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleTextSizeChange(size: TextSize) {
    const newSettings = { ...settings, textSize: size };
    setSettings(newSettings);
    saveLocalSettings(newSettings);
  }

  async function scheduleReminder() {
    if (!nextSessionDate || !nextSessionTime) return;
    if (!user?.email) {
      setReminderError("Sign in to receive email reminders");
      return;
    }
    setReminderSending(true);
    setReminderError(null);
    try {
      const res = await fetch("/api/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          userId: user.id,
          fileId: file?.id,
          fileTitle: file?.title,
          sessionDate: nextSessionDate,
          sessionTime: nextSessionTime,
        }),
      });
      if (res.ok) {
        setReminderSent(true);
      } else {
        const data = await res.json();
        setReminderError(data.error || "Failed to schedule reminder");
      }
    } catch {
      setReminderError("Failed to schedule reminder");
    } finally {
      setReminderSending(false);
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // ---- FILE NOT FOUND ----
  if (!file) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted mb-4">File not found</p>
          <Link href="/dashboard" className="text-accent hover:underline font-mono text-sm">
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
        <div className="w-full max-w-sm text-center fade-in">
          <div className="flex items-center justify-between mb-16">
            <Link href="/dashboard" className="text-text-dim hover:text-text-muted text-sm font-mono transition-colors">
              &larr; Back
            </Link>
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
              {theme === "light" ? "\u263E" : "\u2600"}
            </button>
          </div>

          <h1 className="font-mono text-2xl mb-3">{file.title}</h1>
          <p className="text-text-muted text-sm mb-16">
            {wordCount} words &middot; {calculatePageCount(file.content)} pages
          </p>

          {/* Timer setting */}
          <div className="border border-border rounded-lg p-8 bg-bg-card card-elevated mb-8">
            <label className="block text-sm font-mono text-text-muted mb-5">
              Session Length
            </label>
            {canCustomize ? (
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => setSessionMinutes((m) => Math.max(MIN_SESSION_MINUTES, m - 5))}
                  className="w-12 h-12 rounded border border-border hover:border-accent text-text-muted hover:text-accent transition-colors font-mono text-lg"
                >
                  -
                </button>
                <span className="font-mono text-5xl text-accent w-28">
                  {sessionMinutes}
                </span>
                <button
                  onClick={() => setSessionMinutes((m) => Math.min(MAX_SESSION_MINUTES, m + 5))}
                  className="w-12 h-12 rounded border border-border hover:border-accent text-text-muted hover:text-accent transition-colors font-mono text-lg"
                >
                  +
                </button>
              </div>
            ) : (
              <div className="font-mono text-5xl text-accent">
                {DEFAULT_SESSION_MINUTES}
              </div>
            )}
            <p className="text-text-dim text-xs mt-4 font-mono">
              {canCustomize ? "minutes" : "minutes (upgrade to customize)"}
            </p>
          </div>

          {/* Text size */}
          <div className="border border-border rounded-lg p-8 bg-bg-card card-elevated mb-12">
            <label className="block text-sm font-mono text-text-muted mb-3">
              Text Size
            </label>
            <p className="text-text-dim text-xs mb-6">
              Pick a size that&apos;s comfortable.
            </p>
            <div className="flex items-center justify-center gap-4">
              {(Object.entries(TEXT_SIZES) as [TextSize, { label: string; class: string }][]).map(
                ([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleTextSizeChange(key)}
                    className={`w-14 h-14 rounded border font-mono text-lg transition-colors ${
                      settings.textSize === key
                        ? "border-accent bg-accent text-white"
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
            className="w-full bg-accent text-white py-4 rounded font-mono text-lg hover:bg-accent-hover transition-colors pulse-glow"
          >
            Lock In &amp; Write
          </button>

          <p className="text-text-dim text-xs mt-6 leading-relaxed">
            Once you start, the app goes fullscreen.
            <br />
            No going back until the timer runs out.
          </p>

          {plan === "free" && (
            <p className="text-text-dim text-xs mt-6">
              Free plan: {FREE_MAX_PAGES} pages max per file.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ---- WRITING SCREEN — 25-line A4 pages, centered ----
  if (editorState === "writing") {
    const progress = 1 - timeLeft / (sessionMinutes * 60);
    const isLowTime = timeLeft <= 60;
    const totalPagesCount = pages.length;
    const hasPrev = currentPageIndex > 0;
    const hasNext = currentPageIndex < pages.length - 1;

    return (
      <div className="fixed inset-0 bg-bg-warm z-50 flex flex-col editor-page-container">
        {/* Dissuasive overlay */}
        {showDissuasive && (
          <div className="fixed inset-0 z-[100] dissuasive-overlay flex items-center justify-center px-6">
            <div className="w-full max-w-md text-center fade-in">
              <div className="text-accent text-5xl mb-8">&#9888;</div>
              <h2 className="font-mono text-2xl mb-4">{dissuasiveMsg.title}</h2>
              <p className="text-text-muted leading-relaxed mb-10">{dissuasiveMsg.body}</p>
              <div className="space-y-4">
                <button
                  onClick={handleGoBackToWriting}
                  className="w-full bg-accent text-white py-4 rounded font-mono text-lg hover:bg-accent-hover transition-colors pulse-glow"
                >
                  Go Back to Writing
                </button>
                <button
                  onClick={handleContinueWithoutFullscreen}
                  className="w-full border border-border py-3 rounded font-mono text-sm text-text-dim hover:text-text-muted transition-colors"
                >
                  Continue without fullscreen
                </button>
              </div>
              <p className="text-text-dim text-xs mt-8 font-mono">
                {formatTime(timeLeft)} remaining
              </p>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-3 border-b border-border/50">
          <span className="font-mono text-sm text-text-dim">{file.title}</span>
          <div className={`font-mono text-lg ${isLowTime ? "text-danger" : "text-accent"}`}>
            {formatTime(timeLeft)}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-text-dim">
              {isSaving ? "Saving..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ""}
            </span>
            <div className="flex items-center gap-1">
              {(Object.entries(TEXT_SIZES) as [TextSize, { label: string; class: string }][]).map(
                ([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleTextSizeChange(key)}
                    className={`w-7 h-7 rounded text-xs font-mono transition-colors ${
                      settings.textSize === key ? "bg-accent/20 text-accent" : "text-text-dim hover:text-text-muted"
                    }`}
                  >
                    {value.label}
                  </button>
                )
              )}
            </div>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              style={{ width: 28, height: 28, fontSize: 13 }}
              aria-label="Toggle theme"
            >
              {theme === "light" ? "\u263E" : "\u2600"}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-border/30">
          <div
            className="h-full bg-accent transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Page area — scrollable, centered */}
        <div className="flex-1 overflow-auto flex items-start justify-center py-12 px-4">
          <div className="flex items-start justify-center gap-8">

            {/* Ghost of previous page */}
            {hasPrev && (
              <div
                className="a4-page paper-page ghost-page cursor-pointer hidden xl:block"
                onClick={() => goToPage(currentPageIndex - 1)}
                title={`Go to page ${currentPageIndex}`}
              >
                <div
                  className={`w-full h-full bg-transparent text-text font-serif pointer-events-none select-none overflow-hidden ${TEXT_SIZES[settings.textSize].class}`}
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.8, letterSpacing: "0.02em" }}
                >
                  {pages[currentPageIndex - 1]}
                </div>
              </div>
            )}

            {/* Current page */}
            <div className={`a4-page paper-page ${pageFlipAnim ? "page-flip-in" : ""}`}>
              <textarea
                ref={textareaRef}
                value={pages[currentPageIndex] ?? ""}
                onChange={handleContentChange}
                placeholder={currentPageIndex === 0 ? "Start writing..." : ""}
                className={`writing-area w-full bg-transparent text-text resize-none font-serif ${TEXT_SIZES[settings.textSize].class}`}
                spellCheck
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-8 py-3 border-t border-border/50 text-xs font-mono text-text-dim">
          <span>{wordCount} words</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => goToPage(currentPageIndex - 1)}
              disabled={!hasPrev}
              className="disabled:opacity-20 hover:text-accent transition-colors px-2"
            >
              &#8592;
            </button>
            <span>Page {currentPageIndex + 1} of {totalPagesCount}</span>
            <button
              onClick={() => goToPage(currentPageIndex + 1)}
              disabled={!hasNext}
              className="disabled:opacity-20 hover:text-accent transition-colors px-2"
            >
              &#8594;
            </button>
          </div>
          <span>+{sessionWordCount} this session</span>
        </div>
      </div>
    );
  }

  // ---- SESSION DONE SCREEN ----
  const stats = sessionStats;

  return (
    <div className="min-h-screen bg-bg paper-texture">
      <div className="max-w-lg mx-auto px-6 py-20 text-center fade-in">
        <div className="text-accent text-6xl mb-6">&#10003;</div>
        <h1 className="font-mono text-2xl mb-3">Session Complete</h1>
        <p className="text-text-muted mb-12 leading-relaxed">
          You stayed locked in and wrote. That&apos;s what matters.
        </p>

        {/* Stats card */}
        {stats && (
          <div className="border border-border rounded-lg p-8 bg-bg-card card-elevated mb-8">
            <h2 className="font-mono text-sm text-text-muted mb-6 uppercase tracking-wider">
              Your Session
            </h2>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div>
                <div className="font-mono text-3xl text-accent">{stats.durationMinutes}</div>
                <div className="text-text-dim text-xs mt-1">minutes</div>
              </div>
              <div>
                <div className="font-mono text-3xl text-accent">+{Math.max(0, stats.netWords)}</div>
                <div className="text-text-dim text-xs mt-1">net words</div>
              </div>
              <div>
                <div className="font-mono text-3xl text-accent">{stats.totalPages}</div>
                <div className="text-text-dim text-xs mt-1">total pages</div>
              </div>
            </div>

            <div className="border-t border-border pt-6 grid grid-cols-2 gap-4 text-left">
              <div className="flex justify-between">
                <span className="text-text-dim text-xs">Words added</span>
                <span className="font-mono text-xs text-success">+{stats.wordsAdded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim text-xs">Words erased</span>
                <span className="font-mono text-xs text-danger">-{stats.wordsErased}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim text-xs">Chars typed</span>
                <span className="font-mono text-xs text-text-muted">{stats.charsTyped.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim text-xs">Chars deleted</span>
                <span className="font-mono text-xs text-text-muted">{stats.charsDeleted.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim text-xs">Words/min</span>
                <span className="font-mono text-xs text-accent">{stats.wordsPerMinute}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim text-xs">Peak words</span>
                <span className="font-mono text-xs text-text-muted">{stats.peakWordCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Next session scheduler */}
        <div className="border border-border rounded-lg p-8 bg-bg-card card-elevated mb-8">
          <h2 className="font-mono text-sm text-text-muted mb-2 uppercase tracking-wider">
            Next Session
          </h2>
          <p className="text-text-dim text-xs mb-6">
            Consistency is how books get finished.
          </p>

          {reminderSent ? (
            <div className="py-6">
              <div className="text-success text-2xl mb-3">&#10003;</div>
              <p className="text-text-muted text-sm leading-relaxed">
                Reminder set for{" "}
                <span className="text-accent font-mono">
                  {new Date(nextSessionDate + "T" + nextSessionTime).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>{" "}
                at <span className="text-accent font-mono">{nextSessionTime}</span>.
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-xs text-text-dim mb-2 text-left font-mono">Date</label>
                  <input
                    type="date"
                    value={nextSessionDate}
                    onChange={(e) => setNextSessionDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-bg-input border border-border rounded px-3 py-2.5 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-dim mb-2 text-left font-mono">Time</label>
                  <input
                    type="time"
                    value={nextSessionTime}
                    onChange={(e) => setNextSessionTime(e.target.value)}
                    className="w-full bg-bg-input border border-border rounded px-3 py-2.5 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {reminderError && (
                <p className="text-danger text-xs font-mono mb-3">{reminderError}</p>
              )}

              <button
                onClick={scheduleReminder}
                disabled={!nextSessionDate || !nextSessionTime || reminderSending}
                className="w-full border border-accent text-accent py-3 rounded font-mono text-sm hover:bg-accent hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {reminderSending
                  ? "Scheduling..."
                  : user?.email
                  ? "Remind Me by Email"
                  : "Sign In to Set Reminders"}
              </button>

              {!user && (
                <p className="text-text-dim text-xs mt-3">
                  <Link href="/auth/signin" className="text-accent hover:underline">Sign in</Link>{" "}
                  to get email reminders.
                </p>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setEditorState("setup")}
            className="w-full bg-accent text-white py-3.5 rounded font-mono text-sm hover:bg-accent-hover transition-colors"
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
              className="w-full border border-accent text-accent py-3.5 rounded font-mono text-sm hover:bg-accent hover:text-white transition-colors"
            >
              Download as .txt
            </button>
          ) : (
            <Link
              href="/#pricing"
              className="w-full border border-border py-3.5 rounded font-mono text-sm text-text-dim hover:border-accent hover:text-accent transition-colors block text-center"
            >
              Upgrade to Download Files
            </Link>
          )}
          <Link
            href="/dashboard"
            className="w-full border border-border py-3.5 rounded font-mono text-sm hover:border-accent hover:text-accent transition-colors block text-center"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="text-text-dim text-xs mt-12 leading-relaxed">
          &ldquo;A professional writer is an amateur who didn&apos;t quit.&rdquo;
        </p>
      </div>
    </div>
  );
}
