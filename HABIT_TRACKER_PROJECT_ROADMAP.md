# Habitree Project Roadmap

## Purpose

This document is working context for AI coding agents and contributors building the Habit Tracker from its current local desktop state to public desktop and mobile releases.

## Current application

- Product: local-first habit tracker; not a general to-do app.
- Codebase: Tauri 2, React, TypeScript, Tailwind CSS, Rust, SQLite.
- Current desktop storage: local SQLite database through Tauri SQL plugin.
- Existing features:
  - habits, categories, schedules, completion history and partial progress;
  - streaks, Today, Week, Calendar and Analytics views;
  - export, backup and restore;
  - themes and local settings.
- Existing architecture:
  - domain/application logic is separated from persistence through `HabitRepository`;
  - SQLite migrations are versioned;
  - completion history is the source of truth for derived metrics.
- Existing tests: business-rule unit tests and Rust backup-validation tests.

## Current gaps

- Git repository and GitHub remote backup are established.
- No accounts, backend, authentication, cloud data or sync.
- No generated iOS or Android projects.
- No reminder UI or notifications implementation.
- No release automation, crash reporting or product analytics.
- No store metadata, privacy policy, support workflow or account-deletion flow.
- No end-to-end, cross-device or mobile-device test coverage.
- JavaScript verification must be made reliable on a clean machine before release work continues.

## Version 1 scope

### Include

- Habits only.
- Local-first offline use.
- macOS, Windows, iOS and Android builds.
- Secure user accounts.
- Cross-device cloud sync.
- Local reminders/notifications.
- Export, backup, restore and account deletion.
- Closed beta before public launch.

### Exclude until after beta

- General to-do tasks.
- Subscriptions/payments.
- Social or shared habits.
- AI coaching.
- Wearables, widgets and third-party integrations.
- Linux release.

### Scope rule

Do not add task management to version 1 without explicitly revising the roadmap. A separate task model, UI, recurrence system, sync semantics and tests would add roughly 4 to 8 weeks.

## Architecture decision

Keep the existing Tauri + React + TypeScript codebase. Do not rewrite in Flutter or React Native unless the mobile feasibility phase identifies a critical blocker.

Target architecture:

```text
React UI
  -> application and domain logic
  -> local SQLite database on each device
  <-> synchronization layer
  <-> hosted backend for authentication and user-owned data
```

### Sync requirements

- Local SQLite remains the immediate data source on every device.
- The app must remain usable offline.
- Sync must use authenticated, user-owned remote records.
- Every synced entity needs stable IDs, user ownership, modification metadata and deletion handling.
- Use a mutation queue/outbox, incremental pull/push, retries and deterministic conflict rules.
- Existing local data must migrate safely when a user first signs in.
- Do not expose direct hosted-database credentials in the client.

### Suggested backend

Use Supabase for version 1 unless a later requirement makes it unsuitable:

- authentication;
- hosted PostgreSQL;
- row-level security;
- password recovery;
- backups;
- account deletion support.

## Delivery sequence

| Phase | Target timing | Goal | Required exit criteria |
|---|---|---|---|
| 1. Protect and baseline | Week 1 | Protect the code and make verification repeatable. | Git repository and remote backup exist; a clean machine can install, test and build. |
| 2. Desktop MVP hardening | Weeks 2-4 | Make the offline app dependable for daily use. | No known data-loss path; backup/restore and migrations are tested. |
| 3. Mobile feasibility | Weeks 5-6 | Prove the existing codebase runs on iOS and Android. | SQLite and core repository operations work on real iPhone and Android devices. |
| 4. Accounts and sync | Weeks 7-13 | Add secure accounts and local-first cloud sync. | One user can safely use two devices, including offline and interrupted-sync cases. |
| 5. Mobile product work | Weeks 14-18 | Make the UI genuinely phone-ready. | Mobile navigation, touch, safe areas and reminders are complete. |
| 6. Release engineering and QA | Weeks 19-22 | Produce monitorable, installable builds. | Signed builds, privacy material, release process and test coverage are ready. |
| 7. Closed beta | Weeks 23-26 | Validate with real users. | No known data-loss or critical sync defects; store material is complete. |
| 8. Staged launch | Weeks 27-30 | Public release and post-launch monitoring. | Apps are released gradually and the first maintenance-release plan exists. |

