export const EXPENSE_CATEGORIES = [
  'Food & drink',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Other',
] as const;

export type ExpenseCategory = string;

export interface ExpenseDraft {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  note: string;
}

export interface Expense extends ExpenseDraft {
  id: string;
}
