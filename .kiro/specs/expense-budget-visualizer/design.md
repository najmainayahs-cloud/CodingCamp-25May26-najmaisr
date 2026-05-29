# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side single-page application (SPA) built with plain HTML, CSS, and Vanilla JavaScript. It requires no build tools, no package manager, and no backend. The entire application is delivered as three files: one HTML entry point, one CSS stylesheet, and one JavaScript module. All state is persisted in the browser's `localStorage` API.

The application allows users to:
- Record expense transactions (name, amount, category)
- View and manage a scrollable transaction list with sort controls
- Monitor a live total balance display
- Visualize spending distribution by category via a Canvas-drawn pie chart
- Set per-category spend limits with visual highlighting
- Toggle between light and dark themes, with preference persisted

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Rendering engine for chart | HTML5 `<canvas>` | No external library needed; full control over drawing; works on `file://` protocol |
| State management | Single in-memory `AppState` object + localStorage sync | Simple, predictable, no framework needed |
| Module pattern | IIFE (Immediately Invoked Function Expression) wrapping all JS | Avoids global namespace pollution in a single-file constraint |
| Validation timing | `input` event (real-time) + `submit` event (final gate) | Meets the 100ms feedback requirement (Req 9.3) |
| Sort state | Enum-like string constants in `AppState` | Keeps sort logic stateless and easy to toggle |

---

## Architecture

The application follows a **unidirectional data flow** pattern:

```
User Interaction
      │
      ▼
  Action Handler  (e.g., addTransaction, deleteTransaction, setSpendLimit)
      │
      ▼
  AppState Mutation  (in-memory state object updated)
      │
      ├──► Storage.save()   (localStorage write, async-safe)
      │
      └──► render()         (full or partial DOM + Canvas re-render)
```

There is no two-way binding. Every user action flows through a named handler, mutates `AppState`, persists to `localStorage`, and then triggers a render pass. This makes the data flow easy to trace and test.

### File Structure

```
project-root/
├── index.html          ← sole HTML entry point (Req 10.4)
├── css/
│   └── styles.css      ← sole CSS file (Req 10.1)
└── js/
    └── app.js          ← sole JavaScript file (Req 10.2)
```

### Module Breakdown (within `app.js`)

The single JS file is organized into clearly separated logical sections using an IIFE:

```
(function () {
  // 1. Constants & Configuration
  // 2. AppState
  // 3. Storage Module
  // 4. Validator Module
  // 5. Chart Module
  // 6. Renderer Module
  // 7. Action Handlers
  // 8. Event Binding
  // 9. Bootstrap / Init
})();
```

---

## Components and Interfaces

### 1. AppState

The single source of truth for all runtime data.

```js
const AppState = {
  transactions: [],   // Transaction[]
  spendLimit: 0,      // number (0 = not set)
  theme: 'light',     // 'light' | 'dark'
  sortMode: 'default' // 'default' | 'amount-asc' | 'amount-desc' | 'category-asc'
};
```

### 2. Storage Module

Encapsulates all `localStorage` interactions. Returns `{ ok: true }` or `{ ok: false, error }` to allow callers to handle failures gracefully (Req 1.6, 2.5, 7.1, 7.2).

```js
const Storage = {
  KEYS: {
    TRANSACTIONS: 'ebv_transactions',
    SPEND_LIMIT:  'ebv_spendLimit',
    THEME:        'ebv_theme'
  },
  save(key, value): { ok: boolean },
  load(key): { ok: boolean, data: any },
  remove(key): { ok: boolean }
};
```

### 3. Validator Module

Validates `Input_Form` field values. Returns a structured result so the Renderer can display inline errors.

```js
const Validator = {
  // Returns { valid: boolean, errors: { name?: string, amount?: string, category?: string } }
  validate(name, amount, category): ValidationResult,

  // Real-time single-field validation (used on 'input' events)
  validateField(fieldName, value): { valid: boolean, message: string }
};
```

Validation rules (Req 1.3, 1.4):
- `name`: non-empty, ≤ 100 characters
- `amount`: numeric, 0.01 ≤ value ≤ 999,999,999.99, up to 2 decimal places
- `category`: must be one of `['Food', 'Transport', 'Fun']`

