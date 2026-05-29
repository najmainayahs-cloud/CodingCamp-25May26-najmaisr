# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side single-page application using plain HTML, CSS, and Vanilla JavaScript. The app is delivered as three files (`index.html`, `css/styles.css`, `js/app.js`) with no build tools or dependencies. All state is persisted in `localStorage`. The implementation follows a unidirectional data flow: user action → handler → AppState mutation → Storage sync → render.

---

## Tasks

- [x] 1. Set up project file structure and HTML skeleton
  - Create `index.html` at the project root with the full semantic HTML structure as specified in the design: `<header>`, `<main>` with all sections (`#balance-section`, `#form-section`, `#spend-limit-section`, `#chart-section`, `#transaction-list-section`), and `#storage-error-banner`
  - Add all required element IDs and classes: `#theme-toggle`, `#transaction-form`, `#input-name`, `#input-amount`, `#input-category`, `#error-name`, `#error-amount`, `#error-category`, `#balance-display`, `#spend-limit-input`, `#pie-chart`, `#sort-amount`, `#sort-category`, `#transaction-list`
  - Link `css/styles.css` and `js/app.js` in the HTML; the script tag must use `defer` so the DOM is ready before JS runs
  - Create `css/styles.css` as an empty file and `js/app.js` as an empty file to confirm the file structure
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 2. Implement Constants, AppState, and Storage Module
  - [x] 2.1 Implement Constants, AppState, and Storage Module in `js/app.js`
    - Wrap all code in an IIFE `(function () { ... })();`
    - Define `CATEGORY_COLORS`, `OVER_LIMIT_COLOR`, `CATEGORIES` array, and sort-mode string constants
    - Define the `AppState` object with `transactions`, `spendLimit`, `theme`, and `sortMode` fields
    - Implement the `Storage` module with `KEYS` (`ebv_transactions`, `ebv_spendLimit`, `ebv_theme`), and `save(key, value)`, `load(key)`, `remove(key)` methods — all wrapped in `try/catch`, returning `{ ok: boolean, data?, error? }`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 1.6, 2.5_

  - [ ] 2.2 Write property test for Storage round-trip (Property 1)
    - Set up a Vitest (or Jest + jsdom) test file at `js/app.test.js` with fast-check installed
    - **Property 1: Transaction persistence round-trip**
    - **Validates: Requirements 1.2, 7.1, 7.3**
    - Generator: arbitrary valid transaction objects; assert `Storage.save` then `Storage.load` returns identical data; assert corrupted JSON returns `{ ok: false }`

  - [ ]* 2.3 Write property test for Storage failure leaving state unchanged (Property 10)
    - **Property 10: Storage failure leaves state unchanged**
    - **Validates: Requirements 1.6, 2.5, 7.1, 7.2**
    - Generator: arbitrary transaction arrays + new transaction; mock `localStorage.setItem` to throw; assert `AppState.transactions` is deep-equal to its pre-call state

- [ ] 3. Implement Validator Module
  - [ ] 3.1 Implement `Validator.validate` and `Validator.validateField` in `js/app.js`
    - `validate(name, amount, category)` returns `{ valid: boolean, errors: { name?, amount?, category? } }` per the validation algorithm in the design
    - `validateField(fieldName, value)` returns `{ valid: boolean, message: string }` for real-time single-field feedback
    - Validation rules: name non-empty and ≤ 100 chars; amount numeric in [0.01, 999999999.99] with ≤ 2 decimal places; category one of `['Food', 'Transport', 'Fun']`
    - _Requirements: 1.3, 1.4, 9.3_

  - [ ]* 3.2 Write property test for invalid inputs rejected by Validator (Property 2)
    - **Property 2: Invalid inputs are rejected by the Validator**
    - **Validates: Requirements 1.3, 1.4**
    - Generator: empty/whitespace-only names, names > 100 chars, amounts outside [0.01, 999999999.99], amounts with > 2 decimal places, empty category; assert `Validator.validate(...).valid === false`

  - [ ]* 3.3 Write unit tests for Validator edge cases
    - Valid inputs produce `{ valid: true, errors: {} }`
    - Empty name → error on `name`; name > 100 chars → error on `name`
    - Amount = 0 → error; amount = 0.001 → error; amount = 1000000000 → error
    - No category selected → error on `category`
    - _Requirements: 1.3, 1.4_

