# Production security audit

**Reviewed:** 5 October 2026  
**Release scope:** Habitree 0.1.0, with iOS as the first store target

## Outcome

Habitree's compiled iOS and macOS dependency graphs have no known RustSec vulnerability. The JavaScript audit reports no known vulnerability in production or development dependencies. No high-confidence credential or private-key pattern was found in tracked source.

## Checks completed

- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- `cargo audit --file src-tauri/Cargo.lock`: one explicitly reviewed lockfile-only advisory, with no affected package in the app's target dependency graph.
- Dependency graph review for `aarch64-apple-ios` and `aarch64-apple-darwin`.
- Review of Tauri capabilities, CSP, native file operations, notification and haptics permissions.
- Review for remote analytics, advertising, tracking, and application network requests.
- High-confidence secret-pattern scan of tracked source.
- Apple privacy manifest, export-compliance declaration, and opaque icon validation.

## RustSec exception

`RUSTSEC-2023-0071` affects `rsa 0.9.10`, for which RustSec lists no fixed release. Cargo retains it through unused `sqlx-postgres` lockfile metadata. Habitree enables only `tauri-plugin-sql`'s `sqlite` feature; `cargo tree` confirms that `rsa` and `sqlx-postgres` are absent from the iOS, macOS, and all-target resolved dependency graphs. Habitree does not perform RSA operations. The advisory is therefore ignored in `.cargo/audit.toml`, with this rationale recorded for future review.

## Privacy and platform posture

- Habit data remains in the local SQLite database.
- The production CSP blocks remote connections, framing, objects, and forms.
- No ad, analytics, account, tracking, or remote sync SDK is included.
- Backup and restore paths are chosen by trusted native dialogs.
- Notification scheduling uses the operating system and is user-controlled.
- The iOS privacy manifest declares no tracking or collected data and documents required-reason access to app preferences and file timestamps.
- The iOS bundle declares that it does not use non-exempt encryption.

## Release controls

Re-run both dependency audits and review the privacy answers before every store submission, and whenever adding networking, authentication, cloud sync, analytics, advertising, crash reporting, encryption, or another native SDK.