## Phase tasks

### Phase 1: Protect and baseline

Status as of 9 September 2026:

- Local Git repository initialized on `main`; the baseline is committed and pushed to GitHub.
- Clean `npm ci`, frontend tests/build, Rust check and Rust tests pass locally.
- Node, npm and Rust versions are pinned and documented.
- macOS/Windows verification workflow and fresh/upgrade migration tests are added.
- The first macOS/Windows CI run completed successfully; repository visibility is currently public by owner choice.

- Initialize Git in the project directory.
- Create a private remote repository and confirm restore access.
- Add project setup instructions.
- Pin supported Node, Rust and package-manager versions.
- Make these checks run locally and in CI:
  - unit tests;
  - TypeScript type check;
  - production frontend build;
  - Rust check/tests.
- Add migration tests against fresh and upgraded databases.

### Phase 2: Desktop MVP hardening

Status as of 9 September 2026:

- SQLite repository integration coverage exercises habit lifecycle, ordering, schedule versioning, history, partial progress, streaks, settings and starter-data idempotence against a migrated in-memory database.
- Keyboard and accessibility hardening includes skip navigation, visible focus, modal focus containment/restoration, non-conflicting section shortcuts, keyboard tabs, calendar navigation, menu navigation and progress semantics.
- Product identity is finalized as Habitree, with bundle identifier `com.jollysar.habitree`, author metadata, platform icon sets and a non-destructive legacy data migration.
- Production security now includes a restrictive CSP, frozen JavaScript prototypes, local-only least-privilege SQL capabilities, trusted native file selection and removal of unused opener/dialog webview permissions.
- Daily-use validation is underway and current performance is accepted by the owner.

- Use the app daily for at least two weeks.
- Test schedules, streaks, archive, export, backup and restore.
- Test date boundaries, timezone changes and daylight saving.
- Add repository integration tests.
- Improve accessibility and keyboard support.
- Finalize app name, bundle identifier, author metadata and icons.
- Replace permissive development security settings with production-safe configuration.

### Phase 3: Mobile feasibility

Status as of 11 September 2026:

- Tauri iOS and Android projects are initialized from the production Habitree configuration.
- Both generated projects use the product name `Habitree` and identifier `com.jollysar.habitree`.
- The local toolchain includes Xcode 26.6, an iOS 26.5 simulator runtime, CocoaPods 1.17, Android Studio Quail 4, Android SDK 37, NDK 30 and all required Rust mobile targets.
- Android API 37 and iOS 26.5 simulator builds launch successfully and run the production React and SQLite repository stack.
- All seven SQLx migrations apply successfully on clean Android and iOS app containers.
- On both simulators, a habit created and completed through the UI remains completed after the app is terminated and relaunched.
- Simulator testing found no blocker in the current repository abstraction; physical-device, responsive-layout, touch, safe-area and authentication-callback validation remain before Phase 3 can close.
- Apple signing is intentionally unconfigured until physical-device validation and release engineering.

- Build and run on at least one real iPhone and Android device.
- Confirm SQLite migrations run correctly on both platforms.
- Confirm the current repository works on mobile.
- Identify desktop-only APIs and provide mobile alternatives.
- Validate small-screen layouts, touch controls, safe areas and auth callback feasibility.

### Phase 4: Accounts and sync

