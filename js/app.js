/* Expense & Budget Visualizer - Application Logic */

(function () {

  // ============================================================
  // 1. Constants & Configuration
  // ============================================================

  const CATEGORY_COLORS = {
    Food:      '#4CAF50',
    Transport: '#2196F3',
    Fun:       '#FF9800'
  };

  const OVER_LIMIT_COLOR = '#F44336';

  const CATEGORIES = ['Food', 'Transport', 'Fun'];

  // Sort mode constants
  const SORT_DEFAULT      = 'default';
  const SORT_AMOUNT_ASC   = 'amount-asc';
  const SORT_AMOUNT_DESC  = 'amount-desc';
  const SORT_CATEGORY_ASC = 'category-asc';

  // ============================================================
  // 2. AppState
  // ============================================================

  const AppState = {
    transactions: [],
    spendLimit:   0,
    theme:        'light',
    sortMode:     'default'
  };

  // ============================================================
  // 3. Storage Module
  // ============================================================

  const Storage = {
    KEYS: {
      TRANSACTIONS: 'ebv_transactions',
      SPEND_LIMIT:  'ebv_spendLimit',
      THEME:        'ebv_theme'
    },

    /**
     * Persist a value to localStorage under the given key.
     * @param {string} key
     * @param {*} value  - will be JSON-serialised
     * @returns {{ ok: boolean, error?: Error }}
     */
    save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    },

    /**
     * Load and deserialise a value from localStorage.
     * @param {string} key
     * @returns {{ ok: boolean, data?: *, error?: Error }}
     */
    load(key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) {
          return { ok: true, data: null };
        }
        return { ok: true, data: JSON.parse(raw) };
      } catch (error) {
        return { ok: false, error };
      }
    },

    /**
     * Remove an entry from localStorage.
     * @param {string} key
     * @returns {{ ok: boolean, error?: Error }}
     */
    remove(key) {
      try {
        localStorage.removeItem(key);
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    }
  };

  // ============================================================
  // 4. Validator Module
  // ============================================================

  const Validator = {

    validateTransaction(name, amount, category) {

      if (!name || !amount || !category) {
        return {
          valid: false,
          message: 'All fields are required.'
        };
      }

      if (isNaN(amount) || Number(amount) <= 0) {
        return {
          valid: false,
          message: 'Amount must be greater than 0.'
        };
      }

      if (!CATEGORIES.includes(category)) {
        return {
          valid: false,
          message: 'Invalid category.'
        };
      }

      return {
        valid: true
      };
    }
  };

  // ============================================================
  // 5. Chart Module
  // ============================================================

  let expenseChart = null;

  const ChartModule = {
    renderChart(transactions) {
      const foodTotal = transactions
        .filter(item => item.category === 'Food')
        .reduce((sum, item) => sum + item.amount, 0);
      const transportTotal = transactions
        .filter(item => item.category === 'Transport')
        .reduce((sum, item) => sum + item.amount, 0);

      const funTotal = transactions
        .filter(item => item.category === 'Fun')
        .reduce((sum, item) => sum + item.amount, 0);
      const ctx = document.getElementById('expenseChart');

      if (!ctx) return;

      if (expenseChart) {
        expenseChart.destroy();
      }

      expenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Food', 'Transport', 'Fun'],
          datasets: [{
            data: [foodTotal, transportTotal, funTotal],
            backgroundColor: [
              CATEGORY_COLORS.Food,
              CATEGORY_COLORS.Transport,
              CATEGORY_COLORS.Fun
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  };

  // ============================================================
  // 6. Renderer Module
  // ============================================================

  const Renderer = {
    renderTransactions() {
      const transactionList = document.getElementById('transactionList');
      if (!transactionList) return;
      transactionList.innerHTML = '';
      let transactions = [...AppState.transactions];

      // Sorting
      switch (AppState.sortMode) {
        case SORT_AMOUNT_ASC:
          transactions.sort((a, b) => a.amount - b.amount);
          break;
        case SORT_AMOUNT_DESC:
          transactions.sort((a, b) => b.amount - a.amount);
          break;
        case SORT_CATEGORY_ASC:
          transactions.sort((a, b) =>
            a.category.localeCompare(b.category)
          );
          break;
      }

      transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.classList.add('transaction-item');
        
        if (transaction.amount > AppState.spendLimit &&
            AppState.spendLimit > 0) {
         item.style.backgroundColor = '#eb62cdff';
        item.style.border = '2px solid #f44336';
        }

        item.innerHTML = `
          <div>
            <h4>${transaction.name}</h4>
            <p>${transaction.category}</p>
          </div>

          <div>
            <strong>Rp ${transaction.amount}</strong>
            <button class="delete-btn" data-id="${transaction.id}">
              Delete
            </button>
          </div>
        `;

        transactionList.appendChild(item);
      });
    },

    renderBalance() {
      const totalBalance = document.getElementById('totalBalance');

      if (!totalBalance) return;
      const total = AppState.transactions.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      totalBalance.textContent = `Rp ${total}`;
    },

    renderTheme() {
      document.body.className = AppState.theme;
    }
  };

  // ============================================================
  // 7. Action Handlers
  // ============================================================

  const Actions = {
    addTransaction(name, amount, category) {
      const validation =
        Validator.validateTransaction(name, amount, category);

      if (!validation.valid) {
        alert(validation.message);
        return;
      }

      const transaction = {
        id: Date.now(),
        name,
        amount: Number(amount),
        category
      };

      AppState.transactions.push(transaction);

      Storage.save(
        Storage.KEYS.TRANSACTIONS,
        AppState.transactions
      );

      Renderer.renderTransactions();
      Renderer.renderBalance();
      ChartModule.renderChart(AppState.transactions);
    },

    deleteTransaction(id) {
      AppState.transactions =
        AppState.transactions.filter(
          item => item.id !== Number(id)
        );

      Storage.save(
        Storage.KEYS.TRANSACTIONS,
        AppState.transactions
      );

      Renderer.renderTransactions();
      Renderer.renderBalance();
      ChartModule.renderChart(AppState.transactions);
    },

    toggleTheme() {
      AppState.theme =
        AppState.theme === 'light'
          ? 'dark'
          : 'light';

      Storage.save(
        Storage.KEYS.THEME,
        AppState.theme
      );

      Renderer.renderTheme();
    }
  };

  // ============================================================
  // 8. Event Binding
  // ============================================================

  function bindEvents() {
    const form = document.getElementById('transactionForm');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const name =
          document.getElementById('itemName').value;
        const amount =
          document.getElementById('amount').value;
        const category =
          document.getElementById('category').value;
        Actions.addTransaction(name, amount, category);
        form.reset();
      });
    }

    const transactionList =
      document.getElementById('transactionList');
    
      if (transactionList) {
      transactionList.addEventListener('click', function (event) {

        if (event.target.classList.contains('delete-btn')) {
          const id = event.target.dataset.id;
          Actions.deleteTransaction(id);
        }
      });
    }