### 4. Chart Module

Draws the pie chart onto a `<canvas>` element using the 2D Canvas API. No external charting library is used (Req 10.3).

```js
const Chart = {
  canvas: null,   // HTMLCanvasElement reference
  ctx: null,      // CanvasRenderingContext2D

  init(canvasElement): void,

  // Draws the full pie chart from category totals
  // Shows placeholder text if totals is empty (Req 4.4)
  draw(categoryTotals, spendLimit): void,

  // Internal helpers
  _drawSlice(ctx, cx, cy, r, startAngle, endAngle, color, isOverLimit): void,
  _drawLabel(ctx, cx, cy, r, midAngle, label, pct): void,
  _drawPlaceholder(ctx, w, h): void
};
```

**Pie chart drawing algorithm** (see Algorithms section for detail).

### 5. Renderer Module

Responsible for all DOM mutations. Called after every state change.

```js
const Renderer = {
  // Re-renders the full transaction list based on AppState
  renderTransactionList(): void,

  // Updates only the balance display text
  renderBalance(): void,

  // Redraws the chart
  renderChart(): void,

  // Applies theme class to <body>
  renderTheme(): void,

  // Shows/hides inline validation error for a field
  showFieldError(fieldName, message): void,
  clearFieldError(fieldName): void,
  clearAllErrors(): void,

  // Shows a transient toast/banner for storage errors
  showStorageError(message): void
};
```

### 6. Action Handlers

Pure-ish functions that mutate `AppState`, call `Storage.save()`, and call the appropriate `Renderer` methods.

| Handler | Triggers |
|---|---|
| `addTransaction(name, amount, category)` | Form submit |
| `deleteTransaction(id)` | Delete button click |
| `setSpendLimit(value)` | Spend limit input change |
| `setSortMode(mode)` | Sort button clicks |
| `toggleTheme()` | Theme toggle click |
| `initApp()` | DOMContentLoaded |

### 7. HTML Structure (index.html)

```
<body class="theme-light">
  <header>
    <h1>Expense & Budget Visualizer</h1>
    <button id="theme-toggle">🌙 Dark Mode</button>
  </header>

  <main>
    <!-- Balance Display -->
    <section id="balance-section">
      <span id="balance-display">$0.00</span>
    </section>

    <!-- Input Form -->
    <section id="form-section">
      <form id="transaction-form">
        <input  id="input-name"     type="text"   maxlength="100" />
        <span   id="error-name"     class="error-msg"></span>
        <input  id="input-amount"   type="number" step="0.01" min="0.01" />
        <span   id="error-amount"   class="error-msg"></span>
        <select id="input-category">
          <option value="">-- Select Category --</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Fun">Fun</option>
        </select>
        <span   id="error-category" class="error-msg"></span>
        <button type="submit">Add Transaction</button>
      </form>
    </section>

    <!-- Spend Limit -->
    <section id="spend-limit-section">
      <label for="spend-limit-input">Spend Limit per Category ($)</label>
      <input id="spend-limit-input" type="number" step="0.01" min="0.01" />
    </section>

    <!-- Chart -->
    <section id="chart-section">
      <canvas id="pie-chart" width="400" height="400"></canvas>
    </section>

    <!-- Transaction List -->
    <section id="transaction-list-section">
      <div id="sort-controls">
        <button id="sort-amount">Sort by Amount</button>
        <button id="sort-category">Sort by Category</button>
      </div>
      <ul id="transaction-list">
        <!-- populated by Renderer -->
      </ul>
    </section>
  </main>

  <!-- Storage error banner -->
  <div id="storage-error-banner" class="hidden"></div>
</body>
```

---

## Data Models

### Transaction Object

```js
/**
 * @typedef {Object} Transaction
 * @property {string}  id        - UUID v4 generated at creation time (crypto.randomUUID())
 * @property {string}  name      - Item name (1–100 characters)
 * @property {number}  amount    - Positive number, max 2 decimal places, 0.01–999999999.99
 * @property {string}  category  - One of: 'Food' | 'Transport' | 'Fun'
 * @property {number}  timestamp - Unix timestamp (Date.now()) at creation
 */
```

