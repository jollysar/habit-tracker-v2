import { isTauri } from "@tauri-apps/api/core";
import {
  cancelAll,
  isPermissionGranted,
  onAction,
  registerActionTypes,
  requestPermission,
  Schedule,
  sendNotification,
  type PermissionState,
} from "@tauri-apps/plugin-notification";
import type { PlannedNotification } from "../../application/notifications/buildNotificationPlan";

const COMPLETE_ACTION_TYPE = "habitree-habit-reminder";
const COMPLETE_ACTION = "complete-habit";

export interface NotificationAction {
  readonly actionId?: string;
  readonly notificationId?: number;
  readonly habitId?: string;
  readonly date?: string;
  readonly title?: string;
}

export async function notificationPermissionState(): Promise<PermissionState | "unsupported"> {
  if (!isTauri()) return "unsupported";
  return await isPermissionGranted() ? "granted" : "prompt";
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isTauri()) return false;
  if (await isPermissionGranted()) return true;
  return await requestPermission() === "granted";
}

export async function syncNativeNotifications(
  plan: readonly PlannedNotification[],
): Promise<void> {
  if (!isTauri() || !(await isPermissionGranted())) return;
  await cancelAll();
  if (plan.some((item) => item.canComplete)) {
    await registerActionTypes([{
      id: COMPLETE_ACTION_TYPE,
      actions: [{
        id: COMPLETE_ACTION,
        title: "Complete",
        foreground: true,
      }],
    }]);
  }
  for (const item of plan) {
    sendNotification({
      id: item.id,
      title: item.title,
      body: item.body,
      schedule: Schedule.at(item.at),
      actionTypeId: item.canComplete ? COMPLETE_ACTION_TYPE : undefined,
      group: "habitree",
      autoCancel: true,
      extra: {
        kind: item.kind,
        habitId: item.habitId ?? "",
        date: item.date ?? "",
      },
    });
  }
}

export async function listenForNotificationActions(
  callback: (action: NotificationAction) => void,
): Promise<() => void> {
  if (!isTauri()) return () => undefined;
  const listener = await onAction((payload) => {
    const value = payload as unknown as {
      actionId?: string;
      actionIdentifier?: string;
      extra?: Record<string, unknown>;
      notification?: {
        id?: number;
        title?: string;
        extra?: Record<string, unknown>;
      };
    };
    const extra = value.extra ?? value.notification?.extra;
    callback({
      actionId: value.actionId ?? value.actionIdentifier,
      notificationId: value.notification?.id,
      habitId: typeof extra?.habitId === "string" ? extra.habitId : undefined,
      date: typeof extra?.date === "string" ? extra.date : undefined,
      title: value.notification?.title,
    });
  });
  return () => listener.unregister();
}

export function showExternalCompletionConfirmation(habitName: string): void {
  if (!isTauri()) return;
  sendNotification({
    title: "Habit completed",
    body: `${habitName} is done. Your plant keeps growing.`,
    group: "habitree",
    autoCancel: true,
  });
}

export { COMPLETE_ACTION };
