# Worklog

### May 17, 2026
- Fixed priority buttons in minimal mode to have black font color for better readability.
- Added the ability to fail tasks, excluding them from open/upcoming views and visually rendering them as failed in red.
- Prevented completing tasks that have already been failed (must unfail them first).
- Added fail action button directly to the Tasks page list cards and the Task Details panel.
- Hidden the 'Blocked' badge on tasks if they are already failed.

### May 18 - 19, 2026
- Added visual cues for completed (green dot with checkmark SVG) and failed (red dot with cross SVG) tasks inside the monthly Calendar day cells.
- Upgraded the selected day's task list in the Calendar sidebar to high-fidelity interactive task cards containing complete/fail actions, priority labels, and status-coded border/background tints.
- Implemented dynamic titles ("Unfail task" vs "Fail task") and distinct styling (vibrant red state) for the failed task buttons across the Workspace, Calendar, and Task List views.
- Fixed the missing border color accents for completed (#10b981) and failed (#ef4444) task cards in the Minimalist profile under both light and dark modes.
- Created an interactive floating Plus button and popover menu at the bottom of Workspace pages, allowing users to dynamically insert all 6 block types (Task, Note, Checklist, Code, Link, Image) inline with full state transitions and dynamic file picking.
- Introduced a new 'Title Block' (Heading) type that allows partitioning workspace pages with custom section headers, complete with block draggable support, visual border-rail mapping, and an elegant header input UI.
- Removed the redundant 'Schedule' inputs section from the Task Details side panel since the primary Deadline date-time selector fulfills all task scheduling needs.
- Restructured the Task Details side panel so that every single input and selector field has an explicit, bold heading label (Title, Notes, Priority, Deadline, Repeat, Interval, Reminder, Subtasks, and Dependencies).
- Switched the Task Details panel to a full-width vertical stacked form layout, eliminating side-by-side grids to guarantee wide input fields like the browser-native 'Deadline' date-time picker never experience horizontal container overflow.
- Fully integrated the 'Title Block' (Heading) action across the entire workspace interface, adding a quick-access 'Heading' shortcut button to the Topbar layout and registering a '/heading' shortcut inside the slash Command Palette menu.
- Rendered subtasks inline inside the primary Workspace TaskBlock cards, featuring a progress counts dashboard, checklist toggles, text rename inputs, hover delete options, and a quick "+ Subtask" controls button.
- Added intelligent automatic task incomplete logic: if a parent task is completed but any of its subtasks are unchecked, the parent task is automatically marked incomplete with full recurrence, DB sync, and undo state transitions.
- Implemented a premium minimal visual color cue for checked items in Checklist blocks, dimming completed item backgrounds, softening border colors, reducing opacity to 70%, and applying a distinct text strikethrough.
- Created an intelligent dynamic 'Scroll to Top/Bottom' floating action button at the bottom-right of the window that automatically fades in when a page is scrollable, displaying a down arrow in the top half (scrolling instantly to the bottom) and transforming into an up arrow in the bottom half (scrolling smoothly to the top). The button is custom-styled to fit each design profile perfectly, using a sleek rounded white-slate thin border and soft shadow in the Minimal profile, and a bold yellow heavy-outline design in the Neo-Brutalist profile.
- Customized the floating 'Scroll' button to display a premium vibrant blue color (#21caff) with solid black text and outline borders in Dark Mode under the Neo-Brutalist profile, enhancing neon-brutalist contrast and punchiness.
- Removed the thick colored left border accent from the right sidebar on the Calendar page to ensure it displays a clean, plain black border in the default Neo-Brutalist profile, and added CSS overrides to neutralize any left rail styling in the Minimalist profile for a uniform, plain 1px border. Also removed the status and priority colored borders from the individual task items rendered inside that sidebar.
- Added a per-page **Block Archiving** feature. Users can now click the "Archive" button on any block to hide it from the active page view. Archived blocks are sent to an expandable "Archived Blocks" accordion section at the bottom of the page workspace, where they can be unarchived or deleted. As requested, archived tasks remain visible and fully functional within the global Calendar, Tasks, and Insights views.
- Updated the **Add Block** floating button at the end of a page to dynamically switch its background color from neon green (`#2ef2a6`) to neon blue (`#21caff`) when closed under Dark Mode in the Neo-Brutalist design profile, enhancing visual harmony and matching other dark mode controls.

### May 20, 2026
- Fixed **aggressive sync reversion** where updating a block, checking a task, or deleting a block would sometimes be reversed by the sync system pulling stale remote data back over fresh local changes. Root causes addressed:
  - `processQueue` now returns the set of entity IDs it just pushed, and `pullRemote` skips those IDs to prevent stale-overwrite-after-push races.
  - `pullEntity` now skips any entity with pending local changes (not just newer ones) and only overwrites local when the remote timestamp is strictly newer.
  - `syncDbUpdates` replaced blind full-state replacement with a **merge-based approach** that compares `updatedAt` timestamps per entity, keeping whichever version is newer between in-memory Zustand state and IndexedDB.
  - `enqueueMutation` now **coalesces duplicate queue entries** for the same entity, updating the existing pending entry in place instead of adding duplicates during rapid edits.
  - `mirrorExistingData` now checks for existing pending queue entries before enqueuing, preventing duplicate sync operations.
  - The `syncDbUpdates` trigger in `App.jsx` is now **debounced by 300ms** to prevent rapid sync cycles from triggering multiple full-state reloads.
- Fixed **recurring task subtasks carrying over checked state**: when a recurring task with subtasks is completed and the next instance is created, all subtasks are now reset to uncompleted instead of inheriting the parent's checked state.
- Fixed **duplicate recurring tasks on re-check**: toggling a recurring task off and back on no longer creates a duplicate next-day instance. The system now checks if a matching recurring instance (same title, deadline, recurrence) already exists before creating a new one.
- Added **Cut & Paste blocks between pages**: users can now move any block from one page to another using a cut-and-paste workflow.
  - Added a ✂️ Cut (Scissors) button to the action bar of all block types (notes, tasks, checklists, code, links, images).
  - Cutting a block stores it in an in-memory clipboard without removing it from the page.
  - A **paste banner** appears at the bottom of the workspace showing the clipboard contents, with a "Paste here" button (when on a different page) or a hint to navigate to another page (when on the same page).
  - Pasting moves the block to the target page, recalculates its order, persists the change to IndexedDB and the sync queue, and clears the clipboard.
  - A cancel (✕) button allows clearing the clipboard without pasting.

### May 22, 2026
- Fixed the layout of the weather widget to prevent text overflow on smaller screens (like tablets) and narrow viewports. Added a new media query for `@media (max-width: 1200px)` that stacks the time, date, and weather metadata vertically (`flex-direction: column` and `align-items: flex-start`), downscales the font sizes of the clock (`2.25rem`) and temperature (`2rem`), and optimizes the meta section layout.
- Fixed horizontal layout/text overflow in the weather/time widget on 16-inch laptop screens (or standard high-DPI laptop displays) by raising the responsive stacked-layout media query breakpoint from `@media (max-width: 1200px)` to `@media (max-width: 1600px)` in `index.css`. This ensures that on all standard desktop/laptop viewports with lateral sidebars visible, the weather elements stack vertically and scale their font sizes dynamically to fit cleanly without overflowing. Also slightly downscaled default unstacked font sizes to `2.75rem` for `weather-time` and `2.25rem` for `weather-temp` to provide a premium, spacious layout on larger monitors.
- Cleaned up pre-existing invalid CSS `:contains()` pseudo-class selectors on the Recovery section. Added a clean, standard `.recovery-card` class selector in `InsightsView.jsx` and `index.css`, successfully eliminating all lightningcss optimization and build warnings.
- Restricted the image block zoom functionality to exclusively trigger on `Shift + scroll` wheel events (removing standard scroll, `Ctrl + scroll`, and `Alt + scroll` zoom triggers).
- Updated the helper badge/legend in the image block to read: `"Scroll with Shift to zoom. Drag to pan."`
- Added a red-accented "Failed" count Metric card to the top stats grid of the Insights view to display the total number of failed tasks, while keeping the main dashboard layout focused on the Workspace Settings (span-5) and Recovery (span-7) sections.
- Replaced the "no-date" and "high" filter buttons on the Tasks page with a new "failed" filter button, and added full support for this filter in the `taskMatchesFilter` helper so users can view all failed tasks instantly in the Tasks page.
- Implemented an instant theme transition by adding a global `disable-transitions` class that momentarily suppresses all CSS transitions when switching between light and dark modes or changing color profiles, removing the jarring color fade while preserving smooth interactive hover effects during normal use.
- Upgraded the Cut & Paste functionality to support **multiple blocks**. Clicking "Cut" on multiple blocks now adds them to a multi-block clipboard array, and the paste banner dynamically updates to show how many blocks are selected. Pasting drops all selected blocks into the new page simultaneously while maintaining sequential ordering.
- Implemented a visual cue for cut blocks: blocks in the clipboard now render with an elegant, responsive dashed border and 55% reduced opacity (with smooth transitions), clearly indicating their cut state before they are pasted onto another page or cleared.
- Performed a comprehensive **codebase cleanup**, removing ~750 lines of dead/redundant code and reducing the CSS bundle by 14.5 kB (~15%):
  - **Removed the unused Neon Glow design profile**: deleted the entire `glow-profile.css` file (547 lines), removed the `@import` from `index.css`, cleaned all JS references from `App.jsx` (dark mode override, classList.remove), `AuthPage.jsx` (classList.remove), and `Sidebar.jsx` (removed the `colorProfile !== "glow"` conditional that hid the theme toggle).
  - **Removed dead `TaskImageAttachment` component** from `modals/index.jsx` (~67 lines) — was never rendered anywhere, and had broken imports (`useEffect`, `Image`, `getTaskImageUrl` not imported).
  - **Removed dead `Notice` component** from `ui/index.jsx` — was never imported anywhere in the app.
  - **Removed unused utility functions**: `printPagePdf` and `escapeHtml` from `helpers.js` (never imported), `extractInternalLinks` from `helpers.js` (never imported), `extractUuid` from `ids.js` (never imported), `getTaskImageUrl` from `imageUploadService.js` (only referenced from dead component).
  - **Fixed duplicate `isToday`** in `helpers.js` — replaced the private copy with an import from `date.js`.
  - **Removed unused CSS classes**: `.page-chip` (40 lines), `.app-card` from grouped selectors, `.toast-shell`/`.toast-popup` + all variants + `@keyframes toast-in` (~65 lines), `.rte-dropdown--list`, `.span-6`, `.span-3`.
  - **Cleaned up misc**: removed unused `useCallback` import from `App.jsx`, removed empty `<p>` tag from `WorkspaceView.jsx`, removed dead "Markdown preview" stub comment from `blocks/index.jsx`, removed unnecessary `export` keywords from internal-only `validateImageFile` and `compressImage` in `imageUploadService.js`, deleted empty `src/assets/` directory, removed unused `HeaderButton` import from `modals/index.jsx`.

### May  24, 2026
- **Sidebar Updates:** Overhauled the sidebar design and functionality for improved navigation and layout.
- **Minimal Mode Polish:** Fixed the visual oscillations and jittering on blocks when using the Minimal design profile.
- **Auth Flow:** Removed the required email verification step, allowing for smoother and faster user onboarding.
- **Responsive Design & UX:** Rolled out multiple responsive design fixes across the app to ensure better compatibility with mobile screens and smaller viewports.

### May 25, 2026
- Conducted a deep codebase scan focusing on redundancy, UI performance, and security.
- **Backend & Schema Cleanup:** Purged the orphaned `backend/src/features/ai` directory and routes from `app.js`. Dropped the outdated `public.tasks` table and its associated RLS policies from `supabase/schema.sql`.
- **UI & Performance Optimizations:**
  - Added a `requestAnimationFrame` throttle to the scroll event listener in `App.jsx` to eliminate continuous firing.
  - Implemented a 15-minute `sessionStorage` cache for the `WeatherWidget` in `WorkspaceView.jsx` to prevent API rate-limiting.
  - Abstracted massive inline Tailwind class strings for `<Toaster>` and scroll buttons into clean `.toast-success`, `.toast-error`, and `.scroll-btn` utility classes in `index.css`.
  - Resolved a z-index collision in `AddBlockMenu` by bumping the dropdown and overlay to `z-50`.
- **State Logic Fix:** Updated `useAppStore.js` so that checking the final open subtask intelligently auto-completes the parent task.
- **Documentation Audit:** Synchronized `README.md`, `developer.md`, `features.md`, and `implementation.md` with the current codebase state. Removed inaccurate claims regarding `@dnd-kit` usage and `TipTap` integrations, accurately describing the native block reordering and Markdown preview systems.

### May 27, 2026
- **Note Block Link Support**: Added a Link (🔗) insertion button to the Note block formatting toolbar, enabling dynamic markdown link creation via a native prompt.
- **Link Tooltip Popover**: Added interactive click and hover handlers to Note block links, displaying a custom positioned popover with the URL and a "Go to link" shortcut.
- **Color Profile Differentiation**: Refined the styling differences between Neo-Brutalist and Minimalist modes in `index.css`:
  - Imported the Google Font **Space Grotesk** to restore the default Neo-Brutalist quirky branding font (which previously fell back to Inter).
  - Neutralized group hover and active translate/shadow offsets for checkboxes in Minimalist mode to prevent brutalist bounce/oscillations.
  - Overrode hardcoded brutalist borders and shadows on the settings cards in the Settings Modal to lay flat with clean gray outlines when the Minimalist profile is active.
  - Custom-styled the link popover in Minimalist mode to use a thin gray border and a soft ambient drop shadow.
- **Multiple Links in Link Blocks**: Added support for holding multiple links inside a single link block:
  - Transformed the `LinkBlock` UI to show a list of editable links, each containing custom title, URL, open link actions, iframe embeds, and inline deletion.
  - Created a "+ Add Link" button to seamlessly append new links.
  - Updated `addLinkBlock` and markdown serialization in `useAppStore.js` to initialize and export multiple links cleanly.
  - Created Minimalist overrides for `.link-block-item` in `index.css` to flat-style link cards in Minimalist mode.

### May 28, 2026 
- **Synced Repeating Tasks (System Blocks Architecture)**: Implemented a dedicated recurring tasks system using the existing `blocks` table, enabling automatic sync to Supabase and full offline-first support without database migrations:
  - Created a recurrence utility module (`utils/recurrence.js`) with date checking and dynamic virtual task mapping for daily, weekdays, weekly, monthly, and custom intervals (days, weeks, months).
  - Added CRUD actions for templates and deterministic toggle completion handlers (`toggleRepeatedTaskInstance`) to the Zustand store, intercepting virtual task completions inside the global `toggleTask` handler.
  - Designed a beautiful popup dashboard modal (`RecurringTasksModal.jsx`) for managing repeating task templates. Reused project design tokens so that input fields, cards, shadows, and borders automatically style themselves under both the Neo-Brutalist and Minimalist color profiles.
  - Integrated repeating tasks inside the general **Tasks** view: added a "Manage Recurring Tasks" button in the filter bar, merged active virtual tasks into the list, updated summary cards totals, and routed virtual card clicks to the template editor.
  - Integrated repeating tasks inside the **Calendar** view: rendered virtual task indicators on the calendar cell grid, listed them under the active day details checklist, added an access button in the drawer, and wired checkbox toggle handlers.
  - Integrated repeating tasks inside the **Insights** view: blended recurring task historical records from the past 30 days into streaks, completion rates, and the completions heatmap grid.
- **Mobile Block Decluttering Overhaul**: Polished the workspace experience on mobile devices (width <= 640px) to prevent screen layout clutter:
  - Added dedicated helper class names (`block-shell` and `block-type-*`) to the blocks index component for resilient styling hooks.
  - Tightened vertical spacing on mobile workspace view by scaling down the block card container gap to `0.75rem` (`gap-3`) and header bottom margins to `0.5rem`.
  - Refined Neo-Brutalist elements on mobile by downscaling border widths to `2px` and box-shadow offsets to `2px 2px 0` for all buttons (`.nb-button`, `.rich-button`, `.icon-button`).
  - Configured task metadata controls (`.task-block-controls`) and image gallery actions (`.image-block-toolbar`) to lay out as single, sleek, horizontally scrollable rows with hidden scrollbars, preventing messy vertical stack wraps.
  - Compacted inner checklist blocks (reduced item borders to `1.5px`, gaps to `0.5rem`, padding to `0.375rem 0.5rem`), link block items (reduced padding to `0.5rem`, input height to `1.85rem`), title block headings (scaled text sizes to `1.5rem`), and note blocks (minimized editing area paddings and heights).
  - Maintained complete design fidelity for the flat-styled Minimalist design profile across all mobile adaptations.
- **Neo Font Hierarchy Refinement**: Restored the clean sans-serif `Inter` font for general application body text, buttons, lists, and inputs while locking the quirky **Space Grotesk** branding font to headings, the sidebar logo, and topbar titles in Neo-Brutalist mode (isolated from Minimalist mode).
- **Calendar UI Cleanup**: Removed the "Manage Recurring Tasks" button from the **Calendar** page sidebar as requested, preserving the global Topbar trigger and the list page shortcut button to keep calendar navigation clean.
- **Tasks Page UI Cleanup**: Removed the redundant "Manage Recurring Tasks" button from the **Tasks** filter-bar actions to align with the streamlined design, keeping the global Topbar button as the singular entry point for schedule configurations.
- **Collapsible Sidebar Sections**: Overhauled page organization in `Sidebar.jsx` and `useAppStore.js` to support grouping pages under custom collapsible/expandable Sections:
  - Added new section creation, deletion, and renaming triggers directly inside the Sidebar header.
  - Nesting of pages: Modified Zustand pages creation and page mapping to accept a custom `sectionId` (defaults to null), allowing pages to be visually nested and sorted within their respective sections.
  - Maintained a clean collapsible status state for sections in the local sidebar state.
- **Input Editing Cursor Jumping Fix**: Addressed a critical input cursor jumping bug across controlled inputs (Checklists, titles, subtasks, code blocks, page headers) by executing the Zustand store `set()` state updates synchronously and immediately, running IndexedDB and sync-queue writes asynchronously in the background.
- **Checklist & Block Vertical Auto-Resizing**: Replaced standard `<input type="text">` elements with a custom `AutoResizingTextarea` component in `blocks/index.jsx` to wrap long text naturally and adjust height dynamically based on `scrollHeight`. Intercepted the "Enter" keypress to blur the input instead of inserting a newline for cleaner UX.
- **Checklist Item Numbering**: Added stylish, bold, neo-brutalist sequential numbering (e.g. `1.`, `2.`, `3.`) before checklist item texts to improve list readability.
- **Recurring Task Failure Support**: Enabled virtual repeating task instances to be marked as failed, analogous to standard tasks. Implemented `failed_repeat` block models, mapped them in the recurrence engine, updated Insights streaks and completion metrics, and wired fail buttons to calendar day lists and the Tasks page.
- **Virtual ID Slicing Fix**: Resolved an issue where complete/fail actions for recurring tasks were unresponsive by parsing template IDs using a lastIndex slicing mechanism, perfectly supporting UUIDs containing internal underscores.
- **Dexie Transaction Sync Queue Fix**: Fixed a silent database transaction abort bug by moving the `enqueueMutation` sync queue write action outside of the local `db.transaction("rw", db.blocks)` blocks, letting it execute independently.
- **Navigation & Topbar Menu Cleanups**: Relocated the database "Sync" button from the main Topbar header to the Settings modal. Restored the "Tasks" view button to the Sidebar navigation, kept standalone tasks removed from the Command Palette, and conditionally hid the Topbar Command/Menu search button when viewing Tasks, Calendar, or Insights pages.
- **Sidebar Action Button Style Refinements**: Added a custom `.pages-btn` utility class in `index.css` to reduce border thickness to `2px` and shadow offset to `2px` / `1.5px` for compact new section and new page buttons in `Sidebar.jsx`.
- **Codebase Deep Scan & Redundant Code Purge**: Conducted a thorough sweep of the codebase, deleting the unused validation middleware `backend/src/middleware/validate.js` and removing legacy unused AI environment schema keys (`GEMINI_API_KEY`, `GEMINI_MODEL`) in `backend/src/config/env.js`.

### May 30, 2026
- **Recurring Tasks Archiving**: Implemented a "Delete only future tasks" archive mechanism for recurring templates that sets `isArchived: true` and caps the `endDate` to today. This preserves past historical records and current-day instances instead of hard-deleting the entire task history.
- **Diary Security & State**: Integrated SHA-256 password hashing for the Diary feature. Implemented an auto-lock mechanism that requires users to re-enter their password whenever they navigate away from the Diary and return.
- **Diary Responsive UX**: Converted the static Diary sidebar into a responsive, off-canvas hamburger drawer for mobile screens (width <= 1024px) with a translucent backdrop and instant-toggle state.
- **Diary Layout Polish**: Fixed clipping and padding issues in the Diary view by replacing `h-screen` with `100dvh` and applying invisible padding to accommodate structural box-shadows. Moved the mobile hamburger toggle to the left side next to the Diary header.
- **Diary Settings Integration**: Added a quick-access Workspace Settings button directly into the Diary sidebar navigation row.
- **Minimal Theme Sidebar Fix**: Prevented the Diary sidebar container from expanding and bouncing on hover (which is unwanted for static layout elements) while strictly maintaining the flat `.bento-card` design aesthetics for the Minimalist light and dark profiles. Implemented a robust `.hover-static` CSS utility to universally disable structural card hover animations across all design profiles.

### June 1, 2026
- **Diary Undo Isolation**: Filtered the global undo stack when navigating away from the Diary view to purge any snapshots created during the diary session. This ensures that pressing Ctrl+Z in the workspace after closing the diary never accidentally reverts diary edits.
- **Undo System Keystroke Debouncing**: Implemented a 1000ms debounce window in `pushUndoSnapshot` to coalesce rapid consecutive keystrokes/edits under the same label into a single undo entry, allowing Ctrl+Z to revert an entire typing sequence at once instead of letter-by-letter. Added a state reset to `undoLastChange` to ensure immediate snapshot capture for any new edits initiated right after an undo action.
- **Note Block Undo & External Sync**: Updated `NoteBlock` to re-sync its `contentEditable` DOM whenever the block's text or HTML content changes in the store (enabling full undo/redo support). Added a `lastPushedHtml` ref to distinguish local user input from external state updates, preventing cursor jumps by skipping DOM rewrites for changes originating from the active user's typing.
- **Task State Safety**: Added validation to strictly prevent completed tasks from being marked as failed. Users must explicitly mark a task as incomplete before they can fail it. Applied this logic to the central Zustand store for standard and recurring virtual tasks, and conditionally hid the 'Fail' action button in the UI (TaskBlock, TaskDetails, TaskList, and Calendar views) whenever a task is completed.
- **Minimal Profile Task Details Styling**: Restructured TaskDetailPanel into a clean flex column with scrollable inner content, fixing the issue with excessive scrollability and empty space at the bottom. Also refined the typography and interior container styles in minimal mode so that it cleanly diverges from the neo-brutalist theme.

### June 3, 2026
- **Outside-Click Auto-Close**: Implemented automatic close behavior when clicking outside the task details sidebar (`TaskDetailPanel`), the topbar Command Menu (`CommandPalette`), and the new task modal (`TaskModal`). Protected specific interactive sidebar details trigger elements from closing the sidebar via classes and datasets.
- **Recurring Tasks Sidebar Disabling**: Disabled opening the task details sidebar for recurring (virtual) tasks by rendering them as static `div` elements instead of interactive buttons in the calendar day lists and task list view.
- **Note Block Link Popover Hover Close**: Added auto-close behavior for Note block link popovers when the pointer stops hovering over the link, incorporating a 200ms grace period so users can move their pointer onto the popover.
- **Calendar Priority Colors**: Updated the color mapping for task priority indicator dots inside the Calendar view cells. High priority maps to red (`#ff5a5f`), medium priority to orange (`#ffb84d`), and low priority to green (`#2ef2a6`).
- **Completed Task Timestamp Tracking**: Implemented date and time storage and display for task completions. When standard or recurring tasks are checked, their completion timestamp (`completedAt`) is recorded and rendered on the task details sidebar. Unchecking a task clears this timestamp.
- **Tasks Page Completion Timestamp**: Rendered the completed date and time under the task title for completed tasks (both standard and recurring) in the tasks list page view.

### June 5, 2026
- **Insights Page Redesign**:
  - Restructured the page layout by removing the top bento statistics block.
  - Added a new **Performance Statistics** section at the bottom of the page displaying: Tasks (filtered to exclude future open tasks), Completed, Failed, Completion Rate, Fail Rate, Overdue, and Streak.
  - Updated the metrics calculation logic to only include previous and today's tasks (excluding upcoming open tasks with future deadlines) to keep completion rate statistics accurate and meaningful.
  - Custom styled the 7 cards using the application's full 7-color palette (blue, green, red, purple, pink, teal, and orange).
- **Tasks Page Polish & Sorting Upgrades**:
  - Removed the top header blocks from the Tasks view layout to streamline page content.
  - Replaced the group by day/week/month selector with Sort Field (Date, Priority) and Sort Order (Ascending, Descending) controls.
  - Implemented sorting logic with secondary fallbacks: sorting by date defaults to priority descending for matching dates, and sorting by priority defaults to date ascending for matching priorities.
  - Cleaned up unused variables, metrics helper functions, and imports in the component to prevent React lint/build warnings.
- **Task Sidebar Layout Polish**:
  - Added the `content-start` alignment class to the scrollable grid wrapper inside the `TaskDetailPanel` sidebar component. This corrects the issue where the action buttons (Mark Complete, Fail Task) and inputs would stretch vertically ("look fat") when the "Open Page" action button was hidden or general content was sparse.

### June 21, 2026
- **Codebase Refactoring & UI Cleanup**:
  - Extracted the inline `DiaryAddBlockMenu` component from `DiaryView.jsx` to significantly declutter the diary layout file.
  - Extracted the complex sorting and filtering logic from `TaskListView.jsx` into a reusable custom hook (`useFilteredTasks`), vastly reducing the component size and improving maintainability.
  - Split the monolithic `components/modals/index.jsx` file into discrete, focused files (`TaskModal.jsx`, `TaskDetailPanel.jsx`, and `CommandPalette.jsx`), converting `index.jsx` to purely act as a module exporter.
  - Successfully split the massive ~3,000 line `index.css` file into 5 clean, modular files inside a new `styles/` directory (`base.css`, `components.css`, `utilities.css`, `animations.css`, and `minimal.css`), preserving complete visual fidelity while massively improving stylesheet maintainability.
  - Implemented a persistent **Desktop Sidebar Collapse** feature. Added a collapse toggle button (`PanelLeftClose`) to the sidebar header and rewired the main topbar hamburger button (`Menu`) to dynamically act as a sidebar toggle when in desktop mode, persisting the user's preference globally via the Zustand store.
- **End-to-End Encryption & Sync:**
  - Upgraded Diary Mode to use true **Client-Side End-to-End Encryption (E2EE)** powered by the Web Crypto API (AES-GCM 256-bit).
  - Implemented deterministic salt generation keyed by the Supabase User ID, allowing seamless decryption of Diary pages across multiple devices without prompt issues.
  - Intercepted the backend `syncDbUpdates` loop to transparently decrypt incoming synchronized Diary blocks.
- **UI Adjustments:**
  - Removed "Recovery" and "Workspace Settings" from the Insights dashboard to declutter the analytics layout.
  - Created a dedicated `RecoveryModal.jsx` popup containing the deleted items list.
  - Linked the new Recovery popup directly into the global `CommandPalette` ("Menu") for quick access.
  - Cleaned up the `CommandPalette` by removing contextual "add block" commands and unnecessary "Go to" links.
- **Documentation:**
  - Completely rewrote the `README.md` to a professional standard, highlighting the new E2EE architecture and Supabase synchronization, removing obsolete local backend setup instructions, and adding the hosted live demo link and logo.

### July 01, 2026
- **UI Adjustments**:
  - Restored the Diary access link into the topbar Command Palette menu.
  - Added a toggle button (`Eye`/`EyeOff`) on external links to allow users to hide/show their embed previews.
  - Fixed a layout distortion bug in the Calendar view where selecting a day with too many tasks would vertically stretch the task sidebar, consequently stretching the entire calendar grid cell heights. Set the page size to 4 tasks per page, ensuring the sidebar content never exceeds the calendar's minimum height (which naturally prevents stretching without requiring any scrolling container), and replaced the "Page X of Y" text with neo-brutalist pagination circles (carousel indicators) between the `<` and `>` arrow controls. This keeps the layout height fixed and prevents calendar grid distortion entirely.
- **Bug Fixes**:
  - Fixed a silent failure in Diary authentication where `supabase` object null-checks were missing, allowing the Diary to be properly locked and unlocked even when running offline or without Supabase configured.
  - Fixed a critical transaction bug where toggling tasks or editing blocks would fail/freeze after the Diary had been unlocked. This was caused by monkey-patched database hooks (`db.blocks.put`, `db.pages.put`) dynamically importing and awaiting native Web Crypto operations inside Dexie's transaction callbacks, which broke Dexie's transaction tracking zones (causing transaction rollbacks and skipping React state updates). Statically imported the crypto functions and wrapped the native async operations in `Dexie.waitFor()` to preserve the transaction zones.
- **Multi-Device Sync Improvements**:
  - Resolved a major Diary sync UX issue: when logging in on a new device, the local database lacked the password hash (as local settings are not synced to the backend to maintain zero-knowledge privacy), resulting in the app incorrectly prompting the user to perform a new "Setup" rather than an "Unlock".
  - The app now checks if synced diary pages exist on the device. If they do, the user is presented with an "Unlock Synced Diary" screen. Entering the correct password will now test-decrypt the synced items and, upon successful verification, automatically recreate and save the verification hash and salt locally.
- **Settings & Layout Persistence**:
  - Added robust local persistence for Workspace Layout settings (Sidebar visibility, Active Page Title block, Weather widget) and Color Profile settings (Theme mode, Neo/Minimal profile).
  - These preferences are now written to both IndexedDB (`db.settings`) and LocalStorage, and automatically reloaded during app initialization on startup.

### July 02 - 03, 2026
- **Bug Fixes**:
  - Replaced direct `set({ error: "..." })` mutations in `useAppStore.js` with a centralized `setError` helper to ensure error toasts correctly clear themselves after 3 seconds, preventing persistent/stuck error messages.
  - Removed dynamic `await import()` statements inside `syncDbUpdates` to strictly preserve IndexedDB (Dexie) transaction zones and prevent silent synchronization failures.
  - Added missing `updatedAt` timestamps when calling `movePageToSection`, preventing the synchronization loop from incorrectly pulling stale page states over fresh local changes.
- **Codebase Optimization & Reusability**:
  - Purged over 120 lines of dead code from `useAppStore.js` (including unused `convertNoteToTask`, `parseQuickTask`, and `createTaskFromExtraction` handlers) and cleaned up unused React imports across the application.
  - Safely dropped the obsolete `tasks` table from the IndexedDB schema by bumping the schema version.
  - Consolidated duplicate UUID parsing into a single `parseVirtualTaskId()` helper to parse recurring task IDs uniformly.
  - Abstracted duplicate state mutations for recurring instances (when toggling subtasks, etc.) into a centralized `upsertRecurringInstance()` helper function.
  - Refactored `recurrence.js` by replacing 70+ lines of repetitive task object construction blocks with a new, unified `buildVirtualTask()` factory method.