### AppState Shape

```js
{
  transactions: Transaction[],
  spendLimit: number,   // 0 means "not configured"
  theme: 'light' | 'dark',
  sortMode: 'default' | 'amount-asc' | 'amount-desc' | 'category-asc'
}
```

### localStorage Keys and Serialization

| Key | Value type | Serialization |
|---|---|---|
| `ebv_transactions` | `Transaction[]` | `JSON.stringify` / `JSON.parse` |
| `ebv_spendLimit` | `number` | `JSON.stringify` / `JSON.parse` |
| `ebv_theme` | `'light' \| 'dark'` | plain string |

All writes are wrapped in `try/catch` to handle `QuotaExceededError` and other `localStorage` failures (Req 1.6, 2.5, 7.1, 7.2).

### Category Totals (derived, not stored)

```js
/**
 * Computed on demand from AppState.transactions.
 * @typedef {Object} CategoryTotals
 * @property {number} Food
 * @property {number} Transport
 * @property {number} Fun
 */
function computeCategoryTotals(transactions) {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
}
```

---

## Algorithms

### Pie Chart Drawing (Canvas 2D)

The chart is drawn from scratch on every render call. This is efficient for the expected data size (hundreds of transactions at most).

```
function draw(categoryTotals, spendLimit):
  1. Clear the canvas
  2. If categoryTotals is empty → drawPlaceholder(); return
  3. Compute grand total = sum of all category values
  4. For each category in categoryTotals:
       a. Compute slice angle = (categoryValue / grandTotal) * 2π
       b. Determine fill color from CATEGORY_COLORS map
       c. Determine if category exceeds spendLimit (isOverLimit flag)
       d. Draw arc from currentAngle to currentAngle + sliceAngle
          - If isOverLimit: draw with dashed stroke / warning color overlay
       e. Compute label position at midAngle, radius * 0.65 from center
       f. Draw label: "{Category}\n{pct}%"
       g. Advance currentAngle += sliceAngle
  5. Draw center circle (donut hole) in background color for aesthetics
```

**Category color map:**
```js
const CATEGORY_COLORS = {
  Food:      '#4CAF50',  // green
  Transport: '#2196F3',  // blue
  Fun:       '#FF9800'   // orange
};
const OVER_LIMIT_COLOR = '#F44336'; // red overlay / dashed border
```

### Amount Formatting

```js
function formatAmount(value) {
  return '$' + value.toFixed(2);
}
```

### Sort Algorithm

Sorting is applied to a shallow copy of `AppState.transactions` at render time — the canonical array order is always insertion order (newest first). The sort copy is only used for display.

```
sortMode === 'default'       → [...transactions].reverse() (newest first, Req 2.9)
sortMode === 'amount-asc'    → [...transactions].sort((a,b) => a.amount - b.amount)
sortMode === 'amount-desc'   → [...transactions].sort((a,b) => b.amount - a.amount)
sortMode === 'category-asc'  → [...transactions].sort((a,b) => a.category.localeCompare(b.category))
```

Toggling the sort-by-amount button cycles: `default → amount-asc → amount-desc → default` (Req 2.6).

### Spend Limit Highlighting Logic

```
For each transaction entry rendered:
  categoryTotal = sum of amounts for transaction.category
  if (spendLimit > 0 && categoryTotal > spendLimit):
    apply CSS class 'over-limit' (red background/border)
  else:
    remove CSS class 'over-limit'
```

The same `categoryTotal > spendLimit` check is used in `Chart.draw()` to apply the warning style to the relevant pie segment (Req 5.3).

### Validation Algorithm

