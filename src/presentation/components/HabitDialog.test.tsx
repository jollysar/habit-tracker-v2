// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HabitDialog } from "./HabitDialog";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

function renderDialog() {
  render(
    <HabitDialog
      open
      categories={[]}
      defaultStartDate="2026-11-28"
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
}

describe("HabitDialog mobile form", () => {
  it("shows each tree once in a single transforming picker", () => {
    renderDialog();

    const picker = screen.getByRole("group", { name: "Choose your streak tree" });
    expect(within(picker).getAllByRole("button")).toHaveLength(3);
    expect(within(picker).getByRole("button", { name: "Choose Meadow oak" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(picker).getAllByText("Meadow oak")).toHaveLength(1);
  });

  it("keeps the reminder time present but disabled until reminders are enabled", async () => {
    const user = userEvent.setup();
    renderDialog();

    const toggle = screen.getByRole("checkbox", { name: "Enable reminder" });
    const time = screen.getByLabelText("Reminder time") as HTMLInputElement;
    expect(time.disabled).toBe(true);

    await user.click(toggle);
    expect(time.disabled).toBe(false);
  });

  it("reveals advanced fields inside the same section", async () => {
    const user = userEvent.setup();
    renderDialog();

    const trigger = screen.getByRole("button", { name: "Advanced details" });
    const section = trigger.closest("section");
    expect(section).not.toBeNull();
    expect(within(section!).queryByLabelText(/Description/)).toBeNull();

    await user.click(trigger);
    expect(within(section!).getByLabelText(/Description/)).not.toBeNull();
    expect(within(section!).getByLabelText(/Start date/)).not.toBeNull();
  });
});