- Add authentication: sign up, sign in, sign out, password recovery and session expiry handling.
- Add remote schema for habits, schedules, completions, progress, categories and settings.
- Add `user_id`, modification version/timestamp and deletion metadata to synchronized data.
- Build local mutation queue and sync status UI.
- Build incremental pull, push, retry and duplicate protection.
- Define and test conflict rules before implementation.
- Migrate existing local data on first sign-in.
- Add export, account deletion and backend deletion workflows.
- Consolidate sync-relevant settings currently stored outside SQLite.

### Phase 5: Mobile product work

- Replace desktop navigation with mobile-first navigation.
- Replace wide weekly/table layouts with mobile views.
- Remove or replace desktop-only keyboard affordances.
- Handle mobile keyboard, safe areas, back navigation and app backgrounding.
- Add local notification permissions and reminder scheduling.
- Test text scaling, dark mode, touch targets and screen readers.

### Phase 6: Release engineering and QA

- Configure macOS signing and notarization.
- Prepare Windows Store package.
- Configure App Store Connect and iOS signing.
- Configure Google Play signing and closed-test track.
- Add crash reporting and privacy-safe analytics.
- Add automated versioning, builds and release notes.
- Test clean installs, upgrades, migration failures, offline use, sync failures, account deletion and recovery.
- Create privacy policy, support email, help content, store descriptions and screenshots.

### Phase 7: Closed beta

- Recruit 20 to 40 testers.
- Start with a small internal tester group.
- Use TestFlight for iOS.
- Use Google Play closed testing for Android.
- New personal Google Play accounts require at least 12 testers opted in continuously for 14 days before production access.
- Record, prioritize and fix issues affecting retention, clarity, data integrity or sync.

### Phase 8: Staged launch

- Submit iOS/macOS, Android and Windows store releases.
- Use staged rollout where available.
- Monitor crashes, account creation, sync failures, reviews and support requests daily.
- Plan and release the first maintenance update quickly.

## Test matrix

Before public launch, verify:

- Fresh install on macOS, Windows, iPhone and Android.
- Upgrade from every released database version.
- Backup and restore.
- CSV and JSON export.
- Offline operation and reconnection.
- Interrupted sync and retry.
- Same record changed on two devices.
- Timezone changes and daylight saving.
- Account recovery, logout and deletion.
- Large histories and archived habits.
- Keyboard, screen reader, dark mode and text-size accessibility.

## Budget assumptions (AUD)

| Item | Estimate |
|---|---:|
| Apple Developer Program | Budget A$149/year |
| Google Play account | About A$35 once |
| Microsoft Store account | A$0 |
| Supabase development | A$0/month |
| Supabase production | About A$35/month |
| Domain | A$20-A$40/year |
| Hosting | A$0-A$20/month |
| Email, analytics, crash reporting | A$0-A$60/month initially |
| Lean pre-launch cash cost | A$250-A$600 |
| Lean first-year cash cost | A$600-A$1,200 |

## Planning assumptions

- Solo developer working 15 to 20 focused hours per week.
- Recommended combined-launch timeline: 24 to 32 weeks.
- Target public launch: March to April 2027.
- At 8 to 10 hours per week, expect 9 to 12 months instead.

## Immediate next actions

1. Create Git version control and a remote backup.
2. Make the full JavaScript and Rust verification suite reliable on a clean machine.
3. Confirm version 1 excludes general to-do tasks.
4. Run the two-week mobile feasibility phase.
5. Begin account and sync work only after mobile feasibility succeeds.

## Agent instructions

When making changes to this project:

- Preserve the local-first design.
- Do not replace Tauri, React, TypeScript or SQLite without an explicit architecture decision.
- Keep business logic independent of UI and persistence details.
- Add a new migration for every schema change; never modify an already-used migration.
- Add or update tests for every scheduling, sync or data-integrity change.
- Prefer backward-compatible changes and verify upgrades from existing user data.
- Treat backups, exports, deletion and sync failures as release-blocking areas.
- Do not introduce cloud sync by replacing local SQLite with network-only storage.
