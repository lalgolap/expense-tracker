import { CurrencyPipe, DOCUMENT, registerLocaleData } from '@angular/common';
import localeEnIn from '@angular/common/locales/en-IN';
import { Component, computed, inject, signal } from '@angular/core';
import { ExpenseForm } from './expense-form/expense-form';
import { ExpenseList } from './expense-list/expense-list';
import { Expense, ExpenseDraft } from './expense.model';
import { ExpenseStore } from './expense.store';

registerLocaleData(localeEnIn);

type TransactionPeriod = 'daily' | 'monthly' | 'yearly';

@Component({
  selector: 'app-root',
  imports: [CurrencyPipe, ExpenseForm, ExpenseList],
  templateUrl: './app.html',
})
export class App {
  private readonly expenseStore = inject(ExpenseStore);
  private readonly document = inject(DOCUMENT);
  private readonly now = new Date();

  protected readonly expenses = this.expenseStore.expenses;
  protected readonly categories = this.expenseStore.categories;
  protected readonly searchTerm = signal('');
  protected readonly selectedCategory = signal('All');
  protected readonly editingExpense = signal<Expense | null>(null);
  protected readonly transactionPeriod = signal<TransactionPeriod>('daily');
  protected readonly selectedDate = signal(localDateString());
  protected readonly selectedMonth = signal(localDateString().slice(0, 7));
  protected readonly selectedYear = signal(String(this.now.getFullYear()));
  protected readonly periodExpenses = computed(() => {
    const period = this.transactionPeriod();
    const date = this.selectedDate();
    const month = this.selectedMonth();
    const year = this.selectedYear();

    return this.expenses().filter((expense) => {
      if (period === 'daily') {
        return expense.date === date;
      }
      if (period === 'monthly') {
        return expense.date.startsWith(`${month}-`);
      }
      return expense.date.startsWith(`${year}-`);
    });
  });
  protected readonly filteredExpenses = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const category = this.selectedCategory();

    return [...this.periodExpenses()]
      .filter((expense) => category === 'All' || expense.category === category)
      .filter((expense) =>
        !query ||
        expense.description.toLocaleLowerCase().includes(query) ||
        expense.category.toLocaleLowerCase().includes(query) ||
        expense.note.toLocaleLowerCase().includes(query),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  });
  protected readonly visibleMonthCount = computed(() =>
    new Set(this.filteredExpenses().map((expense) => expense.date.slice(0, 7))).size,
  );
  protected readonly monthlyExpenses = computed(() => {
    const year = this.now.getFullYear();
    const month = this.now.getMonth();
    return this.expenses().filter((expense) => {
      const date = new Date(`${expense.date}T00:00:00`);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  });
  protected readonly monthlyTotal = computed(() =>
    this.monthlyExpenses().reduce((total, expense) => total + expense.amount, 0),
  );
  protected readonly monthlyCount = computed(() => this.monthlyExpenses().length);
  protected readonly monthlyAverage = computed(() =>
    this.monthlyCount() ? this.monthlyTotal() / this.monthlyCount() : 0,
  );
  protected readonly monthLabel = new Intl.DateTimeFormat('en', { month: 'long' }).format(this.now);
  protected readonly todayLabel = new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(this.now);
  protected readonly greeting = this.now.getHours() < 12 ? 'morning' : this.now.getHours() < 18 ? 'afternoon' : 'evening';

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateCategory(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
  }

  protected selectTransactionPeriod(period: TransactionPeriod): void {
    this.transactionPeriod.set(period);
  }

  protected updateSelectedDate(event: Event): void {
    this.selectedDate.set((event.target as HTMLInputElement).value);
  }

  protected updateSelectedMonth(event: Event): void {
    this.selectedMonth.set((event.target as HTMLInputElement).value);
  }

  protected updateSelectedYear(event: Event): void {
    this.selectedYear.set((event.target as HTMLInputElement).value);
  }

  protected saveExpense(draft: ExpenseDraft): void {
    const editing = this.editingExpense();
    if (editing) {
      this.expenseStore.update({ ...editing, ...draft });
      this.editingExpense.set(null);
      return;
    }

    this.expenseStore.add(draft);
  }

  protected editExpense(expense: Expense): void {
    this.editingExpense.set(expense);
    this.focusExpenseForm();
  }

  protected deleteExpense(expense: Expense): void {
    if (this.document.defaultView?.confirm(`Delete "${expense.description}"? This can't be undone.`)) {
      this.expenseStore.remove(expense.id);
      if (this.editingExpense()?.id === expense.id) {
        this.editingExpense.set(null);
      }
    }
  }

  protected onCategoryRenamed(change: { oldName: string; newName: string }): void {
    if (this.selectedCategory() === change.oldName) {
      this.selectedCategory.set(change.newName);
    }
    const editing = this.editingExpense();
    if (editing?.category === change.oldName) {
      this.editingExpense.set({ ...editing, category: change.newName });
    }
  }

  protected onCategoryDeleted(category: string): void {
    if (this.selectedCategory() === category) {
      this.selectedCategory.set('All');
    }
    if (this.editingExpense()?.category === category) {
      this.editingExpense.set(null);
    }
  }

  protected cancelEdit(): void {
    this.editingExpense.set(null);
  }

  protected focusExpenseForm(): void {
    this.document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function localDateString(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
