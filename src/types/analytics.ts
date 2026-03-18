// Analytics types for spending insights

export interface MonthlySpending {
  month: string;        // "2026-01"
  monthLabel: string;   // "ינואר 2026"
  total: number;
  invoiceCount: number;
}

export interface SupplierSpending {
  supplierId: string;
  supplierName: string;
  total: number;
  invoiceCount: number;
  avgPerInvoice: number;
  percentOfTotal: number;
  trend: number; // % change vs previous period
}

export interface MonthlySupplierSpending {
  month: string;
  monthLabel: string;
  supplierTotals: Record<string, number>;
}

export interface SpendingComparison {
  currentMonth: number;
  previousMonth: number;
  changePercent: number;
  currentLabel: string;
  previousLabel: string;
}

export interface CategorySpending {
  category: string;
  total: number;
  itemCount: number;
  percentOfTotal: number;
}

export interface PriceVolatilityScore {
  supplierId: string;
  supplierName: string;
  totalChanges: number;
  avgChangePercent: number;
  maxIncrease: number;
  increases: number;
  decreases: number;
  score: number; // 0-100, higher = more volatile
}

export interface SearchResult {
  type: 'invoice' | 'supplier' | 'product';
  id: string;
  title: string;
  subtitle: string;
  route: string;
  amount?: number;
  icon: 'invoice' | 'supplier' | 'product';
}
