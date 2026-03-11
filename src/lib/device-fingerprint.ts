// Simple device fingerprint based on browser characteristics
// Used to detect new device logins for verification

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 0,
    navigator.platform || "",
  ];

  // Simple hash
  const str = components.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

const KNOWN_DEVICES_KEY = "justwrite_known_devices";

export function getKnownDevices(userId: string): string[] {
  try {
    const stored = localStorage.getItem(`${KNOWN_DEVICES_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addKnownDevice(userId: string, fingerprint: string): void {
  const devices = getKnownDevices(userId);
  if (!devices.includes(fingerprint)) {
    devices.push(fingerprint);
    // Keep last 10 devices
    const trimmed = devices.slice(-10);
    localStorage.setItem(
      `${KNOWN_DEVICES_KEY}_${userId}`,
      JSON.stringify(trimmed)
    );
  }
}

export function isKnownDevice(userId: string): boolean {
  const fingerprint = getDeviceFingerprint();
  const devices = getKnownDevices(userId);
  return devices.includes(fingerprint);
}