```
validate(name, amount, category):
  errors = {}
  trimmedName = name.trim()
  if trimmedName === '':
    errors.name = 'Item name is required.'
  else if trimmedName.length > 100:
    errors.name = 'Item name must be 100 characters or fewer.'

  parsedAmount = parseFloat(amount)
  if isNaN(parsedAmount) || amount === '':
    errors.amount = 'Amount is required.'
  else if parsedAmount < 0.01 || parsedAmount > 999999999.99:
    errors.amount = 'Amount must be between $0.01 and $999,999,999.99.'
  else if !/^\d+(\.\d{1,2})?$/.test(amount.trim()):
    errors.amount = 'Amount may have at most 2 decimal places.'

  if !['Food','Transport','Fun'].includes(category):
    errors.category = 'Please select a category.'

  return { valid: Object.keys(errors).length === 0, errors }
```

### ID Generation

```js
const id = crypto.randomUUID(); // available in all target browsers (Req 8.1, 8.4)
```

### App Initialization Sequence

```
DOMContentLoaded:
  1. Load theme from Storage → apply to <body>
  2. Load spendLimit from Storage → set AppState.spendLimit
  3. Load transactions from Storage → set AppState.transactions
     - On failure: show error banner, use empty array
  4. Bind all event listeners
  5. renderTransactionList()
  6. renderBalance()
  7. renderChart()
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction persistence round-trip

*For any* valid transaction (non-empty name ≤ 100 chars, amount in [0.01, 999999999.99], valid category), after it is added via `addTransaction`, querying `localStorage` and parsing the stored JSON should yield an array that contains a transaction with the same name, amount, and category. Conversely, for any set of transactions stored in `localStorage`, calling `initApp` should populate `AppState.transactions` with exactly those transactions.

**Validates: Requirements 1.2, 7.1, 7.3**

---

### Property 2: Invalid inputs are rejected by the Validator

*For any* input where the name is empty or composed entirely of whitespace, the name exceeds 100 characters, the amount is outside [0.01, 999999999.99] or has more than 2 decimal places, or no category is selected, `Validator.validate` should return `{ valid: false }` and `addTransaction` should leave `AppState.transactions` unchanged.

**Validates: Requirements 1.3, 1.4**

---

### Property 3: Balance invariant

*For any* set of transactions in `AppState.transactions`, the formatted balance string produced by `computeBalance` should equal `'$' + transactions.reduce((s, t) => s + t.amount, 0).toFixed(2)`. This invariant must hold after every add and delete operation.

**Validates: Requirements 3.1, 3.3, 3.4**

---

### Property 4: Pie chart proportions and zero-category exclusion

*For any* non-empty set of transactions, the computed slice angle for each category should equal `(categoryTotal / grandTotal) * 2π`, and the sum of all slice angles should equal `2π` (within floating-point tolerance). Furthermore, *for any* category whose total is zero, no slice should be drawn for that category.

**Validates: Requirements 4.1, 4.5**

---

### Property 5: Spend limit highlighting consistency

*For any* spend limit value greater than zero and any set of transactions, every transaction entry whose category total exceeds the spend limit should have the `over-limit` CSS class applied, and every entry whose category total is at or below the spend limit should not have that class. The same `isOverLimit` flag should also be passed to `Chart.draw` for the corresponding segment.

**Validates: Requirements 5.2, 5.3, 5.4**

---

### Property 6: Category sort is alphabetical

*For any* transaction list, after applying `sortTransactions(txns, 'category-asc')`, every adjacent pair of transactions `(a, b)` in the result should satisfy `a.category.localeCompare(b.category) <= 0`.

**Validates: Requirements 2.7**

---

### Property 7: Amount sort ordering

*For any* transaction list, after applying `sortTransactions(txns, 'amount-asc')`, every adjacent pair `(a, b)` should satisfy `a.amount <= b.amount`. After applying `sortTransactions(txns, 'amount-desc')`, every adjacent pair should satisfy `a.amount >= b.amount`.

**Validates: Requirements 2.6**

---

### Property 8: Default sort is newest-first

*For any* transaction list with distinct timestamps, the default render order (sort mode `'default'`) should produce transactions in non-increasing order of `timestamp` (i.e., the most recently recorded transaction appears first).

**Validates: Requirements 2.9**

---

### Property 9: Theme persistence round-trip

*For any* theme value from `['light', 'dark']`, after `toggleTheme` writes the value to `localStorage` and `initApp` reads it back, the CSS class applied to `<body>` should be `'theme-' + storedTheme`. If no theme is stored, `initApp` should apply `'theme-light'` by default.

**Validates: Requirements 6.3, 6.4**

---

### Property 10: Storage failure leaves state unchanged

*For any* current `AppState.transactions` array, if `localStorage.setItem` throws during `addTransaction` or `deleteTransaction`, the `AppState.transactions` array should remain identical to its state before the call (no transaction added or removed).

**Validates: Requirements 1.6, 2.5, 7.1, 7.2**

---

### Property 11: Delete removes transaction from state and storage

*For any* transaction list containing at least one transaction, after calling `deleteTransaction(id)` for a valid `id`, `AppState.transactions` should not contain any transaction with that `id`, and the parsed `localStorage` array should also not contain it.

**Validates: Requirements 2.4, 7.2**

---

## Error Handling

### Storage Errors

All `localStorage` calls are wrapped in `try/catch`. On failure:
- The in-memory state is **not** mutated (rollback pattern)
- A non-blocking error banner (`#storage-error-banner`) is shown for 4 seconds then auto-dismissed
- The user can continue using the app in-memory for the session

