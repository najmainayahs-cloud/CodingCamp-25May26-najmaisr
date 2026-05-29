# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, manage a transaction list, and visualize spending distribution by category through an interactive pie chart. The application runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, with all data persisted in the browser's Local Storage. It requires no backend server, no complex setup, and is usable as a standalone web page or browser extension.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Transaction_List**: The scrollable UI component that displays all recorded Transactions.
- **Input_Form**: The UI form component used to create a new Transaction.
- **Category**: A classification label for a Transaction. Valid values are: `Food`, `Transport`, and `Fun`.
- **Balance_Display**: The UI component at the top of the App that shows the current total of all Transaction amounts.
- **Chart**: The pie chart UI component that visualizes spending distribution by Category.
- **Storage**: The browser's Local Storage API used to persist Transaction data client-side.
- **Spend_Limit**: A user-configurable monetary threshold per Category above which spending is visually highlighted.
- **Theme**: The visual color scheme of the App, either `light` or `dark`.
- **Validator**: The client-side logic component responsible for validating Input_Form field values before submission.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name (maximum 100 characters), a numeric field for the amount, and a dropdown selector for the Category with options `Food`, `Transport`, and `Fun` plus a no-selection placeholder.
2. WHEN the user submits the Input_Form with all fields filled and a valid positive amount between 0.01 and 999,999,999.99 (up to 2 decimal places), THE App SHALL add a new Transaction to the Transaction_List and persist it to Storage.
3. WHEN the user submits the Input_Form, THE Validator SHALL verify that the item name field is not empty (and not exceeding 100 characters), the amount field contains a numeric value between 0.01 and 999,999,999.99, and a Category is selected.
4. IF the Validator detects that any required field is empty, the item name exceeds 100 characters, or the amount is outside the valid range, THEN THE Validator SHALL display an inline error message adjacent to the invalid field and SHALL NOT add a Transaction.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state, with the Category dropdown returning to its no-selection placeholder.
6. IF Storage is unavailable when the App attempts to persist a new Transaction, THEN THE App SHALL display an error message indicating the save failed and SHALL NOT add the Transaction to the Transaction_List.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all persisted Transactions, each showing the item name, amount formatted as a monetary value, and Category label.
2. WHILE the number of Transactions exceeds the visible area of the Transaction_List, THE Transaction_List SHALL remain scrollable to allow access to all entries.
3. THE Transaction_List SHALL provide a delete control for each Transaction entry.
4. WHEN the user activates the delete control for a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from Storage.
5. IF Storage is unavailable when the App attempts to delete a Transaction, THEN THE App SHALL display an error message and SHALL NOT remove the Transaction from the Transaction_List.
6. WHEN the user activates the sort-by-amount control, THE Transaction_List SHALL toggle the display order between ascending and descending order of Transaction amounts.
7. WHEN the user activates the sort-by-category control, THE Transaction_List SHALL display Transactions sorted in ascending alphabetical order by Category label.
8. WHILE the Transaction_List contains no Transactions, THE Transaction_List SHALL display a placeholder message indicating that no transactions have been recorded.
9. THE Transaction_List SHALL display Transactions in descending order of recording time by default, before any sort control is activated.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all Transaction amounts formatted with a currency symbol (`$`) and exactly two decimal places (e.g., `$0.00`).
2. WHILE no Transactions exist, THE Balance_Display SHALL show `$0.00`.
3. WHEN a Transaction is added, THE Balance_Display SHALL update to reflect the new formatted total without requiring a page reload.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new formatted total without requiring a page reload.

---

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart where each segment represents a Category, sized proportionally to that Category's share of the total sum of all Transaction amounts, and labeled with the Category name and its percentage of the total.
2. WHEN a Transaction is added, THE Chart SHALL update automatically within 1 second to reflect the new spending distribution.
3. WHEN a Transaction is deleted, THE Chart SHALL update automatically within 1 second to reflect the revised spending distribution.
4. WHILE no Transactions exist, THE Chart SHALL display a placeholder state with the message "No data available".
5. WHEN all Transactions for a Category are deleted and that Category's total reaches zero, THE Chart SHALL remove that Category's segment from the pie chart.

---

### Requirement 5: Spend Limit Highlighting

**User Story:** As a user, I want to set a spending limit so that I can be visually alerted when I exceed it for a given category.

#### Acceptance Criteria

