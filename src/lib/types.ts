import type { PaymentCategory, PaymentStatus, TreasuryLine } from "@/lib/categories";
import type { TrafficLevel } from "@/lib/money";

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export type PaymentDTO = {
  id: number;
  line: TreasuryLine;
  currency: string;
  foreignAmount: string | null;
  exchangeRate: string | null;
  exchangeRateSource: string | null;
  date: string;
  amount: string;
  category: PaymentCategory;
  beneficiary: string;
  description: string;
  notes: string;
  status: PaymentStatus;
  createdBy: number;
  createdByName: string;
  paidAt: string | null;
  paidBy: number | null;
  paidByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  id: number;
  companyName: string;
  weeklyCap: string;
  checksWeeklyCap: string;
  greenMax: string;
  yellowMax: string;
};

export type CategoryBreakdown = {
  category: PaymentCategory;
  total: number;
  pending: number;
  paid: number;
};

export type DaySummary = {
  date: string;
  total: number;
  pending: number;
  paid: number;
  payments: PaymentDTO[];
};

export type WeekSummary = {
  weekNo: number;
  startISO: string;
  endISO: string;
  year: number;
  month: number;
  ownTotal: number;
  ownExpenseTotal: number;
  ownIncomeTotal: number;
  ownPending: number;
  ownPaid: number;
  carryoverTotal: number;
  carryoverCount: number;
  effectiveTotal: number;
  vsCap: number;
  traffic: TrafficLevel;
  days: DaySummary[];
  breakdown: CategoryBreakdown[];
  carryover: PaymentDTO[];
  rolledFriday: PaymentDTO[];
  pendingAgainstCap: PaymentDTO[];
};

export type ImportResult = {
  created: number;
  skipped: number;
  errors: string[];
};