### Validation Errors

- Inline error `<span>` elements adjacent to each field are shown/hidden by `Renderer.showFieldError` / `Renderer.clearFieldError`
- Errors are cleared on the next successful submission or when the field value changes to valid
- The form is never submitted if validation fails (event `preventDefault()`)

### Initialization Errors

- If `localStorage` read fails on load, the app initializes with empty state and shows the error banner
- If `JSON.parse` fails on stored data (corrupted), the app treats it as empty and shows the error banner

### Chart Errors

- If `getContext('2d')` returns null (canvas not supported), the chart section is hidden and a fallback text message is shown

---

## Testing Strategy

### Unit Tests

Unit tests cover specific examples, edge cases, and error conditions for pure logic functions. These do not require a browser environment and can run in Node.js with a test runner (e.g., Vitest or Jest with jsdom).

**Validator Module:**
- Valid inputs produce `{ valid: true, errors: {} }`
- Empty name → error on `name`
- Name > 100 chars → error on `name`
- Amount = 0 → error on `amount`
- Amount = 0.001 (3 decimal places) → error on `amount`
- Amount = 1000000000 (too large) → error on `amount`
- No category selected → error on `category`

**Storage Module:**
- Successful save/load round-trip
- Load returns `{ ok: false }` when `localStorage` throws
- Save returns `{ ok: false }` on `QuotaExceededError`

**Utility Functions:**
- `formatAmount(0)` → `'$0.00'`
- `formatAmount(1234.5)` → `'$1234.50'`
- `computeCategoryTotals([])` → `{}`
- `computeCategoryTotals` with mixed categories → correct sums

### Property-Based Tests

Property-based testing is applicable to this feature because it contains pure functions (validator, amount formatter, category totals computation, sort logic) whose correctness must hold across a wide input space. The recommended library is **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript).

Each property test runs a minimum of **100 iterations**.

Tag format: `Feature: expense-budget-visualizer, Property {N}: {property_text}`

**Property 1 — Transaction persistence round-trip**
- Generator: arbitrary valid transaction objects (name: non-empty string ≤ 100 chars, amount: float in [0.01, 999999999.99] with ≤ 2 dp, category: one of Food/Transport/Fun)
- Assert: after `addTransaction`, `JSON.parse(Storage.load('ebv_transactions').data)` contains the transaction; after `initApp` with pre-seeded storage, `AppState.transactions` matches stored data
- Tag: `Feature: expense-budget-visualizer, Property 1: transaction persistence round-trip`

**Property 2 — Invalid inputs are rejected by the Validator**
- Generator: strings that are empty/all-whitespace OR exceed 100 chars (for name); numbers outside [0.01, 999999999.99] or with > 2 decimal places (for amount); empty string (for category)
- Assert: `Validator.validate(name, amount, category).valid === false` and `AppState.transactions` is unchanged after attempted add
- Tag: `Feature: expense-budget-visualizer, Property 2: invalid inputs are rejected by the Validator`

