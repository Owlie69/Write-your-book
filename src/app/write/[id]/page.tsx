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
  getWritingHabit,
  saveWritingHabit,
  getSessionHistory,
  addSessionRecord,
  calculateStreak,
  type WritingFile,
  type AppSettings,
  type WritingHabit,
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
type DownloadFormat = "txt" | "pdf" | "docx";

function formatDateForFilename(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "untitled";
}

function downloadAsTxt(content: string, title: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(title)}_${formatDateForFilename()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function downloadAsPdf(content: string, title: string) {
  // Generate a printable HTML document and trigger print-to-PDF
  const safeTitle = escapeHtml(title);
  const safeContent = escapeHtml(content);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${safeTitle}</title>
<style>
  body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.8;
         margin: 72px; color: #1a1a1a; white-space: pre-wrap; word-wrap: break-word; }
  h1 { font-size: 18pt; margin-bottom: 8px; }
  .meta { color: #999; font-size: 10pt; margin-bottom: 32px; }
  @page { margin: 1in; }
</style></head><body>
<h1>${safeTitle}</h1>
<div class="meta">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
${safeContent}</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function downloadAsDocx(content: string, title: string) {
  // Generate a simple .docx-compatible XML file
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const escapedContent = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${line}</w:t></w:r></w:p>`)
    .join("");
  const escapedTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const docx = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
<w:body>
<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapedTitle}</w:t></w:r></w:p>
<w:p><w:r><w:rPr><w:color w:val="999999"/><w:sz w:val="20"/></w:rPr><w:t>${date}</w:t></w:r></w:p>
<w:p/>
${escapedContent}
</w:body></w:wordDocument>`;

  const blob = new Blob([docx], { type: "application/vnd.ms-word;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(title)}_${formatDateForFilename()}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DownloadPopup({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  const filename = `${sanitizeFilename(title)}_${formatDateForFilename()}`;

  function handleDownload(format: DownloadFormat) {
    switch (format) {
      case "txt":
        downloadAsTxt(content, title);
        break;
      case "pdf":
        downloadAsPdf(content, title);
        break;
      case "docx":
        downloadAsDocx(content, title);
        break;
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border border-border rounded-xl p-6 sm:p-8 card-elevated fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-dim hover:text-text transition-colors font-mono text-lg"
        >
          &times;
        </button>

        <h3 className="font-mono text-lg sm:text-xl mb-2 text-center">Download Your Writing</h3>
        <p className="text-text-dim text-xs sm:text-sm text-center mb-6 font-mono">{filename}</p>

        <div className="space-y-3">
          <button
            onClick={() => handleDownload("txt")}
            className="w-full flex items-center justify-between border border-border rounded-lg px-5 py-4 hover:border-accent hover:text-accent transition-colors group"
          >
            <div className="text-left">
              <div className="font-mono text-sm sm:text-base">Plain Text</div>
              <div className="text-text-dim text-xs mt-0.5">.txt file</div>
            </div>
            <span className="text-text-dim group-hover:text-accent text-lg">&#8615;</span>
          </button>

          <button
            onClick={() => handleDownload("pdf")}
            className="w-full flex items-center justify-between border border-border rounded-lg px-5 py-4 hover:border-accent hover:text-accent transition-colors group"
          >
            <div className="text-left">
              <div className="font-mono text-sm sm:text-base">PDF Document</div>
              <div className="text-text-dim text-xs mt-0.5">Print-ready format</div>
            </div>
            <span className="text-text-dim group-hover:text-accent text-lg">&#8615;</span>
          </button>

          <button
            onClick={() => handleDownload("docx")}
            className="w-full flex items-center justify-between border border-border rounded-lg px-5 py-4 hover:border-accent hover:text-accent transition-colors group"
          >
            <div className="text-left">
              <div className="font-mono text-sm sm:text-base">Word Document</div>
              <div className="text-text-dim text-xs mt-0.5">.doc file</div>
            </div>
            <span className="text-text-dim group-hover:text-accent text-lg">&#8615;</span>
          </button>
        </div>
      </div>
    </div>
  );
}

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

function generateCalendarEvent(days: boolean[], time: string, title: string): string {
  const dayMap = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  const selectedDays = days.map((d, i) => (d ? dayMap[i] : null)).filter(Boolean);
  if (selectedDays.length === 0) return "";

  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  now.setHours(h, m, 0, 0);
  if (now < new Date()) now.setDate(now.getDate() + 1);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  const dtStart = fmt(now);
  const dtEnd = fmt(new Date(now.getTime() + 30 * 60000));

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JustWrite//Writing Sessions//EN",
    "BEGIN:VEVENT",
    `UID:justwrite-${Date.now()}@justwrite.app`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${selectedDays.join(",")}`,
    `SUMMARY:JustWrite ${title}`,
    "DESCRIPTION:Time to lock in and write. Open JustWrite and start your session.",
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Writing session starts in 10 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// Ambient sound definitions
const AMBIENT_SOUNDS = [
  { id: "rain", label: "Rain", icon: "\u{1F327}", frequency: 200 },
  { id: "cafe", label: "Cafe", icon: "\u{2615}", frequency: 300 },
  { id: "fire", label: "Fireplace", icon: "\u{1F525}", frequency: 150 },
  { id: "forest", label: "Forest", icon: "\u{1F333}", frequency: 250 },
  { id: "waves", label: "Waves", icon: "\u{1F30A}", frequency: 180 },
  { id: "whitenoise", label: "White Noise", icon: "\u{1F4AC}", frequency: 0 },
] as const;

type AmbientSoundId = typeof AMBIENT_SOUNDS[number]["id"];

// Helper: create a noise buffer
function createNoiseBuffer(audioCtx: AudioContext, seconds: number): AudioBuffer {
  const len = audioCtx.sampleRate * seconds;
  const buffer = audioCtx.createBuffer(2, len, audioCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Generate ambient sound using Web Audio API (no external files needed)
function createAmbientSound(audioCtx: AudioContext, soundId: AmbientSoundId): { start: () => void; stop: () => void } {
  let nodes: AudioNode[] = [];
  let sources: AudioBufferSourceNode[] = [];
  let oscillators: OscillatorNode[] = [];
  let running = false;

  function start() {
    if (running) return;
    running = true;

    const master = audioCtx.createGain();
    master.gain.value = 0.18;
    master.connect(audioCtx.destination);
    nodes.push(master);

    if (soundId === "whitenoise") {
      // Smooth pink-ish white noise — gentle and non-harsh
      const buf = createNoiseBuffer(audioCtx, 4);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      sources.push(src);

      // Shape it to be softer: roll off highs, slight warmth
      const lp = audioCtx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 4000;
      lp.Q.value = 0.5;
      nodes.push(lp);

      const hp = audioCtx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 100;
      nodes.push(hp);

      src.connect(hp);
      hp.connect(lp);
      lp.connect(master);
      master.gain.value = 0.12;
      src.start();

    } else if (soundId === "rain") {
      // Rain: two noise layers — steady patter + heavier drops
      // Layer 1: steady light rain (higher pitched, filtered)
      const buf1 = createNoiseBuffer(audioCtx, 4);
      const src1 = audioCtx.createBufferSource();
      src1.buffer = buf1;
      src1.loop = true;
      sources.push(src1);

      const bp1 = audioCtx.createBiquadFilter();
      bp1.type = "bandpass";
      bp1.frequency.value = 3000;
      bp1.Q.value = 0.4;
      nodes.push(bp1);

      const gain1 = audioCtx.createGain();
      gain1.gain.value = 0.3;
      nodes.push(gain1);

      src1.connect(bp1);
      bp1.connect(gain1);
      gain1.connect(master);
      src1.start();

      // Layer 2: heavier drops (lower, with slow amplitude modulation)
      const buf2 = createNoiseBuffer(audioCtx, 6);
      const src2 = audioCtx.createBufferSource();
      src2.buffer = buf2;
      src2.loop = true;
      sources.push(src2);

      const bp2 = audioCtx.createBiquadFilter();
      bp2.type = "bandpass";
      bp2.frequency.value = 800;
      bp2.Q.value = 0.6;
      nodes.push(bp2);

      // Modulate amplitude slowly to simulate rain intensity
      const modGain = audioCtx.createGain();
      modGain.gain.value = 0.5;
      nodes.push(modGain);

      const lfo = audioCtx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.15; // slow wobble
      oscillators.push(lfo);

      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.2;
      nodes.push(lfoGain);

      lfo.connect(lfoGain);
      lfoGain.connect(modGain.gain);

      src2.connect(bp2);
      bp2.connect(modGain);
      modGain.connect(master);
      src2.start();
      lfo.start();

      // Layer 3: subtle low rumble (distant thunder ambience)
      const buf3 = createNoiseBuffer(audioCtx, 8);
      const src3 = audioCtx.createBufferSource();
      src3.buffer = buf3;
      src3.loop = true;
      sources.push(src3);

      const lp3 = audioCtx.createBiquadFilter();
      lp3.type = "lowpass";
      lp3.frequency.value = 200;
      nodes.push(lp3);

      const gain3 = audioCtx.createGain();
      gain3.gain.value = 0.15;
      nodes.push(gain3);

      src3.connect(lp3);
      lp3.connect(gain3);
      gain3.connect(master);
      src3.start();

    } else if (soundId === "cafe") {
      // Cafe: warm low murmur + mid chatter hum + occasional clinking highs
      // Base murmur
      const buf1 = createNoiseBuffer(audioCtx, 6);
      const src1 = audioCtx.createBufferSource();
      src1.buffer = buf1;
      src1.loop = true;
      sources.push(src1);

      const lp1 = audioCtx.createBiquadFilter();
      lp1.type = "lowpass";
      lp1.frequency.value = 350;
      lp1.Q.value = 0.7;
      nodes.push(lp1);

      const hp1 = audioCtx.createBiquadFilter();
      hp1.type = "highpass";
      hp1.frequency.value = 60;
      nodes.push(hp1);

      const gain1 = audioCtx.createGain();
      gain1.gain.value = 0.5;
      nodes.push(gain1);

      src1.connect(hp1);
      hp1.connect(lp1);
      lp1.connect(gain1);
      gain1.connect(master);
      src1.start();

      // Mid chatter layer
      const buf2 = createNoiseBuffer(audioCtx, 5);
      const src2 = audioCtx.createBufferSource();
      src2.buffer = buf2;
      src2.loop = true;
      sources.push(src2);

      const bp2 = audioCtx.createBiquadFilter();
      bp2.type = "bandpass";
      bp2.frequency.value = 1200;
      bp2.Q.value = 1.5;
      nodes.push(bp2);

      const gain2 = audioCtx.createGain();
      gain2.gain.value = 0.12;
      nodes.push(gain2);

      // Slow modulation to simulate conversation ebb and flow
      const lfo2 = audioCtx.createOscillator();
      lfo2.type = "sine";
      lfo2.frequency.value = 0.08;
      oscillators.push(lfo2);

      const lfoGain2 = audioCtx.createGain();
      lfoGain2.gain.value = 0.06;
      nodes.push(lfoGain2);

      lfo2.connect(lfoGain2);
      lfoGain2.connect(gain2.gain);

      src2.connect(bp2);
      bp2.connect(gain2);
      gain2.connect(master);
      src2.start();
      lfo2.start();

      // High sparkle layer (clinking, faint)
      const buf3 = createNoiseBuffer(audioCtx, 3);
      const src3 = audioCtx.createBufferSource();
      src3.buffer = buf3;
      src3.loop = true;
      sources.push(src3);

      const hp3 = audioCtx.createBiquadFilter();
      hp3.type = "highpass";
      hp3.frequency.value = 4000;
      nodes.push(hp3);

      const gain3 = audioCtx.createGain();
      gain3.gain.value = 0.04;
      nodes.push(gain3);

      src3.connect(hp3);
      hp3.connect(gain3);
      gain3.connect(master);
      src3.start();

    } else if (soundId === "fire") {
      // Fireplace: crackling pops over a warm low rumble
      // Warm base roar
      const buf1 = createNoiseBuffer(audioCtx, 4);
      const src1 = audioCtx.createBufferSource();
      src1.buffer = buf1;
      src1.loop = true;
      sources.push(src1);

      const lp1 = audioCtx.createBiquadFilter();
      lp1.type = "lowpass";
      lp1.frequency.value = 250;
      lp1.Q.value = 0.8;
      nodes.push(lp1);

      const gain1 = audioCtx.createGain();
      gain1.gain.value = 0.35;
      nodes.push(gain1);

      src1.connect(lp1);
      lp1.connect(gain1);
      gain1.connect(master);
      src1.start();

      // Crackle layer: noise with random amplitude bursts
      const crackleLen = audioCtx.sampleRate * 6;
      const crackleBuf = audioCtx.createBuffer(2, crackleLen, audioCtx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = crackleBuf.getChannelData(ch);
        for (let i = 0; i < crackleLen; i++) {
          // Random pops: short bursts of noise at random intervals
          const pop = Math.random() < 0.003 ? 1.0 : Math.random() < 0.01 ? 0.4 : 0.0;
          // Each pop lasts ~5-20 samples
          if (pop > 0) {
            const popLen = Math.floor(5 + Math.random() * 15);
            for (let j = 0; j < popLen && i + j < crackleLen; j++) {
              data[i + j] = (Math.random() * 2 - 1) * pop;
            }
            i += 15;
          }
        }
      }
      const src2 = audioCtx.createBufferSource();
      src2.buffer = crackleBuf;
      src2.loop = true;
      sources.push(src2);

      const bp2 = audioCtx.createBiquadFilter();
      bp2.type = "bandpass";
      bp2.frequency.value = 2000;
      bp2.Q.value = 0.5;
      nodes.push(bp2);

      const gain2 = audioCtx.createGain();
      gain2.gain.value = 0.6;
      nodes.push(gain2);

      src2.connect(bp2);
      bp2.connect(gain2);
      gain2.connect(master);
      src2.start();

      // Mid warmth hiss
      const buf3 = createNoiseBuffer(audioCtx, 5);
      const src3 = audioCtx.createBufferSource();
      src3.buffer = buf3;
      src3.loop = true;
      sources.push(src3);

      const bp3 = audioCtx.createBiquadFilter();
      bp3.type = "bandpass";
      bp3.frequency.value = 600;
      bp3.Q.value = 1.2;
      nodes.push(bp3);

      const gain3 = audioCtx.createGain();
      gain3.gain.value = 0.15;
      nodes.push(gain3);

      src3.connect(bp3);
      bp3.connect(gain3);
      gain3.connect(master);
      src3.start();

    } else if (soundId === "forest") {
      // Forest: gentle wind through trees + bird-like chirps + rustling
      // Wind base layer
      const buf1 = createNoiseBuffer(audioCtx, 8);
      const src1 = audioCtx.createBufferSource();
      src1.buffer = buf1;
      src1.loop = true;
      sources.push(src1);

      const bp1 = audioCtx.createBiquadFilter();
      bp1.type = "bandpass";
      bp1.frequency.value = 400;
      bp1.Q.value = 0.3;
      nodes.push(bp1);

      const windGain = audioCtx.createGain();
      windGain.gain.value = 0.2;
      nodes.push(windGain);

      // Slow wind modulation
      const windLfo = audioCtx.createOscillator();
      windLfo.type = "sine";
      windLfo.frequency.value = 0.06;
      oscillators.push(windLfo);

      const windLfoGain = audioCtx.createGain();
      windLfoGain.gain.value = 0.1;
      nodes.push(windLfoGain);

      windLfo.connect(windLfoGain);
      windLfoGain.connect(windGain.gain);

      src1.connect(bp1);
      bp1.connect(windGain);
      windGain.connect(master);
      src1.start();
      windLfo.start();

      // High rustling leaves
      const buf2 = createNoiseBuffer(audioCtx, 5);
      const src2 = audioCtx.createBufferSource();
      src2.buffer = buf2;
      src2.loop = true;
      sources.push(src2);

      const hp2 = audioCtx.createBiquadFilter();
      hp2.type = "highpass";
      hp2.frequency.value = 3000;
      nodes.push(hp2);

      const lp2 = audioCtx.createBiquadFilter();
      lp2.type = "lowpass";
      lp2.frequency.value = 7000;
      nodes.push(lp2);

      const gain2 = audioCtx.createGain();
      gain2.gain.value = 0.06;
      nodes.push(gain2);

      src2.connect(hp2);
      hp2.connect(lp2);
      lp2.connect(gain2);
      gain2.connect(master);
      src2.start();

      // Bird-like chirps: several sine oscillators with slow random-ish on/off
      for (let b = 0; b < 3; b++) {
        const birdOsc = audioCtx.createOscillator();
        birdOsc.type = "sine";
        birdOsc.frequency.value = 2800 + b * 600 + Math.random() * 400;
        oscillators.push(birdOsc);

        const birdGain = audioCtx.createGain();
        birdGain.gain.value = 0;
        nodes.push(birdGain);

        // Modulate bird on/off with a slow square-ish LFO
        const birdLfo = audioCtx.createOscillator();
        birdLfo.type = "square";
        birdLfo.frequency.value = 0.3 + Math.random() * 0.4;
        oscillators.push(birdLfo);

        const birdLfoGain = audioCtx.createGain();
        birdLfoGain.gain.value = 0.015;
        nodes.push(birdLfoGain);

        birdLfo.connect(birdLfoGain);
        birdLfoGain.connect(birdGain.gain);

        birdOsc.connect(birdGain);
        birdGain.connect(master);
        birdOsc.start();
        birdLfo.start();
      }

      master.gain.value = 0.2;

    } else if (soundId === "waves") {
      // Ocean waves: slow rhythmic surge with white noise shaped by LFO
      const bufLen = audioCtx.sampleRate * 10;
      const waveBuf = audioCtx.createBuffer(2, bufLen, audioCtx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = waveBuf.getChannelData(ch);
        for (let i = 0; i < bufLen; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      }

      const src = audioCtx.createBufferSource();
      src.buffer = waveBuf;
      src.loop = true;
      sources.push(src);

      // Low pass for the "whoosh"
      const lp = audioCtx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 500;
      lp.Q.value = 0.5;
      nodes.push(lp);

      // LFO to modulate volume = wave surging
      const surgeLfo = audioCtx.createOscillator();
      surgeLfo.type = "sine";
      surgeLfo.frequency.value = 0.1; // ~10 second wave cycle
      oscillators.push(surgeLfo);

      const surgeGain = audioCtx.createGain();
      surgeGain.gain.value = 0.5;
      nodes.push(surgeGain);

      const surgeAmp = audioCtx.createGain();
      surgeAmp.gain.value = 0.08;
      nodes.push(surgeAmp);

      surgeLfo.connect(surgeAmp);
      surgeAmp.connect(surgeGain.gain);

      src.connect(lp);
      lp.connect(surgeGain);
      surgeGain.connect(master);
      src.start();
      surgeLfo.start();

      // Higher foam/hiss layer that follows the surge
      const foamBuf = createNoiseBuffer(audioCtx, 6);
      const foamSrc = audioCtx.createBufferSource();
      foamSrc.buffer = foamBuf;
      foamSrc.loop = true;
      sources.push(foamSrc);

      const foamBp = audioCtx.createBiquadFilter();
      foamBp.type = "bandpass";
      foamBp.frequency.value = 2500;
      foamBp.Q.value = 0.4;
      nodes.push(foamBp);

      const foamGain = audioCtx.createGain();
      foamGain.gain.value = 0.3;
      nodes.push(foamGain);

      const foamAmp = audioCtx.createGain();
      foamAmp.gain.value = 0.06;
      nodes.push(foamAmp);

      // Same LFO but slightly offset
      const foamLfo = audioCtx.createOscillator();
      foamLfo.type = "sine";
      foamLfo.frequency.value = 0.1;
      oscillators.push(foamLfo);

      foamLfo.connect(foamAmp);
      foamAmp.connect(foamGain.gain);

      foamSrc.connect(foamBp);
      foamBp.connect(foamGain);
      foamGain.connect(master);
      foamSrc.start();
      foamLfo.start();

      // Distant deep rumble
      const rumbleBuf = createNoiseBuffer(audioCtx, 8);
      const rumbleSrc = audioCtx.createBufferSource();
      rumbleSrc.buffer = rumbleBuf;
      rumbleSrc.loop = true;
      sources.push(rumbleSrc);

      const rumbleLp = audioCtx.createBiquadFilter();
      rumbleLp.type = "lowpass";
      rumbleLp.frequency.value = 120;
      nodes.push(rumbleLp);

      const rumbleGain = audioCtx.createGain();
      rumbleGain.gain.value = 0.25;
      nodes.push(rumbleGain);

      rumbleSrc.connect(rumbleLp);
      rumbleLp.connect(rumbleGain);
      rumbleGain.connect(master);
      rumbleSrc.start();
    }
  }

  function stop() {
    running = false;
    for (const osc of oscillators) {
      try { osc.stop(); osc.disconnect(); } catch { /* ignore */ }
    }
    for (const src of sources) {
      try { src.stop(); src.disconnect(); } catch { /* ignore */ }
    }
    for (const node of nodes) {
      try { node.disconnect(); } catch { /* ignore */ }
    }
    nodes = [];
    sources = [];
    oscillators = [];
  }

  return { start, stop };
}

// SVG Timer Ring — unified for both timer progress and word goal
function TimerRing({
  timeProgress,
  wordProgress,
  isLowTime,
  goalReached,
  size,
  children,
}: {
  timeProgress: number; // 0–1 how much time has elapsed
  wordProgress?: number; // 0–1 how close to word goal (optional, paid only)
  isLowTime: boolean;
  goalReached: boolean;
  size: number;
  children: React.ReactNode;
}) {
  const strokeWidth = size * 0.045;
  const wordStrokeWidth = wordProgress !== undefined ? size * 0.03 : 0;
  const gap = wordProgress !== undefined ? 6 : 0;
  const outerRadius = (size - strokeWidth) / 2;
  const innerRadius = wordProgress !== undefined ? outerRadius - strokeWidth / 2 - gap - wordStrokeWidth / 2 : 0;
  const outerCircumference = outerRadius * 2 * Math.PI;
  const innerCircumference = innerRadius * 2 * Math.PI;
  const timeOffset = outerCircumference - Math.min(1, Math.max(0, timeProgress)) * outerCircumference;
  const wordOffset = wordProgress !== undefined
    ? innerCircumference - Math.min(1, Math.max(0, wordProgress)) * innerCircumference
    : 0;

  const timeColor = isLowTime
    ? "var(--color-danger)"
    : "var(--color-accent)";
  const wordColor = goalReached
    ? "var(--color-success)"
    : "var(--color-accent-dim, var(--color-accent))";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Outer track (time) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          opacity={0.4}
        />
        {/* Outer progress (time) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke={timeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={outerCircumference}
          strokeDashoffset={timeOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
          style={{ filter: isLowTime ? "drop-shadow(0 0 6px var(--color-danger))" : "none" }}
        />
        {/* Inner track (word goal) — only for paid */}
        {wordProgress !== undefined && (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={innerRadius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={wordStrokeWidth}
              opacity={0.25}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={innerRadius}
              fill="none"
              stroke={wordColor}
              strokeWidth={wordStrokeWidth}
              strokeDasharray={innerCircumference}
              strokeDashoffset={wordOffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
              style={{ filter: goalReached ? "drop-shadow(0 0 4px var(--color-success))" : "none" }}
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

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
  const [charCount, setCharCount] = useState(0);
  const [sessionWordCount, setSessionWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [showDissuasive, setShowDissuasive] = useState(false);
  const [dissuasiveMsg, setDissuasiveMsg] = useState(DISSUASIVE_MESSAGES[0]);
  const [showDownload, setShowDownload] = useState(false);

  // Word count goal
  const [wordGoal, setWordGoal] = useState(500);
  const [goalReached, setGoalReached] = useState(false);

  // Ambient sounds
  const [activeSound, setActiveSound] = useState<AmbientSoundId | null>(null);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSoundRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  // Writing buddy
  const [buddyEmail, setBuddyEmail] = useState("");
  const [buddySaved, setBuddySaved] = useState(false);

  // Push notifications
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  // Pagination
  const [pages, setPages] = useState<string[]>([""]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageFlipAnim, setPageFlipAnim] = useState(false);

  // Habit & reminders
  const [habit, setHabit] = useState<WritingHabit>({ days: [false,false,false,false,false,false,false], time: "09:00", enabled: false });
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [habitSaved, setHabitSaved] = useState(false);
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
      setCharCount(found.content.length);
      startWordCountRef.current = wc;
      prevWordCountRef.current = wc;
      peakWordCountRef.current = wc;
      const initialPages = splitIntoPages(found.content);
      setPages(initialPages);
      setCurrentPageIndex(initialPages.length - 1);
    }
    setHabit(getWritingHabit());
    setStreak(calculateStreak(getSessionHistory()));
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

        if (user) {
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

    addSessionRecord({
      date: new Date().toISOString().split("T")[0],
      fileId: fileId,
      fileTitle: file?.title || "",
      durationMinutes: Math.max(1, actualMinutes),
      wordsAdded: totalWordsAddedRef.current,
    });
    setStreak(calculateStreak(getSessionHistory()));

    // Stop ambient sound
    if (activeSoundRef.current) {
      activeSoundRef.current.stop();
      activeSoundRef.current = null;
    }
    setActiveSound(null);

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
    setGoalReached(false);
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
    setCharCount(fullContent.length);
    const swc = wc - startWordCountRef.current;
    setSessionWordCount(swc);

    // Check word goal
    if (plan !== "free" && swc >= wordGoal && !goalReached) {
      setGoalReached(true);
    }
  }

  function goToPage(idx: number) {
    if (idx < 0 || idx >= pages.length) return;
    setCurrentPageIndex(idx);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function toggleAmbientSound(soundId: AmbientSoundId) {
    if (plan === "free") return;

    // Stop current sound
    if (activeSoundRef.current) {
      activeSoundRef.current.stop();
      activeSoundRef.current = null;
    }

    // If same sound, just turn off
    if (activeSound === soundId) {
      setActiveSound(null);
      return;
    }

    // Create audio context if needed
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    const sound = createAmbientSound(audioCtxRef.current, soundId);
    sound.start();
    activeSoundRef.current = sound;
    setActiveSound(soundId);
  }

  async function requestPushPermission() {
    if (plan === "free") return;
    try {
      if (!("Notification" in window)) {
        setPushError("Push notifications not supported in this browser");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPushEnabled(true);
        setPushError(null);
        // Store preference
        localStorage.setItem("justwrite_push_enabled", "true");
      } else {
        setPushError("Permission denied. Enable in browser settings.");
      }
    } catch {
      setPushError("Failed to enable notifications");
    }
  }

  function handleTextSizeChange(size: TextSize) {
    const newSettings = { ...settings, textSize: size };
    setSettings(newSettings);
    saveLocalSettings(newSettings);
  }

  function downloadCalendarEvent() {
    const ics = generateCalendarEvent(habit.days, habit.time, file?.title || "Writing");
    if (!ics) return;
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "justwrite-sessions.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function sendHabitReminders() {
    if (!user?.email) {
      setReminderError("Sign in to receive email reminders");
      return;
    }
    if (!habit.days.some((d) => d)) return;
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
          habitDays: habit.days,
          habitTime: habit.time,
          type: "recurring",
        }),
      });
      if (res.ok) {
        setReminderSent(true);
      } else {
        const data = await res.json();
        setReminderError(data.error || "Failed to set reminders");
      }
    } catch {
      setReminderError("Failed to set reminders");
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
        <div className="w-full max-w-md text-center fade-in">
          <div className="flex items-center justify-between mb-16">
            <Link href="/dashboard" className="text-text-dim hover:text-text-muted text-sm sm:text-base font-mono transition-colors">
              &larr; Back
            </Link>
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
              {theme === "light" ? "\u263E" : "\u2600"}
            </button>
          </div>

          <h1 className="font-mono text-2xl sm:text-3xl mb-3">{file.title}</h1>
          <p className="text-text-muted text-sm sm:text-base mb-16">
            {wordCount} words &middot; {calculatePageCount(file.content)} pages
          </p>

          {/* Timer setting */}
          <div className="border border-border rounded-xl p-8 sm:p-10 bg-bg-card card-elevated mb-12">
            <label className="block text-sm sm:text-base font-mono text-text-muted mb-5">
              Session Length
            </label>
            {canCustomize ? (
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => setSessionMinutes((m) => Math.max(MIN_SESSION_MINUTES, m - 1))}
                  className="w-12 h-12 rounded border border-border hover:border-accent text-text-muted hover:text-accent transition-colors font-mono text-lg"
                >
                  -
                </button>
                <div className="relative w-28">
                  <input
                    type="number"
                    min={MIN_SESSION_MINUTES}
                    max={MAX_SESSION_MINUTES}
                    value={sessionMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setSessionMinutes(Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, val)));
                      }
                    }}
                    className="font-mono text-5xl text-accent w-28 text-center bg-transparent border-none outline-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <button
                  onClick={() => setSessionMinutes((m) => Math.min(MAX_SESSION_MINUTES, m + 1))}
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

          {/* Word goal setting */}
          {plan !== "free" ? (
            <div className="border border-border rounded-xl p-6 sm:p-8 bg-bg-card card-elevated mb-12">
              <label className="block text-sm sm:text-base font-mono text-text-muted mb-4">
                Word Goal
              </label>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => setWordGoal((g) => Math.max(50, g - 50))}
                  className="w-10 h-10 rounded border border-border hover:border-accent text-text-muted hover:text-accent transition-colors font-mono text-lg"
                >
                  -
                </button>
                <div className="font-mono text-3xl text-accent w-24 text-center">{wordGoal}</div>
                <button
                  onClick={() => setWordGoal((g) => Math.min(5000, g + 50))}
                  className="w-10 h-10 rounded border border-border hover:border-accent text-text-muted hover:text-accent transition-colors font-mono text-lg"
                >
                  +
                </button>
              </div>
              <p className="text-text-dim text-xs mt-3 font-mono">words this session</p>
            </div>
          ) : (
            <div className="relative border border-border rounded-xl p-6 bg-bg-card card-elevated mb-12 overflow-hidden">
              <div className="opacity-30 blur-[1px] pointer-events-none select-none text-center">
                <label className="block text-sm font-mono text-text-muted mb-4">Word Goal</label>
                <div className="font-mono text-3xl text-accent">500</div>
                <p className="text-text-dim text-xs mt-3 font-mono">words this session</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Link href="/#pricing" className="text-accent hover:underline font-mono text-sm">
                  Upgrade for Word Goals
                </Link>
              </div>
            </div>
          )}

          {/* Start button */}
          <button
            onClick={startSession}
            className="w-full bg-accent text-white py-5 rounded font-mono text-lg sm:text-xl hover:bg-accent-hover transition-colors pulse-glow"
          >
            Lock In &amp; Write
          </button>

          <p className="text-text-dim text-xs sm:text-sm mt-6 leading-relaxed">
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
        {/* Download popup */}
        {showDownload && (
          <DownloadPopup
            title={file.title}
            content={contentRef.current}
            onClose={() => setShowDownload(false)}
          />
        )}

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
        <div className="relative flex items-center justify-between px-3 sm:px-8 py-2 border-b border-border/50">
          <span className="font-mono text-xs sm:text-sm text-text-dim truncate max-w-[100px] sm:max-w-none">{file.title}</span>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-[38px] sm:-bottom-[46px] z-[60]">
            <TimerRing
              timeProgress={progress}
              wordProgress={plan !== "free" ? Math.min(1, sessionWordCount / wordGoal) : undefined}
              isLowTime={isLowTime}
              goalReached={goalReached}
              size={76}
            >
              <span className={`font-mono text-lg sm:text-xl font-semibold tracking-tight ${isLowTime ? "text-danger" : goalReached ? "text-success" : "text-accent"}`}>
                {formatTime(timeLeft)}
              </span>
              {plan !== "free" && (
                <span className={`font-mono text-[9px] ${goalReached ? "text-success" : "text-text-dim"}`}>
                  {sessionWordCount}/{wordGoal}
                </span>
              )}
            </TimerRing>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs font-mono text-text-dim hidden sm:inline">
              {isSaving ? "Saving..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ""}
            </span>
            <div className="hidden sm:flex items-center gap-1">
              {(Object.entries(TEXT_SIZES) as [TextSize, { label: string; class: string }][]).map(
                ([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleTextSizeChange(key)}
                    className={`w-8 h-8 rounded text-sm font-mono transition-colors ${
                      settings.textSize === key ? "bg-accent/20 text-accent" : "text-text-dim hover:text-text-muted"
                    }`}
                  >
                    {value.label}
                  </button>
                )
              )}
            </div>
            {plan !== "free" ? (
              <button
                onClick={() => setShowDownload(true)}
                className="w-8 h-8 rounded text-sm font-mono text-text-dim hover:text-accent transition-colors flex items-center justify-center"
                title="Download file"
                aria-label="Download file"
              >
                &#8615;
              </button>
            ) : (
              <button
                className="w-8 h-8 rounded text-sm font-mono text-text-dim opacity-40 cursor-not-allowed flex items-center justify-center"
                title="Upgrade to Cloud to download files"
                aria-label="Download unavailable on free plan"
                disabled
              >
                &#8615;
              </button>
            )}
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

        {/* Page area — scrollable, current page always centered */}
        <div className="flex-1 overflow-auto flex items-start justify-center py-4 sm:py-12 px-2 sm:px-4">
          <div className="relative flex items-start justify-center">

            {/* Ghost of previous page — positioned to the left, doesn't affect centering */}
            {hasPrev && (
              <div
                className="a4-page paper-page ghost-page cursor-pointer hidden xl:block absolute right-full mr-8"
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

            {/* Current page — always centered */}
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

        {/* Ambient sound picker overlay */}
        {showSoundPicker && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center px-4 pb-20 sm:pb-0">
            <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm" onClick={() => setShowSoundPicker(false)} />
            <div className="relative w-full max-w-sm bg-bg-card border border-border rounded-xl p-5 sm:p-6 card-elevated fade-in">
              <h3 className="font-mono text-sm text-text-muted mb-4 text-center uppercase tracking-wider">Ambient Sounds</h3>
              {plan !== "free" ? (
                <div className="grid grid-cols-3 gap-2">
                  {AMBIENT_SOUNDS.map((sound) => (
                    <button
                      key={sound.id}
                      onClick={() => {
                        toggleAmbientSound(sound.id);
                        setShowSoundPicker(false);
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                        activeSound === sound.id
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-text-dim hover:border-accent hover:text-accent"
                      }`}
                    >
                      <span className="text-xl">{sound.icon}</span>
                      <span className="font-mono text-[10px]">{sound.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-text-dim text-sm mb-3">Ambient sounds help you focus while writing.</p>
                  <Link href="/#pricing" className="text-accent hover:underline font-mono text-sm" onClick={() => setShowSoundPicker(false)}>
                    Upgrade to Unlock
                  </Link>
                </div>
              )}
              {activeSound && plan !== "free" && (
                <button
                  onClick={() => { toggleAmbientSound(activeSound); setShowSoundPicker(false); }}
                  className="w-full mt-3 border border-border py-2 rounded font-mono text-xs text-text-dim hover:text-accent transition-colors"
                >
                  Stop Sound
                </button>
              )}
            </div>
          </div>
        )}

        {/* Goal reached celebration */}
        {goalReached && plan !== "free" && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[120] bg-success/90 text-white px-6 py-3 rounded-lg font-mono text-sm fade-in shadow-lg">
            Goal reached! {sessionWordCount}/{wordGoal} words
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 sm:px-8 py-3 border-t border-border/50 text-xs font-mono text-text-dim-extra">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">
              +{sessionWordCount}{plan !== "free" ? `/${wordGoal}` : ""} this session
            </span>
            <button
              onClick={() => setShowSoundPicker(!showSoundPicker)}
              className={`px-2 py-1 rounded transition-colors ${
                activeSound ? "text-accent" : plan === "free" ? "opacity-40" : "hover:text-accent"
              }`}
              title={plan === "free" ? "Upgrade for ambient sounds" : "Ambient sounds"}
            >
              {activeSound ? AMBIENT_SOUNDS.find(s => s.id === activeSound)?.icon || "\u{1F3B5}" : "\u{1F3B5}"}
            </button>
          </div>
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
          <span>{wordCount} words &middot; {charCount.toLocaleString()} characters</span>
        </div>
      </div>
    );
  }

  // ---- SESSION DONE SCREEN ----
  const stats = sessionStats;

  return (
    <div className="min-h-screen bg-bg paper-texture">
      <div className="max-w-xl mx-auto px-4 sm:px-8 py-12 sm:py-20 text-center fade-in">
        <div className="text-accent text-5xl sm:text-7xl mb-6">&#10003;</div>
        <h1 className="font-mono text-2xl sm:text-3xl mb-3">Session Complete</h1>
        <p className="text-text-muted text-base sm:text-lg mb-12 leading-relaxed">
          You stayed locked in and wrote. That&apos;s what matters.
        </p>

        {/* Stats card */}
        {stats && (
          <div className="border border-border rounded-xl p-6 sm:p-10 bg-bg-card card-elevated mb-8">
            <h2 className="font-mono text-sm sm:text-base text-text-muted mb-6 uppercase tracking-wider">
              Your Session
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8">
              <div>
                <div className="font-mono text-3xl sm:text-4xl text-accent">{stats.durationMinutes}</div>
                <div className="text-text-dim text-xs sm:text-sm mt-1">minutes</div>
              </div>
              <div>
                <div className="font-mono text-3xl sm:text-4xl text-accent">+{Math.max(0, stats.netWords)}</div>
                <div className="text-text-dim text-xs sm:text-sm mt-1">net words</div>
              </div>
              <div>
                <div className="font-mono text-3xl sm:text-4xl text-accent">{stats.totalPages}</div>
                <div className="text-text-dim text-xs sm:text-sm mt-1">total pages</div>
              </div>
            </div>

            <div className="border-t border-border pt-6 grid grid-cols-2 gap-2 sm:gap-4 text-left">
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

        {/* Streak & Habit */}
        <div className="border border-border rounded-lg p-5 sm:p-8 bg-bg-card card-elevated mb-8">
          {/* Streak display */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6">
            <div className="text-center">
              <div className="font-mono text-2xl sm:text-3xl text-accent">{streak.current}</div>
              <div className="text-text-dim text-xs mt-1">day streak</div>
            </div>
            <div className="text-border text-xl">|</div>
            <div className="text-center">
              <div className="font-mono text-2xl sm:text-3xl text-text-muted">{streak.longest}</div>
              <div className="text-text-dim text-xs mt-1">best streak</div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="font-mono text-sm text-text-muted mb-2 uppercase tracking-wider">
              Build Your Writing Habit
            </h2>

            {plan !== "free" ? (
              <>
                <p className="text-text-dim text-xs mb-6">
                  Pick your writing days, get reminded, or block your calendar.
                </p>

                {/* Day of week toggles */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6">
                  {DAY_LABELS.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const newDays = [...habit.days];
                        newDays[i] = !newDays[i];
                        setHabit({ ...habit, days: newDays });
                        setHabitSaved(false);
                      }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-mono text-xs sm:text-sm transition-colors ${
                        habit.days[i]
                          ? "bg-accent text-white"
                          : "border border-border text-text-dim hover:border-accent hover:text-accent"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                {/* Time picker */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <label className="text-xs text-text-dim font-mono">At</label>
                  <input
                    type="time"
                    value={habit.time}
                    onChange={(e) => {
                      setHabit({ ...habit, time: e.target.value });
                      setHabitSaved(false);
                    }}
                    className="bg-bg-input border border-border rounded px-3 py-2 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      saveWritingHabit({ ...habit, enabled: true });
                      setHabitSaved(true);
                    }}
                    disabled={!habit.days.some((d) => d)}
                    className="w-full bg-accent text-white py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors disabled:opacity-40"
                  >
                    {habitSaved ? "Schedule Saved!" : "Save Writing Schedule"}
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={downloadCalendarEvent}
                      disabled={!habit.days.some((d) => d)}
                      className="flex-1 border border-border py-2.5 rounded font-mono text-xs text-text-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
                    >
                      Add to Calendar
                    </button>
                    <button
                      onClick={sendHabitReminders}
                      disabled={!habit.days.some((d) => d) || !user?.email || reminderSending}
                      className="flex-1 border border-border py-2.5 rounded font-mono text-xs text-text-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
                    >
                      {reminderSending ? "Sending..." : reminderSent ? "Reminders Set!" : "Email Reminders"}
                    </button>
                  </div>

                  {reminderError && (
                    <p className="text-danger text-xs font-mono">{reminderError}</p>
                  )}

                  {!user && (
                    <p className="text-text-dim text-xs">
                      <Link href="/auth/signin" className="text-accent hover:underline">Sign in</Link>{" "}
                      for email reminders.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="text-text-dim text-sm mb-4 leading-relaxed">
                  Set recurring writing days, get email reminders, and block your calendar.
                </p>
                <Link
                  href="/#pricing"
                  className="inline-block border border-accent text-accent px-6 py-2.5 rounded font-mono text-sm hover:bg-accent hover:text-white transition-colors"
                >
                  Upgrade for Habit Tools
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Download popup */}
        {showDownload && (
          <DownloadPopup
            title={file.title}
            content={contentRef.current}
            onClose={() => setShowDownload(false)}
          />
        )}

        {/* Export & Sharing Tools */}
        <div className="border border-border rounded-xl p-5 sm:p-8 bg-bg-card card-elevated mb-8">
          <h2 className="font-mono text-sm text-text-muted mb-4 uppercase tracking-wider text-center">
            Share & Export
          </h2>

          {plan !== "free" ? (
            <div className="space-y-4">
              {/* Export buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const text = encodeURIComponent(contentRef.current);
                    window.open(`https://docs.google.com/document/create?title=${encodeURIComponent(file.title)}&body=${text.slice(0, 5000)}`, "_blank");
                  }}
                  className="border border-border rounded-lg px-4 py-3 font-mono text-xs sm:text-sm text-text-muted hover:border-accent hover:text-accent transition-colors text-center"
                >
                  Export to Google Docs
                </button>
                <button
                  onClick={() => {
                    // Copy content as Notion-compatible markdown to clipboard
                    const markdown = `# ${file.title}\n\n${contentRef.current}`;
                    navigator.clipboard.writeText(markdown).then(() => {
                      alert("Copied to clipboard! Paste into Notion.");
                    });
                  }}
                  className="border border-border rounded-lg px-4 py-3 font-mono text-xs sm:text-sm text-text-muted hover:border-accent hover:text-accent transition-colors text-center"
                >
                  Copy for Notion
                </button>
              </div>

              {/* Writing buddy */}
              <div className="border-t border-border pt-4">
                <h3 className="font-mono text-xs text-text-dim mb-3 uppercase tracking-wider">Writing Buddy</h3>
                <p className="text-text-dim text-xs mb-3 leading-relaxed">
                  Let a friend know you completed a session — for accountability. Your writing is never shared, only your stats.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={buddyEmail}
                    onChange={(e) => { setBuddyEmail(e.target.value); setBuddySaved(false); }}
                    placeholder="buddy@email.com"
                    className="flex-1 bg-bg-input border border-border rounded px-3 py-2 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => {
                      if (!buddyEmail.trim()) return;
                      // Save buddy email locally
                      localStorage.setItem("justwrite_buddy_email", buddyEmail.trim());
                      setBuddySaved(true);
                      // Share via email
                      const subject = encodeURIComponent(`I just wrote ${stats?.netWords ?? 0} words!`);
                      const body = encodeURIComponent(
                        `Hey! I just finished a ${stats?.durationMinutes ?? 0}-minute writing session on JustWrite.\n\n` +
                        `Words written: +${stats?.wordsAdded ?? 0}\n` +
                        `Net words: ${stats?.netWords ?? 0}\n` +
                        `Words per minute: ${stats?.wordsPerMinute ?? 0}\n\n` +
                        `Join me! https://justwrite.app`
                      );
                      window.open(`mailto:${buddyEmail.trim()}?subject=${subject}&body=${body}`, "_blank");
                    }}
                    disabled={!buddyEmail.trim()}
                    className="bg-accent text-white px-4 py-2 rounded font-mono text-sm hover:bg-accent-hover transition-colors disabled:opacity-40"
                  >
                    {buddySaved ? "Sent!" : "Share"}
                  </button>
                </div>
              </div>

              {/* Push notifications */}
              <div className="border-t border-border pt-4">
                <h3 className="font-mono text-xs text-text-dim mb-3 uppercase tracking-wider">Push Notifications</h3>
                {pushEnabled ? (
                  <p className="text-success font-mono text-xs">Notifications enabled. You&apos;ll be reminded at your scheduled time.</p>
                ) : (
                  <div>
                    <p className="text-text-dim text-xs mb-3 leading-relaxed">
                      Get a browser notification when it&apos;s time to write.
                    </p>
                    <button
                      onClick={requestPushPermission}
                      className="w-full border border-border py-2.5 rounded font-mono text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
                    >
                      Enable Push Notifications
                    </button>
                    {pushError && <p className="text-danger text-xs font-mono mt-2">{pushError}</p>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="opacity-30 blur-[1px] pointer-events-none select-none mb-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="border border-border rounded-lg px-4 py-3 font-mono text-xs text-text-dim">Export to Google Docs</div>
                  <div className="border border-border rounded-lg px-4 py-3 font-mono text-xs text-text-dim">Copy for Notion</div>
                </div>
                <div className="border border-border rounded-lg px-4 py-3 font-mono text-xs text-text-dim">Writing Buddy & Push Notifications</div>
              </div>
              <Link href="/#pricing" className="text-accent hover:underline font-mono text-sm">
                Upgrade for Export & Sharing Tools
              </Link>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setEditorState("setup")}
            className="w-full bg-accent text-white py-4 rounded font-mono text-base hover:bg-accent-hover transition-colors"
          >
            Write Again
          </button>
          {plan !== "free" ? (
            <button
              onClick={() => setShowDownload(true)}
              className="w-full border border-accent text-accent py-4 rounded font-mono text-base hover:bg-accent hover:text-white transition-colors"
            >
              Download
            </button>
          ) : (
            <Link
              href="/#pricing"
              className="w-full border border-border py-4 rounded font-mono text-base text-text-dim hover:border-accent hover:text-accent transition-colors block text-center"
            >
              Upgrade to Download Files
            </Link>
          )}
          <Link
            href="/dashboard"
            className="w-full border border-border py-4 rounded font-mono text-base hover:border-accent hover:text-accent transition-colors block text-center"
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