const lightModeBtn =
  document.getElementById('lightModeBtn');
const darkModeBtn =
  document.getElementById('darkModeBtn');

if (lightModeBtn) {
  lightModeBtn.addEventListener('click', function () {
    AppState.theme = 'light';
    Storage.save(
      Storage.KEYS.THEME,
      AppState.theme
    );
    Renderer.renderTheme();
  });
}

if (darkModeBtn) {
  darkModeBtn.addEventListener('click', function () {
    AppState.theme = 'dark';
    Storage.save(
      Storage.KEYS.THEME,
      AppState.theme
    );
    Renderer.renderTheme();
  });
}

    const spendLimitInput =
  document.getElementById('spendLimit');

if (spendLimitInput) {
  spendLimitInput.addEventListener('change', function () {
    AppState.spendLimit = Number(this.value);
    Renderer.renderTransactions();
  });
}
    const sortSelect =
      document.getElementById('sortMode');

    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        AppState.sortMode = this.value;
        Renderer.renderTransactions();
      });
    }
  }

  // ============================================================
  // 9. Bootstrap / Init
  // ============================================================

  function init() {
    const savedTransactions =
      Storage.load(Storage.KEYS.TRANSACTIONS);

    if (savedTransactions.ok && savedTransactions.data) {
      AppState.transactions = savedTransactions.data;
    }

    const savedTheme =
      Storage.load(Storage.KEYS.THEME);
    if (savedTheme.ok && savedTheme.data) {
      AppState.theme = savedTheme.data;
    }

    Renderer.renderTransactions();
    Renderer.renderBalance();
    Renderer.renderTheme();

    ChartModule.renderChart(AppState.transactions);
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);


  // ── Node.js test-environment export guard ──────────────────
  if (typeof module !== 'undefined') {
    module.exports = { Storage, AppState, CATEGORY_COLORS, OVER_LIMIT_COLOR, CATEGORIES };
  }

})();
