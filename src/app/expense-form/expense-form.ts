import { DOCUMENT } from '@angular/common';
import { Component, computed, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Expense, ExpenseCategory, ExpenseDraft, EXPENSE_CATEGORIES } from '../expense.model';
import { ExpenseStore } from '../expense.store';

@Component({
  selector: 'app-expense-form',
  imports: [FormsModule],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.css',
})
export class ExpenseForm implements OnChanges {
  private readonly expenseStore = inject(ExpenseStore);
  private readonly document = inject(DOCUMENT);
  @Input() expense: Expense | null = null;
  @Output() saved = new EventEmitter<ExpenseDraft>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() categoryRenamed = new EventEmitter<{ oldName: string; newName: string }>();
  @Output() categoryDeleted = new EventEmitter<string>();

  protected readonly categories = this.expenseStore.categories;
  protected readonly customCategories = computed(() =>
    this.categories().filter((category) => !EXPENSE_CATEGORIES.some((builtIn) => builtIn === category)),
  );
  protected description = '';
  protected amount: number | null = null;
  protected category: ExpenseCategory = 'Food & drink';
  protected newCategory = '';
  protected categoryError = '';
  protected editingCategory: string | null = null;
  protected categoryNameDraft = '';
  protected categoryManagementError = '';
  protected date = localDateString();
  protected note = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['expense']) {
      this.setFormValues();
    }
  }

  protected submit(): void {
    if (!this.description.trim() || this.amount === null || !Number.isFinite(this.amount) || this.amount <= 0) {
      return;
    }

    this.saved.emit({
      description: this.description.trim(),
      amount: this.amount,
      category: this.category,
      date: this.date,
      note: this.note.trim(),
    });
    if (!this.expense) {
      this.reset();
    }
  }

  protected cancel(): void {
    this.cancelled.emit();
    this.reset();
  }

  protected addCategory(): void {
    const category = this.expenseStore.addCategory(this.newCategory);
    if (!category) {
      this.categoryError = 'Enter a new category name up to 40 characters long.';
      return;
    }

    this.category = category;
    this.newCategory = '';
    this.categoryError = '';
  }

  protected startEditingCategory(category: string): void {
    this.editingCategory = category;
    this.categoryNameDraft = category;
    this.categoryManagementError = '';
  }

  protected saveCategoryEdit(): void {
    if (!this.editingCategory) {
      return;
    }

    const oldName = this.editingCategory;
    const newName = this.expenseStore.renameCategory(oldName, this.categoryNameDraft);
    if (!newName) {
      this.categoryManagementError = 'Enter a unique category name up to 40 characters long.';
      return;
    }

    if (this.category === oldName) {
      this.category = newName;
    }
    this.editingCategory = null;
    this.categoryNameDraft = '';
    this.categoryManagementError = '';
    this.categoryRenamed.emit({ oldName, newName });
  }

  protected cancelCategoryEdit(): void {
    this.editingCategory = null;
    this.categoryNameDraft = '';
    this.categoryManagementError = '';
  }

  protected deleteCategory(category: string): void {
    const expenseCount = this.expenseStore.expenses().filter((expense) => expense.category === category).length;
    const message = expenseCount
      ? `Delete "${category}" and its ${expenseCount} ${expenseCount === 1 ? 'expense' : 'expenses'}? This can't be undone.`
      : `Delete "${category}"? This can't be undone.`;
    if (!this.document.defaultView?.confirm(message) || !this.expenseStore.deleteCategory(category)) {
      return;
    }

    if (this.category === category) {
      this.category = 'Food & drink';
    }
    if (this.editingCategory === category) {
      this.cancelCategoryEdit();
    }
    this.categoryDeleted.emit(category);
  }

  private setFormValues(): void {
    if (!this.expense) {
      this.reset();
      return;
    }

    this.description = this.expense.description;
    this.amount = this.expense.amount;
    this.category = this.expense.category;
    this.date = this.expense.date;
    this.note = this.expense.note;
  }

  private reset(): void {
    this.description = '';
    this.amount = null;
    this.category = 'Food & drink';
    this.newCategory = '';
    this.categoryError = '';
    this.date = localDateString();
    this.note = '';
  }
}

function localDateString(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