**Property 3 — Balance invariant**
- Generator: arbitrary arrays of valid transactions (including empty array)
- Assert: `computeBalance(transactions) === '$' + transactions.reduce((s,t) => s + t.amount, 0).toFixed(2)`
- Tag: `Feature: expense-budget-visualizer, Property 3: balance invariant`

**Property 4 — Pie chart proportions and zero-category exclusion**
- Generator: arbitrary non-empty category totals objects (some categories may have value 0)
- Assert: for non-zero categories, `sliceAngle / (2 * Math.PI) ≈ categoryTotal / grandTotal` (within 1e-9 tolerance); sum of all slice angles ≈ 2π; zero-value categories produce no slice
- Tag: `Feature: expense-budget-visualizer, Property 4: pie chart proportions and zero-category exclusion`

**Property 5 — Spend limit highlighting consistency**
- Generator: arbitrary transaction arrays + arbitrary spend limit > 0
- Assert: for every transaction `t`, `isOverLimit(t.category, transactions, spendLimit) === (categoryTotal(t.category) > spendLimit)`; the rendered entry has `over-limit` class iff `isOverLimit` is true
- Tag: `Feature: expense-budget-visualizer, Property 5: spend limit highlighting consistency`

**Property 6 — Category sort is alphabetical**
- Generator: arbitrary transaction arrays (0 or more transactions)
- Assert: after `sortTransactions(txns, 'category-asc')`, for all adjacent pairs `(a, b)`: `a.category.localeCompare(b.category) <= 0`
- Tag: `Feature: expense-budget-visualizer, Property 6: category sort is alphabetical`

**Property 7 — Amount sort ordering**
- Generator: arbitrary transaction arrays
- Assert: after `sortTransactions(txns, 'amount-asc')`, adjacent pairs satisfy `a.amount <= b.amount`; after `'amount-desc'`, `a.amount >= b.amount`
- Tag: `Feature: expense-budget-visualizer, Property 7: amount sort ordering`

**Property 8 — Default sort is newest-first**
- Generator: arbitrary transaction arrays with distinct timestamps
- Assert: after `sortTransactions(txns, 'default')`, adjacent pairs satisfy `a.timestamp >= b.timestamp`
- Tag: `Feature: expense-budget-visualizer, Property 8: default sort is newest-first`

**Property 9 — Theme persistence round-trip**
- Generator: arbitrary theme value from `['light', 'dark']`
- Assert: after `Storage.save(KEYS.THEME, theme)` and `initApp()`, `document.body.className` includes `'theme-' + theme`
- Tag: `Feature: expense-budget-visualizer, Property 9: theme persistence round-trip`

**Property 10 — Storage failure leaves state unchanged**
- Generator: arbitrary transaction arrays + arbitrary new transaction
- Assert: when `localStorage.setItem` is mocked to throw, `AppState.transactions` is identical (by deep equality) to its pre-call state after `addTransaction` or `deleteTransaction`
- Tag: `Feature: expense-budget-visualizer, Property 10: storage failure leaves state unchanged`

**Property 11 — Delete removes transaction from state and storage**
- Generator: arbitrary non-empty transaction arrays; pick a random transaction id from the array
- Assert: after `deleteTransaction(id)`, `AppState.transactions.find(t => t.id === id)` is `undefined`, and the parsed localStorage array also does not contain that id
- Tag: `Feature: expense-budget-visualizer, Property 11: delete removes transaction from state and storage`

### Integration / Smoke Tests

- App loads from `file://` protocol without errors (Req 8.2)
- All four sort modes produce a rendered list (no JS exceptions)
- Theme toggle applies correct CSS class to `<body>`
- Chart canvas renders without errors when transactions exist and when empty

### Browser Compatibility

Manual smoke tests in Chrome, Firefox, Edge, and Safari stable (Req 8.1) covering:
- Form submission and validation
- Transaction list rendering and deletion
- Chart rendering
- Theme toggle and persistence
- `file://` protocol operation
