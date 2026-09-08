import { isTauri } from "@tauri-apps/api/core";
import type { HabitRepository } from "../../domain/habits/HabitRepository";
import { TauriHabitRepository } from "./TauriHabitRepository";

export function createHabitRepository(): HabitRepository | null {
  return isTauri() ? new TauriHabitRepository() : null;
}
