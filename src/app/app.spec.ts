import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { ExpenseStore } from './expense.store';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem('pennywise.expenses');
    localStorage.removeItem('pennywise.categories');
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  }, 15_000);

  it('should render the expense dashboard', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain("let's take a look");
    expect(compiled.querySelector('app-expense-form')).toBeTruthy();
    expect(compiled.querySelector('app-expense-list')).toBeTruthy();
  });

  it('should format expense amounts in Indian rupees', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    TestBed.inject(ExpenseStore).add({
      description: 'Test expense',
      amount: 125000,
      category: 'Food & drink',
      date: new Date().toISOString().slice(0, 10),
      note: '',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.total-card .summary-value')?.textContent).toContain('₹1,25,000.00');
    expect(compiled.querySelector('.expense-amount')?.textContent).toContain('₹1,25,000.00');
    expect(compiled.querySelector('.amount-input span')?.textContent).toContain('₹');
  });

  it('should allow adding an expense with a custom category', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const categoryInput = compiled.querySelector<HTMLInputElement>('[name="newCategory"]')!;
    categoryInput.value = 'pET CARE';
    categoryInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('.add-category-button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const categorySelect = compiled.querySelector<HTMLSelectElement>('#expense-category')!;
    expect(categorySelect.value).toBe('Pet care');
    expect(TestBed.inject(ExpenseStore).categories()).toContain('Pet care');

    const descriptionInput = compiled.querySelector<HTMLInputElement>('#expense-description')!;
    descriptionInput.value = 'Dog food';
    descriptionInput.dispatchEvent(new Event('input'));
    const amountInput = compiled.querySelector<HTMLInputElement>('#expense-amount')!;
    amountInput.value = '24.5';
    amountInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    compiled.querySelector<HTMLFormElement>('.expense-form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(TestBed.inject(ExpenseStore).expenses().some(
      (expense) => expense.description === 'Dog food' && expense.category === 'Pet care',
    )).toBe(true);
  });

  it('should rename and delete custom categories and their expenses', () => {
    const store = TestBed.inject(ExpenseStore);
    const category = store.addCategory('pET CARE');
    expect(category).toBe('Pet care');
    store.add({
      description: 'Dog food',
      amount: 24.5,
      category: category!,
      date: '2026-11-06',
      note: '',
    });

    expect(store.renameCategory(category!, 'ANIMAL care')).toBe('Animal care');
    expect(store.expenses()[0].category).toBe('Animal care');
    expect(store.categories()).toContain('Animal care');

    expect(store.deleteCategory('Animal care')).toBe(true);
    expect(store.categories()).not.toContain('Animal care');
    expect(store.expenses()).toHaveLength(0);
    expect(store.renameCategory('Food & drink', 'Meal')).toBeNull();
    expect(store.deleteCategory('Food & drink')).toBe(false);
  });

  it('should filter daily and monthly details and summarize yearly totals by month', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const store = TestBed.inject(ExpenseStore);
    for (const [description, date] of [
      ['Today expense', localDateStringForTest()],
      ['Midyear expense', '2026-06-15'],
      ['Second midyear expense', '2026-06-20'],
      ['January expense', '2026-01-03'],
      ['Older expense', '2025-06-15'],
    ]) {
      store.add({
        description,
        amount: description === 'Second midyear expense' ? 15 : 10,
        category: 'Other',
        date,
        note: '',
      });
    }
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.expense-table tbody tr')).toHaveLength(1);
    expect(compiled.textContent).toContain('Today expense');

    const monthTab = [...compiled.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((tab) => tab.textContent?.trim() === 'Monthly')!;
    monthTab.click();
    fixture.detectChanges();
    const monthInput = compiled.querySelector<HTMLInputElement>('[aria-label="Choose transaction month"]')!;
    monthInput.value = '2026-06';
    monthInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(compiled.querySelectorAll('.expense-table tbody tr')).toHaveLength(2);
    expect(compiled.textContent).toContain('Midyear expense');

    const todayExpense = store.expenses().find((expense) => expense.description === 'Today expense')!;
    store.remove(todayExpense.id);
    const yearTab = [...compiled.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((tab) => tab.textContent?.trim() === 'Yearly')!;
    yearTab.click();
    fixture.detectChanges();
    const yearInput = compiled.querySelector<HTMLInputElement>('[aria-label="Choose transaction year"]')!;
    yearInput.value = '2026';
    yearInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const yearlyRows = compiled.querySelectorAll<HTMLTableRowElement>('.expense-table tbody tr');
    expect(yearlyRows).toHaveLength(2);
    expect(compiled.textContent).not.toContain('Midyear expense');
    expect(yearlyRows[0].textContent).toContain('June');
    expect(yearlyRows[0].textContent).toContain('₹25.00');
    expect(yearlyRows[1].textContent).toContain('January');
    expect(yearlyRows[1].textContent).toContain('₹10.00');
  }, 15_000);
});

function localDateStringForTest(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