1. THE App SHALL allow the user to configure a single Spend_Limit value greater than 0 and up to 999,999,999.99, which applies independently to each Category's total spending.
2. WHEN the total amount of Transactions within a Category exceeds the Spend_Limit, THE App SHALL apply a distinct visual highlight (a red background or red border) to every Transaction entry of that Category in the Transaction_List.
3. WHEN the total amount of Transactions within a Category exceeds the Spend_Limit, THE Chart SHALL render that Category's segment with a visually distinct style (e.g., a dashed border or warning color) compared to non-exceeding segments.
4. WHEN Transactions are deleted or modified such that a Category's total falls at or below the Spend_Limit, THE App SHALL remove the visual highlight from that Category's entries in the Transaction_List and restore the Chart segment to its default style.

---

### Requirement 6: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light mode so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control (e.g., a button or switch) that switches the Theme between `light` and `dark`.
2. WHEN the user activates the Theme toggle, THE App SHALL apply the selected Theme's color scheme to all UI components immediately without a page reload.
3. WHEN the user activates the Theme toggle, THE App SHALL persist the newly selected Theme value to Storage under a dedicated key.
4. WHEN the App loads, THE App SHALL read the Theme preference from Storage and apply it before rendering any UI content; IF no Theme preference is stored, THEN THE App SHALL apply the `light` Theme by default.
5. WHEN the `dark` Theme is active, THE App SHALL apply a dark background color and light foreground text to all UI components; WHEN the `light` Theme is active, THE App SHALL apply a light background color and dark foreground text to all UI components.

---

### Requirement 7: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL write the updated Transaction dataset to Storage within 500 milliseconds; IF the write fails, THEN THE App SHALL display an error indication and retain the previous Storage state.
2. WHEN a Transaction is deleted, THE App SHALL write the updated Transaction dataset to Storage within 500 milliseconds; IF the write fails, THEN THE App SHALL display an error indication and retain the previous Storage state.
3. WHEN the App loads, THE App SHALL read all persisted Transactions from Storage and render them in the Transaction_List, the Balance_Display, and the Chart.
4. IF Storage contains no Transaction data on load, THEN THE App SHALL initialize with an empty Transaction_List, a `$0.00` Balance_Display, and the Chart placeholder state.
5. IF reading from Storage fails on load, THEN THE App SHALL display an error indication and initialize with an empty Transaction_List, a `$0.00` Balance_Display, and the Chart placeholder state.

---

### Requirement 8: Browser Compatibility

**User Story:** As a user, I want the app to work correctly in any modern browser so that I am not restricted to a specific browser.

#### Acceptance Criteria

1. THE App SHALL function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari, including all core features: Input_Form submission, Transaction_List display and deletion, Balance_Display, Chart rendering, Spend_Limit highlighting, Theme toggle, and Storage persistence.
2. THE App SHALL operate as a standalone web page opened directly from the file system (via `file://` protocol) without requiring a backend server or local development server.
3. WHERE the App is packaged as a browser extension, THE App SHALL function correctly within the extension runtime environment, including Storage access via the browser's Local Storage API.
4. THE App SHALL use only Web APIs and JavaScript features available in the current stable releases of Chrome, Firefox, Edge, and Safari without requiring polyfills or transpilation.

---

### Requirement 9: Performance and Responsiveness

**User Story:** As a user, I want the app to respond instantly to my interactions so that my workflow is not interrupted.

#### Acceptance Criteria

1. WHEN the App is loaded, THE App SHALL render the initial UI, including all persisted data, within 2 seconds on a device with at least a dual-core 1.6 GHz CPU and 4 GB RAM using a modern browser.
2. WHEN the user adds or deletes a Transaction, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 200 milliseconds.
3. WHEN the user types a character or changes a field value in the Input_Form, THE Validator SHALL provide inline validation feedback within 100 milliseconds.

---

### Requirement 10: Code and File Structure

**User Story:** As a developer, I want the codebase to follow a clean, single-file-per-type structure so that the project is easy to maintain and extend.

#### Acceptance Criteria

1. THE App SHALL contain exactly one CSS file located directly inside the `css/` directory, with no subdirectories within `css/`.
2. THE App SHALL contain exactly one JavaScript file located directly inside the `js/` directory, with no subdirectories within `js/`.
3. THE App SHALL use only HTML, CSS, and Vanilla JavaScript, requiring no package installation, compilation, or build step to run in a browser.
4. THE App SHALL contain exactly one HTML file at the root of the project directory, serving as the sole entry point of the application.
