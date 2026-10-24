import { useState } from "react";
import { Bell, Check, ShieldCheck } from "lucide-react";
import { Button } from "./ui/Button";
import { useDialogFocus } from "../hooks/useDialogFocus";

interface NotificationOnboardingDialogProps {
  readonly open: boolean;
  readonly onEnable: () => Promise<boolean>;
  readonly onNotNow: () => void;
}

export function NotificationOnboardingDialog({
  open,
  onEnable,
  onNotNow,
}: NotificationOnboardingDialogProps) {
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const dialogRef = useDialogFocus<HTMLElement>(open, onNotNow);

  if (!open) return null;

  const enable = async () => {
    setBusy(true);
    setPermissionDenied(false);
    const enabled = await onEnable();
    setBusy(false);
    if (!enabled) setPermissionDenied(true);
  };

  return (
    <div className="mobile-dialog-layer fixed inset-0 z-[95] flex h-[100dvh] items-end justify-center bg-ink-950/45 backdrop-blur-[2px] sm:grid sm:place-items-center sm:p-4">
      <section
        ref={dialogRef}
        className="w-full max-w-md rounded-t-[2rem] border border-line bg-surface px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 shadow-2xl sm:rounded-[2rem] sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-onboarding-title"
        tabIndex={-1}
      >
        <span className="grid size-12 place-items-center rounded-full bg-leaf-100 text-leaf-700">
          <Bell size={23} aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Stay gently on track</p>
        <h2 id="notification-onboarding-title" className="mt-1 text-2xl font-bold tracking-[-0.035em]">
          Would you like reminders?
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-600">
          Habitree can send calm, local reminders for unfinished habits and a short weekly summary.
        </p>
        <ul className="mt-5 space-y-3 text-sm text-ink-800">
          <li className="flex items-center gap-3"><Check className="text-leaf-600" size={17} />Habit reminders stop after completion</li>
          <li className="flex items-center gap-3"><Check className="text-leaf-600" size={17} />Quiet hours are respected</li>
          <li className="flex items-center gap-3"><ShieldCheck className="text-leaf-600" size={17} />Everything stays on this device</li>
        </ul>
        {permissionDenied && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700 dark:bg-red-950/30 dark:text-red-300" role="alert">
            Notifications were not enabled. You can allow them later in your iPhone Settings.
          </p>
        )}
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={onNotNow}>Not now</Button>
          <Button data-dialog-autofocus disabled={busy} onClick={() => void enable()}>
            {busy ? "Requesting…" : "Turn on reminders"}
          </Button>
        </div>
      </section>
    </div>
  );
}
