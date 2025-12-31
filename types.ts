export enum Currency {
  CNY = 'CNY',
  USD = 'USD',
  EUR = 'EUR',
  JPY = 'JPY',
  HKD = 'HKD',
  KRW = 'KRW'
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER'
}

export enum TransactionStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING'
}

export enum AccountType {
  SAVINGS = 'SAVINGS',       // 日常储蓄 (Cash, Debit)
  INVESTMENT = 'INVESTMENT', // 理财储蓄 (Stocks, Funds, Alipay)
  CREDIT = 'CREDIT',         // 透支消费 (Credit Card, Huabei)
  LOAN = 'LOAN'              // Long term debt
}

export interface User {
  id: string;
  username: string;
  email: string;
}

// Default Expense Categories
export const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Shopping', 
  'Entertainment', 'Health', 'Insurance', 'Family', 'Other'
] as const;

// Default Income Categories
export const INCOME_CATEGORIES = [
  'Salary', 'Bonus', 'Part-time', 'Investment', 'Gift', 'Other'
] as const;

export type Category = typeof EXPENSE_CATEGORIES[number] | typeof INCOME_CATEGORIES[number] | string;

export interface InvestmentHolding {
  code?: string;
  name: string; // e.g., "Alipay Gold Fund" or "Tesla"
  amount: number; // Total value
  dailyChange?: number; // P&L amount today
  quantity?: number; // Number of shares/units
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  color: string;
  lastCheckIn?: string; 
  holdings?: InvestmentHolding[]; // Specific for INVESTMENT accounts
}

export interface Transaction {
  id: string;
  date: string; // Transaction/Earning Date
  expectedDate?: string; // Arrival/Settlement Date
  amount: number;
  currency: Currency;
  type: TransactionType;
  category: string;
  tags: string[]; // Custom tags
  accountId: string;
  toAccountId?: string; // For transfers
  note: string;
  status: TransactionStatus;
  // Feature: Long-term consumption
  isAmortized: boolean; 
  amortizationMonths: number;
  // Feature: Recurring
  isRecurring?: boolean;
}

export interface RecurringRule {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  category: string;
  frequency: 'MONTHLY' | 'YEARLY';
  nextDueDate: string;
  accountId: string;
}

export const EXCHANGE_RATES: Record<Currency, number> = {
  [Currency.CNY]: 1,
  [Currency.USD]: 7.2,
  [Currency.EUR]: 7.8,
  [Currency.JPY]: 0.048,
  [Currency.HKD]: 0.92,
  [Currency.KRW]: 0.0052
};