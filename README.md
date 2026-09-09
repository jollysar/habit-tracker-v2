# Habitree

A local-first desktop habit tracker built with Tauri 2, React, TypeScript,
Tailwind CSS, and SQLite.

## Supported toolchain

- Node.js 24.19.0
- npm 11.17.0
- Rust 1.98.0

Node and Rust versions are pinned in `.nvmrc` and `rust-toolchain.toml`.

## Clean-machine setup

Install the platform prerequisites for Tauri 2 first. On macOS this includes
Xcode Command Line Tools. Windows requires Microsoft C++ Build Tools and
WebView2.

From a fresh checkout:

```bash
nvm install
nvm use
npm install --global npm@11.17.0
npm ci
npm run check
npm run tauri dev
```

If `nvm` is unavailable, install the Node version listed in `.nvmrc` using
your preferred version manager. Rustup automatically selects the pinned Rust
toolchain when commands are run from this directory.

## Verification

Run the complete local verification suite with:

```bash
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
```

This runs the frontend unit tests, TypeScript/Vite production build, and Rust
compiler checks. Rust tests separately cover native backup validation. The
frontend suite includes fresh/upgrade migration tests, real SQLite repository
integration tests, and keyboard-accessibility regression tests.

The same commands run on clean macOS and Windows workers in GitHub Actions.

## Keyboard navigation

- `Command/Ctrl + N`: open the new-habit flow without changing scroll position.
- `Alt + 1` through `Alt + 6`: move between Today, Habits, Week, Calendar,
  Analytics, and Settings.
- Arrow keys, Home, and End: move through Daily/Weekly tabs.
- Arrow keys: move through the Home date picker and open habit action menus.
- `Escape`: close an open menu, date picker, or dialog and restore focus.
- `Tab` and `Shift + Tab`: move through controls; modal dialogs contain focus
  until closed.

## Data architecture

- React calls the `HabitRepository` contract rather than issuing SQL.
- `TauriHabitRepository` is the only frontend module that communicates with
  the official Tauri SQL plugin.
- The SQLite database is stored in the operating system's application-config
  directory as `habit-tracker.db`.
- Versioned migrations live in `src-tauri/migrations` and are registered in
  `src-tauri/src/lib.rs`.
- Completion history is the source of truth. Streaks and percentages are
  derived rather than stored.
- UI deletion archives a habit and retains its completion history.

Never edit a migration after it has been used. Add a new numbered migration
for every schema change.

## Roadmap

See [`HABIT_TRACKER_PROJECT_ROADMAP.md`](./HABIT_TRACKER_PROJECT_ROADMAP.md)
for release phases, scope boundaries and exit criteria.