- [ ] 4. Implement utility functions and Renderer Module
  - [ ] 4.1 Implement utility functions: `formatAmount`, `computeCategoryTotals`, `computeBalance`, `sortTransactions`
    - `formatAmount(value)` → `'$' + value.toFixed(2)`
    - `computeCategoryTotals(transactions)` → `{ Food: number, Transport: number, Fun: number }` (only categories with transactions)
    - `computeBalance(transactions)` → formatted string of sum of all amounts
    - `sortTransactions(transactions, sortMode)` → sorted shallow copy per the sort algorithm in the design (default = newest-first reverse, amount-asc, amount-desc, category-asc)
    - _Requirements: 2.6, 2.7, 2.9, 3.1, 3.2, 4.1_

  - [ ]* 4.2 Write property tests for balance invariant, sort ordering, and category totals (Properties 3, 6, 7, 8)
    - **Property 3: Balance invariant** — `computeBalance(txns) === '$' + txns.reduce((s,t) => s+t.amount, 0).toFixed(2)` — **Validates: Requirements 3.1, 3.3, 3.4**
    - **Property 6: Category sort is alphabetical** — adjacent pairs satisfy `a.category.localeCompare(b.category) <= 0` — **Validates: Requirements 2.7**
    - **Property 7: Amount sort ordering** — asc: `a.amount <= b.amount`; desc: `a.amount >= b.amount` — **Validates: Requirements 2.6**
    - **Property 8: Default sort is newest-first** — adjacent pairs satisfy `a.timestamp >= b.timestamp` — **Validates: Requirements 2.9**

  - [ ] 4.3 Implement the Renderer Module in `js/app.js`
    - `renderTransactionList()`: reads `AppState`, applies `sortTransactions`, builds `<li>` elements with item name, formatted amount, category label, delete button, and `over-limit` class logic; shows placeholder text when list is empty
    - `renderBalance()`: updates `#balance-display` text using `computeBalance`
    - `renderTheme()`: sets `document.body.className` to `'theme-' + AppState.theme`
    - `showFieldError(fieldName, message)` / `clearFieldError(fieldName)` / `clearAllErrors()`: show/hide `#error-{fieldName}` spans
    - `showStorageError(message)`: shows `#storage-error-banner` for 4 seconds then auto-hides
    - _Requirements: 2.1, 2.2, 2.8, 3.1, 3.2, 5.2, 5.4, 6.2, 6.5_

- [ ] 5. Implement Chart Module
  - [ ] 5.1 Implement `Chart.init` and `Chart.draw` in `js/app.js`
    - `Chart.init(canvasElement)`: stores canvas reference and gets `2d` context; if `getContext` returns null, hide `#chart-section` and show fallback text
    - `Chart.draw(categoryTotals, spendLimit)`: clears canvas; if empty shows placeholder "No data available"; otherwise draws pie slices per the algorithm in the design (arc angles, `CATEGORY_COLORS`, `OVER_LIMIT_COLOR` for over-limit segments, donut hole, percentage labels)
    - Implement `_drawSlice`, `_drawLabel`, `_drawPlaceholder` as internal helpers
    - `Renderer.renderChart()`: calls `Chart.draw(computeCategoryTotals(AppState.transactions), AppState.spendLimit)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.3, 5.4_

  - [ ]* 5.2 Write property test for pie chart proportions and zero-category exclusion (Property 4)
    - **Property 4: Pie chart proportions and zero-category exclusion**
    - **Validates: Requirements 4.1, 4.5**
    - Generator: arbitrary non-empty category totals (some may be 0); assert slice angle ≈ `(categoryTotal / grandTotal) * 2π`; sum of angles ≈ `2π`; zero-value categories produce no slice

  - [ ]* 5.3 Write property test for spend limit highlighting consistency (Property 5)
    - **Property 5: Spend limit highlighting consistency**
    - **Validates: Requirements 5.2, 5.3, 5.4**
    - Generator: arbitrary transaction arrays + spend limit > 0; assert every transaction entry has `over-limit` class iff its category total exceeds the spend limit; assert `isOverLimit` flag matches chart segment style

- [ ] 6. Implement Action Handlers
  - [ ] 6.1 Implement `addTransaction(name, amount, category)` handler
    - Run `Validator.validate`; on failure call `Renderer.showFieldError` for each error and return
    - On success: create `Transaction` object with `crypto.randomUUID()`, `Date.now()` timestamp; push to `AppState.transactions`; call `Storage.save`; if save fails, rollback (pop from array), call `Renderer.showStorageError`, and return
    - On successful save: reset form fields, call `Renderer.clearAllErrors`, `Renderer.renderTransactionList`, `Renderer.renderBalance`, `Renderer.renderChart`
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 3.3, 4.2, 7.1_

  - [ ] 6.2 Implement `deleteTransaction(id)` handler
    - Find and remove the transaction from `AppState.transactions`; call `Storage.save`; if save fails, restore the removed transaction, call `Renderer.showStorageError`, and return
    - On successful save: call `Renderer.renderTransactionList`, `Renderer.renderBalance`, `Renderer.renderChart`
    - _Requirements: 2.3, 2.4, 2.5, 3.4, 4.3, 7.2_

  - [ ]* 6.3 Write property test for delete removes transaction from state and storage (Property 11)
    - **Property 11: Delete removes transaction from state and storage**
    - **Validates: Requirements 2.4, 7.2**
    - Generator: arbitrary non-empty transaction arrays; pick a random id; assert after `deleteTransaction(id)`, `AppState.transactions` contains no entry with that id and parsed localStorage also excludes it

  - [ ] 6.4 Implement `setSpendLimit(value)`, `setSortMode(mode)`, and `toggleTheme()` handlers
    - `setSpendLimit(value)`: parse float, update `AppState.spendLimit`, call `Storage.save(KEYS.SPEND_LIMIT, ...)`, call `Renderer.renderTransactionList` and `Renderer.renderChart`
    - `setSortMode(mode)`: update `AppState.sortMode`, call `Renderer.renderTransactionList`; sort-by-amount button cycles `default → amount-asc → amount-desc → default`
    - `toggleTheme()`: toggle `AppState.theme` between `'light'` and `'dark'`, call `Storage.save(KEYS.THEME, ...)`, call `Renderer.renderTheme`
    - _Requirements: 2.6, 2.7, 5.1, 6.1, 6.2, 6.3_

  - [ ]* 6.5 Write property test for theme persistence round-trip (Property 9)
    - **Property 9: Theme persistence round-trip**
    - **Validates: Requirements 6.3, 6.4**
    - Generator: arbitrary theme value from `['light', 'dark']`; assert after `Storage.save(KEYS.THEME, theme)` and `initApp()`, `document.body.className` includes `'theme-' + theme`; assert no stored theme defaults to `'theme-light'`

- [ ] 7. Implement Event Binding and App Initialization
  - [ ] 7.1 Implement `initApp()` and bind all event listeners
    - `initApp()` follows the initialization sequence from the design: load theme → load spendLimit → load transactions (with error handling) → bind events → render all
    - Bind `#transaction-form` `submit` event → `addTransaction`
    - Bind `#input-name`, `#input-amount`, `#input-category` `input`/`change` events → `Validator.validateField` for real-time feedback (≤ 100ms, Req 9.3)
    - Bind `#transaction-list` click delegation → `deleteTransaction` (using `data-id` attribute on delete buttons)
    - Bind `#sort-amount` click → `setSortMode` cycling logic
    - Bind `#sort-category` click → `setSortMode('category-asc')`
    - Bind `#spend-limit-input` `change` event → `setSpendLimit`
    - Bind `#theme-toggle` click → `toggleTheme`
    - Register `initApp` on `DOMContentLoaded`
    - _Requirements: 1.1, 1.5, 6.1, 7.3, 7.4, 7.5, 8.2, 9.1, 9.3_

