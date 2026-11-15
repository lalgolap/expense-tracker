import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Expense, ExpenseDraft, EXPENSE_CATEGORIES } from './expense.model';

const STORAGE_KEY = 'pennywise.expenses';
const CATEGORY_STORAGE_KEY = 'pennywise.categories';
const MAX_CATEGORY_LENGTH = 40;

@Injectable({ providedIn: 'root' })
export class ExpenseStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly expenseState = signal<Expense[]>(this.loadExpenses());
  private readonly categoryState = signal<string[]>(this.loadCategories());
  readonly expenses = this.expenseState.asReadonly();
  readonly categories = computed(() => [
    ...new Set([
      ...EXPENSE_CATEGORIES,
      ...this.categoryState(),
      ...this.expenseState().map((expense) => expense.category),
    ]),
  ]);

  add(draft: ExpenseDraft): void {
    const expense: Expense = { ...draft, id: crypto.randomUUID() };
    this.commit([expense, ...this.expenseState()]);
  }

  addCategory(category: string): string | null {
    const name = toSentenceCase(category);
    if (
      !name ||
      name.length > MAX_CATEGORY_LENGTH ||
      this.categories().some((existing) => existing.toLocaleLowerCase() === name.toLocaleLowerCase())
    ) {
      return null;
    }

    const categories = [...this.categoryState(), name];
    this.categoryState.set(categories);
    this.persistCategories(categories);
    return name;
  }

  renameCategory(category: string, updatedName: string): string | null {
    const name = toSentenceCase(updatedName);
    if (
      isBuiltInCategory(category) ||
      !this.categories().includes(category) ||
      !name ||
      name.length > MAX_CATEGORY_LENGTH ||
      this.categories().some(
        (existing) => existing !== category && existing.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      return null;
    }

    this.categoryState.set([
      ...this.categoryState().filter((existing) => existing !== category),
      name,
    ]);
    this.persistCategories(this.categoryState());
    this.commit(this.expenseState().map((expense) =>
      expense.category === category ? { ...expense, category: name } : expense,
    ));
    return name;
  }

  deleteCategory(category: string): boolean {
    if (isBuiltInCategory(category) || !this.categories().includes(category)) {
      return false;
    }

    const categories = this.categoryState().filter((existing) => existing !== category);
    this.categoryState.set(categories);
    this.persistCategories(categories);
    this.commit(this.expenseState().filter((expense) => expense.category !== category));
    return true;
  }

  update(expense: Expense): void {
    const expenses = this.expenseState();
    if (!expenses.some((item) => item.id === expense.id)) {
      throw new Error(`Cannot update missing expense "${expense.id}".`);
    }
    this.commit(expenses.map((item) => item.id === expense.id ? expense : item));
  }

  remove(id: string): void {
    const expenses = this.expenseState();
    if (!expenses.some((expense) => expense.id === id)) {
      throw new Error(`Cannot remove missing expense "${id}".`);
    }
    this.commit(expenses.filter((expense) => expense.id !== id));
  }

  private commit(expenses: Expense[]): void {
    this.expenseState.set(expenses);
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (error) {
      console.error('Unable to save expenses to local storage.', error);
    }
  }

  private persistCategories(categories: string[]): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('Unable to save expense categories to local storage.', error);
    }
  }

  private loadExpenses(): Expense[] {
    if (!this.isBrowser) {
      return [];
    }

    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return [];
      }

      const value: unknown = JSON.parse(serialized);
      if (!Array.isArray(value) || !value.every(isExpense)) {
        console.error('Saved expenses have an invalid format; starting with an empty list.');
        return [];
      }
      return value.map((expense) => ({
        ...expense,
        category: normalizeCategory(expense.category),
      }));
    } catch (error) {
      console.error('Unable to read expenses from local storage.', error);
      return [];
    }
  }

  private loadCategories(): string[] {
    if (!this.isBrowser) {
      return [];
    }

    try {
      const serialized = localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (!serialized) {
        return [];
      }

      const value: unknown = JSON.parse(serialized);
      if (
        !Array.isArray(value) ||
        !value.every((category) => typeof category === 'string' && category.trim().length > 0)
      ) {
        console.error('Saved expense categories have an invalid format; using the default categories.');
        return [];
      }

      return [...new Set(value.map((category: string) => toSentenceCase(category)))]
        .filter((category) => !EXPENSE_CATEGORIES.some(
          (existing) => existing.toLocaleLowerCase() === category.toLocaleLowerCase(),
        ));
    } catch (error) {
      console.error('Unable to read expense categories from local storage.', error);
      return [];
    }
  }
}

function isBuiltInCategory(category: string): boolean {
  return EXPENSE_CATEGORIES.some((existing) => existing.toLocaleLowerCase() === category.toLocaleLowerCase());
}

function normalizeCategory(category: string): string {
  return EXPENSE_CATEGORIES.find(
    (existing) => existing.toLocaleLowerCase() === category.toLocaleLowerCase(),
  ) ?? toSentenceCase(category);
}

function toSentenceCase(value: string): string {
  const trimmed = value.trim();
  const [first, ...rest] = Array.from(trimmed.toLocaleLowerCase());
  return first ? `${first.toLocaleUpperCase()}${rest.join('')}` : '';
}

function isExpense(value: unknown): value is Expense {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const expense = value as Record<string, unknown>;
  return typeof expense['id'] === 'string' &&
    typeof expense['description'] === 'string' &&
    typeof expense['amount'] === 'number' &&
    Number.isFinite(expense['amount']) &&
    expense['amount'] > 0 &&
    typeof expense['category'] === 'string' &&
    expense['category'].trim().length > 0 &&
    typeof expense['date'] === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(expense['date']) &&
    typeof expense['note'] === 'string';
}
