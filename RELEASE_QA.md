# Habitree release QA

Use this list on the exact archive intended for TestFlight. Test at minimum on one notched iPhone, one non-notched or compact iPhone simulator, and one iPad size.

## Automated release gate

- [x] Frontend unit and integration tests pass.
- [x] TypeScript and production web build pass.
- [x] Rust checks and native tests pass.
- [x] JavaScript dependency audit reports no vulnerability.
- [x] Rust audit exception is reviewed and does not enter the compiled Apple graph.
- [x] iOS privacy manifest and Info.plist parse successfully.
- [x] Every iOS icon is opaque, including the 1024×1024 App Store icon.
- [x] iPhone and iPad are enabled in the Apple target.
- [x] Unsigned Apple Silicon simulator bundle builds successfully.
- [x] Unsigned arm64 iPhone/iPad device archive builds successfully.
- [x] iPhone 17 Pro simulator launches and respects the notch, status bar, and home indicator.
- [x] iPad (A16) simulator launches with reachable navigation and no system-UI collision.
- [ ] Final signed archive validates in Xcode Organizer.

## iPhone and iPad smoke test

- [ ] First launch fits below the status bar and above the home indicator.
- [ ] Today, Week, Calendar, Analytics, and Settings fit without clipped content.
- [ ] Portrait and landscape behave correctly on iPad; supported iPhone orientations do not overlap system UI.
- [ ] Dynamic Type at the largest accessibility size keeps primary actions usable.
- [ ] VoiceOver announces every tab, habit, completion control, progress indicator, and dialog action clearly.
- [ ] Reduce Motion removes non-essential motion without hiding state changes.
- [ ] Light and dark appearance follow the system by default.

## Core behaviour

- [ ] Create one daily habit and one weekly numeric habit; edit each and choose each tree type.
- [ ] Complete, undo, and re-complete a habit; progress and tree stage animate and remain correct after relaunch.
- [ ] Swipe left on a habit to reveal Delete; cancel once and delete once.
- [ ] Long-press a habit; the menu appears above surrounding rows and each action works.
- [ ] Swipe the page right to the previous day; the transition is smooth and previous dates fit on one line.
- [ ] Verify the current day, previous day, week, calendar, analytics, and settings all show consistent data.
- [ ] Archive/delete behaviour does not show removed habits in active lists.

## Notifications and data safety

- [ ] Deny notification permission first; the app remains usable and explains how to enable it later.
- [ ] Enable reminders and verify a notification appears at the selected time.
- [ ] Complete from a notification action, if offered, and verify the app reflects it.
- [ ] Confirm quiet hours, end-of-day, weekly progress, weekly summary, fresh-start, inactivity, and daily-summary rules do not duplicate or fire after completion.
- [ ] Export a backup, inspect the confirmation, restore it, and verify habit/history counts.
- [ ] Attempt to restore an invalid file; the app rejects it without losing existing data.
- [ ] Delete the app after making a separate backup, reinstall, and confirm the local-first/no-account expectation.

## App Store submission gate

- [ ] Privacy and support URLs are publicly reachable over HTTPS.
- [ ] App Store privacy answers match the submitted archive's SDK privacy report.
- [ ] Screenshots represent the shipping build and all required iPhone/iPad sizes.
- [ ] Seller contact, age rating, category, DSA trader status, pricing, and availability are complete.
- [ ] App name/trademark clearance is resolved before submission.