- [ ] 8. Checkpoint — Core functionality complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the app loads from `file://` protocol without errors
  - Verify form submission, transaction list rendering, balance update, and chart rendering all work end-to-end

- [ ] 9. Implement CSS styles
  - [ ] 9.1 Implement base layout and typography in `css/styles.css`
    - Define CSS custom properties (variables) for light and dark theme color palettes on `:root` and `body.theme-dark`
    - Style `<header>`, `<main>`, and all `<section>` elements with appropriate spacing and layout (flexbox or grid)
    - Style the `#balance-display` prominently at the top
    - _Requirements: 6.5, 10.1_

  - [ ] 9.2 Implement form, transaction list, and chart section styles
    - Style `#transaction-form` inputs, select, and submit button with consistent sizing and focus states
    - Style `.error-msg` spans (red color, small font, hidden by default, visible when non-empty)
    - Style `#transaction-list` as a scrollable container (`overflow-y: auto`, `max-height`); style each `<li>` with name, amount, category, and delete button laid out horizontally
    - Style `.over-limit` class with red background or red border for highlighted transaction entries
    - Style `#pie-chart` canvas centered within `#chart-section`
    - Style `#storage-error-banner` as a fixed/sticky error banner (hidden by default via `.hidden` class)
    - _Requirements: 2.2, 5.2, 6.5, 10.1_

  - [ ] 9.3 Implement dark theme overrides and theme toggle button styles
    - Apply dark background and light foreground text to all components when `body.theme-dark` is active
    - Style `#theme-toggle` button to show current mode label and update on toggle
    - Ensure all interactive elements (buttons, inputs, select) have visible focus indicators for accessibility
    - _Requirements: 6.2, 6.5_

- [ ] 10. Final checkpoint — Full integration and polish
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all four sort modes render correctly with no JS exceptions
  - Verify theme toggle persists across page reload
  - Verify spend limit highlighting updates correctly on add/delete
  - Verify chart placeholder shows when no transactions exist and updates within 1 second on add/delete (Req 4.2, 4.3)
  - Verify app initializes within 2 seconds and all interactions respond within 200ms (Req 9.1, 9.2)

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The design document contains a Correctness Properties section with 11 properties — property-based tests use **fast-check** as recommended in the design
- Unit tests and property tests can be run with Vitest (or Jest + jsdom) without a browser; the app itself requires no build step
- Checkpoints at tasks 8 and 10 ensure incremental validation before moving to the next phase
- The IIFE wrapper in `app.js` means pure logic functions (`Validator`, `Storage`, `sortTransactions`, etc.) must be exported or exposed for testing — consider a conditional `if (typeof module !== 'undefined') module.exports = { ... }` guard at the bottom of the IIFE for Node.js test environments

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.2", "4.3"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1", "6.2"] },
    { "id": 5, "tasks": ["6.3", "6.4"] },
    { "id": 6, "tasks": ["6.5", "7.1"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["9.2"] },
    { "id": 9, "tasks": ["9.3"] }
  ]
}
```
