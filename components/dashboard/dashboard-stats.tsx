'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  stats: {
    totalRevenue: number;
    revenueChange: number;
    totalOrders: number;
    ordersChange: number;
    totalCustomers: number;
    customersChange: number;
    averageOrderValue: number;
    aovChange: number;
  };
}

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  trend: string;
  subtitle: string;
}

function StatCard({ title, value, change, trend, subtitle }: StatCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="p-6 rounded-lg border bg-card space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="flex items-center gap-1 text-xs">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span className={cn(
            "font-medium",
            isPositive ? "text-emerald-500" : "text-red-500"
          )}>
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Value */}
      <div className="text-3xl font-bold text-foreground">{value}</div>

      {/* Footer */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-sm text-foreground">
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          <span className="font-medium">{trend}</span>
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Revenue"
        value={`₱${stats.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        change={stats.revenueChange}
        trend={stats.revenueChange >= 0 ? 'Trending up this month' : 'Down this period'}
        subtitle="Revenue for the last 30 days"
      />

      <StatCard
        title="Total Orders"
        value={stats.totalOrders.toLocaleString()}
        change={stats.ordersChange}
        trend={stats.ordersChange >= 0 ? 'Up from last month' : 'Down from last month'}
        subtitle="Orders need processing"
      />

      <StatCard
        title="New Customers"
        value={stats.totalCustomers.toLocaleString()}
        change={stats.customersChange}
        trend={stats.customersChange >= 0 ? 'Strong user retention' : 'Acquisition needs attention'}
        subtitle="Customer growth this month"
      />

      <StatCard
        title="Avg Order Value"
        value={`₱${stats.averageOrderValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        change={stats.aovChange}
        trend={stats.aovChange >= 0 ? 'Steady performance increase' : 'Below target'}
        subtitle="Average transaction value"
      />
    </div>
  );
}
