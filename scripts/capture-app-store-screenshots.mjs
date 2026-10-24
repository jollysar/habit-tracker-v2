import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const appUrl = process.env.HABITREE_SCREENSHOT_URL ?? "http://127.0.0.1:1421/";
const outputRoot = resolve("release/app-store/screenshots");
const debuggingPort = 9337;
const profileDirectory = await mkdtemp(join(tmpdir(), "habitree-screenshots-"));

const devices = [
  { id: "iphone", cssWidth: 402, cssHeight: 874, scale: 3 },
  { id: "iphone-duo", cssWidth: 669, cssHeight: 951, scale: 3 },
  { id: "ipad", cssWidth: 1032, cssHeight: 1376, scale: 2 },
];

const shots = [
  { id: "01-today-growing-streaks", section: "Today" },
  { id: "02-weekly-habits", section: "Week" },
  { id: "03-garden", section: "Analytics" },
  { id: "04-calendar-monthly-analytics", section: "Calendar" },
  { id: "05-patterns", section: "Analytics", scrollTo: "Patterns in your data" },
  { id: "06-private-local-first", section: "Settings", scrollTo: "Local by design", alignToTop: true },
];

const chrome = spawn(chromePath, [
  "--headless=new",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profileDirectory}`,
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-extensions",
  "--disable-sync",
  "--hide-scrollbars",
  "--metrics-recording-only",
  "--mute-audio",
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank",
], { stdio: "ignore" });

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitForDebugger() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }
  throw new Error("Chrome debugging endpoint did not become available.");
}

class CdpClient {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.socket = new WebSocket(webSocketUrl);
  }

  async connect() {
    await new Promise((resolveConnect, rejectConnect) => {
      this.socket.addEventListener("open", resolveConnect, { once: true });
      this.socket.addEventListener("error", rejectConnect, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      const listeners = this.events.get(message.method) ?? [];
      this.events.delete(message.method);
      listeners.forEach((listener) => listener(message.params));
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((resolveEvent) => {
      const listeners = this.events.get(method) ?? [];
      listeners.push(resolveEvent);
      this.events.set(method, listeners);
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function navigate(client, url) {
  const loaded = client.once("Page.loadEventFired");
  await client.send("Page.navigate", { url });
  await loaded;
  await delay(900);
}

async function clickButton(client, label) {
  const clicked = await evaluate(client, `(() => {
    const button = [...document.querySelectorAll("button")].find((candidate) =>
      candidate.getAttribute("aria-label") === ${JSON.stringify(label)} ||
      candidate.textContent?.trim() === ${JSON.stringify(label)}
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Could not find button: ${label}`);
  await delay(500);
}

async function scrollToText(client, text, alignToTop = false) {
  const found = await evaluate(client, `(() => {
    if (${JSON.stringify(alignToTop)}) {
      const spacer = document.createElement("div");
      spacer.setAttribute("aria-hidden", "true");
      spacer.style.height = "100vh";
      document.body.appendChild(spacer);
    }
    const element = [...document.querySelectorAll("h1, h2, h3, p")].find((candidate) =>
      candidate.textContent?.trim() === ${JSON.stringify(text)}
    );
    if (!element) return false;
    element.scrollIntoView({ block: "start" });
    window.scrollBy(0, -24);
    return true;
  })()`);
  if (!found) throw new Error(`Could not find content: ${text}`);
  await delay(350);
}

try {
  await mkdir(outputRoot, { recursive: true });
  await waitForDebugger();
  const targetResponse = await fetch(
    `http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent(appUrl)}`,
    { method: "PUT" },
  );
  const target = await targetResponse.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  for (const device of devices) {
    const deviceDirectory = join(outputRoot, device.id);
    await mkdir(deviceDirectory, { recursive: true });
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: device.cssWidth,
      height: device.cssHeight,
      deviceScaleFactor: device.scale,
      mobile: true,
      screenWidth: device.cssWidth,
      screenHeight: device.cssHeight,
      positionX: 0,
      positionY: 0,
      screenOrientation: { type: "portraitPrimary", angle: 0 },
    });
    await client.send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-color-scheme", value: "light" },
        { name: "prefers-reduced-motion", value: "reduce" },
      ],
    });

    for (const shot of shots) {
      await navigate(client, appUrl);
      await evaluate(client, `(() => {
        localStorage.setItem("habit-tracker-theme", "light");
        localStorage.setItem("habit-tracker-tone", "green");
        document.documentElement.classList.remove("dark");
        document.documentElement.dataset.tone = "green";
        window.scrollTo(0, 0);
      })()`);
      if (shot.section !== "Today") await clickButton(client, shot.section);
      if (shot.action === "weekly") await clickButton(client, "Weekly habits");
      if (shot.scrollTo) await scrollToText(client, shot.scrollTo, shot.alignToTop);
      const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false,
      });
      await writeFile(join(deviceDirectory, `${shot.id}.png`), Buffer.from(screenshot.data, "base64"));
    }
  }

  client.close();
} finally {
  const closed = new Promise((resolveClose) => chrome.once("exit", resolveClose));
  chrome.kill("SIGTERM");
  await Promise.race([closed, delay(10_000)]);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(profileDirectory, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      await delay(500);
    }
  }
}
