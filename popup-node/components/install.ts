type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallEvent | null = null;
let listening = false;

export function listenInstall() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
  });
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  const ios = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return ios || window.matchMedia("(display-mode: standalone)").matches;
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export async function promptInstall(): Promise<"prompted" | "ios" | "manual"> {
  if (deferred) {
    await deferred.prompt();
    deferred = null;
    return "prompted";
  }
  if (isIos()) return "ios";
  return "manual";
}
