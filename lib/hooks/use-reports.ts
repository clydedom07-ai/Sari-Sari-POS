'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbUtil, STORES, Transaction, Customer, Product, EWalletTransaction } from '@/lib/db/idb';

export type SalesData = {
  date: string;
  amount: number;
  [branchId: string]: any; // For branch-specific amounts
};

export type CategoryData = {
  name: string;
  value: number;
};

export type TopProduct = {
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
};

export type ProfitData = {
  date: string;
  amount: number;
};

export function useReports(branchId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ewalletTransactions, setEwalletTransactions] = useState<EWalletTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [tData, ewData, cData, pData] = await Promise.all([
        dbUtil.getItems<Transaction>(STORES.TRANSACTIONS),
        dbUtil.getItems<EWalletTransaction>(STORES.EWALLET_TRANSACTIONS),
        dbUtil.getItems<Customer>(STORES.CUSTOMERS),
        dbUtil.getItems<Product>(STORES.PRODUCTS),
      ]);
      
      let filteredTransactions = tData.filter(t => !t.isDeleted);
      let filteredEwallet = ewData.filter(ew => !ew.isDeleted);
      let filteredProducts = pData.filter(p => !p.isDeleted);
      let filteredCustomers = cData.filter(c => !c.isDeleted);
      
      if (branchId) {
        filteredTransactions = filteredTransactions.filter(t => t.branchId === branchId);
        filteredEwallet = filteredEwallet.filter(ew => ew.branchId === branchId);
        filteredProducts = filteredProducts.filter(p => p.branchId === branchId);
        filteredCustomers = filteredCustomers.filter(c => c.branchId === branchId);
      }

      setTransactions(filteredTransactions);
      setEwalletTransactions(filteredEwallet);
      setCustomers(filteredCustomers);
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getFilteredStats = (days: number = 7) => {
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    const filteredTransactions = transactions.filter(t => t.timestamp >= cutoff);

    // Daily Sales for Chart
    const dailySalesMap = new Map<string, SalesData>();
    for (let i = 0; i < days; i++) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      dailySalesMap.set(dateStr, { date: dateStr, amount: 0 });
    }

    filteredTransactions.forEach(t => {
      const dateStr = new Date(t.timestamp).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      if (dailySalesMap.has(dateStr)) {
        const data = dailySalesMap.get(dateStr)!;
        data.amount += t.total;
        
        // Calculate cost for this transaction
        const transactionCost = t.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
        data.profit = (data.profit || 0) + (t.total - transactionCost);

        // Also track per branch if we are in "All Branches" mode
        if (!branchId) {
          data[t.branchId] = (data[t.branchId] || 0) + t.total;
        }
      }
    });

    const salesChartData: SalesData[] = Array.from(dailySalesMap.values()).reverse();

    // Category Distribution
    const categoryMap = new Map<string, number>();
    filteredTransactions.forEach(t => {
      t.items.forEach(item => {
        // We need to find the category of the product. 
        // Since TransactionItem doesn't have category, we look it up from products state
        const product = products.find(p => p.id === item.productId);
        const category = product?.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + (item.price * item.quantity));
      });
    });

    const categoryChartData: CategoryData[] = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Top Products
    const productStatsMap = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
    filteredTransactions.forEach(t => {
      t.items.forEach(item => {
        const stats = productStatsMap.get(item.productId) || { name: item.name, quantity: 0, revenue: 0, profit: 0 };
        stats.quantity += item.quantity;
        stats.revenue += item.price * item.quantity;
        stats.profit += (item.price - (item.costPrice || 0)) * item.quantity;
        productStatsMap.set(item.productId, stats);
      });
    });

    const topProducts: TopProduct[] = Array.from(productStatsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Branch-wise stats (only if all branches are selected)
    const branchStatsMap = new Map<string, { name: string; sales: number; transactions: number; utang: number }>();
    
    // We need branch names, so we might need to fetch branches too or pass them in.
    // For now, let's just use the branchId as key and we'll handle names in the UI or fetch them here.
    
    transactions.forEach(t => {
      const stats = branchStatsMap.get(t.branchId) || { name: 'Unknown Branch', sales: 0, transactions: 0, utang: 0 };
      stats.sales += t.total;
      stats.transactions += 1;
      branchStatsMap.set(t.branchId, stats);
    });

    customers.forEach(c => {
      const stats = branchStatsMap.get(c.branchId) || { name: 'Unknown Branch', sales: 0, transactions: 0, utang: 0 };
      stats.utang += c.totalUtang;
      branchStatsMap.set(c.branchId, stats);
    });

    const branchStats = Array.from(branchStatsMap.entries()).map(([id, stats]) => ({
      id,
      ...stats
    }));

    // Summaries
    const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalVatCollected = filteredTransactions.reduce((sum, t) => sum + (t.vatAmount || 0), 0);
    const totalVatableSales = filteredTransactions.reduce((sum, t) => sum + (t.vatableSales || 0), 0);
    
    // OR Range
    const orNumbers = filteredTransactions.map(t => t.orNumber).filter(Boolean) as string[];
    const orRange = orNumbers.length > 0 ? {
      start: orNumbers.sort()[0],
      end: orNumbers.sort()[orNumbers.length - 1]
    } : null;

    const totalCost = filteredTransactions.reduce((sum, t) => {
      return sum + t.items.reduce((iSum, item) => iSum + (item.costPrice || 0) * item.quantity, 0);
    }, 0);
    const totalProfit = totalSales - totalCost;
    const totalTransactions = filteredTransactions.length;
    const totalUtang = customers.reduce((sum, c) => sum + c.totalUtang, 0);

    // E-Wallet Summaries
    const filteredEwallet = ewalletTransactions.filter(ew => ew.createdAt >= cutoff);
    const totalCashIn = filteredEwallet.filter(ew => ew.type === 'cash_in').reduce((sum, ew) => sum + ew.amount, 0);
    const totalCashOut = filteredEwallet.filter(ew => ew.type === 'cash_out').reduce((sum, ew) => sum + ew.amount, 0);
    const totalEwalletFees = filteredEwallet.reduce((sum, ew) => sum + (ew.fee || 0), 0);

    return {
      totalSales,
      totalProfit,
      totalTransactions,
      totalUtang,
      totalCashIn,
      totalCashOut,
      totalEwalletFees,
      totalVatCollected,
      totalVatableSales,
      orRange,
      salesChartData,
      categoryChartData,
      topProducts,
      branchStats,
    };
  };

  const getDailySummary = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();

    const filteredTransactions = transactions.filter(t => t.timestamp >= startOfToday);
    const filteredEwallet = ewalletTransactions.filter(ew => ew.createdAt >= startOfToday);

    const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalVatCollected = filteredTransactions.reduce((sum, t) => sum + (t.vatAmount || 0), 0);
    const totalVatableSales = filteredTransactions.reduce((sum, t) => sum + (t.vatableSales || 0), 0);
    
    // OR Range
    const orNumbers = filteredTransactions.map(t => t.orNumber).filter(Boolean) as string[];
    const orRange = orNumbers.length > 0 ? {
      start: orNumbers.sort()[0],
      end: orNumbers.sort()[orNumbers.length - 1]
    } : null;

    const totalCost = filteredTransactions.reduce((sum, t) => {
      return sum + t.items.reduce((iSum, item) => iSum + (item.costPrice || 0) * item.quantity, 0);
    }, 0);
    const totalProfit = totalSales - totalCost;
    const totalTickets = filteredTransactions.length;
    
    const ewalletCount = filteredEwallet.length;
    const totalFees = filteredEwallet.reduce((sum, ew) => sum + (ew.fee || 0), 0);

    return {
      totalSales,
      totalProfit,
      totalTickets,
      ewalletCount,
      totalFees,
      totalVatCollected,
      totalVatableSales,
      orRange,
    };
  };

  return {
    loading,
    transactions,
    refresh,
    getFilteredStats,
    getDailySummary,
  };
}
