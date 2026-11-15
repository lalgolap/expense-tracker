import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Expense, ExpenseCategory } from '../expense.model';

@Component({
  selector: 'app-expense-list',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
})
export class ExpenseList {
  @Input() expenses: Expense[] = [];
  @Input() hasExpenses = false;
  @Input() period: 'daily' | 'monthly' | 'yearly' = 'daily';
  @Output() editExpense = new EventEmitter<Expense>();
  @Output() deleteExpense = new EventEmitter<Expense>();

  protected get monthlyTotals(): { month: string; total: number }[] {
    const totals = new Map<string, number>();
    for (const expense of this.expenses) {
      const month = expense.date.slice(0, 7);
      totals.set(month, (totals.get(month) ?? 0) + expense.amount);
    }

    return [...totals.entries()]
      .sort(([first], [second]) => second.localeCompare(first))
      .map(([month, total]) => ({ month, total }));
  }

  protected categoryIcon(category: ExpenseCategory): string {
    switch (category) {
      case 'Food & drink': return '☕';
      case 'Transport': return '↗';
      case 'Shopping': return '⌑';
      case 'Bills': return '▤';
      case 'Health': return '✚';
      case 'Other': return '✦';
      default: return '•';
    }
  }

  protected categoryColor(category: ExpenseCategory): string {
    switch (category) {
      case 'Food & drink': return 'food';
      case 'Transport': return 'transport';
      case 'Shopping': return 'shopping';
      case 'Bills': return 'bills';
      case 'Health': return 'health';
      case 'Other': return 'other';
      default: return 'other';
    }
  }
}
