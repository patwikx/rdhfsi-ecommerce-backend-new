'use client';

import { useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { getSalesChartData } from '@/app/actions/dashboard-actions';
import { Loader2 } from 'lucide-react';
import { useCurrentSite } from '@/hooks/use-current-site';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';

type TimeRange = '7d' | '30d' | '90d';

type ChartData = {
  date: string;
  sales: number;
  orders: number;
}[];

const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
  orders: {
    label: 'Orders',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function SalesChart() {
  const { siteId } = useCurrentSite();
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [chartData, setChartData] = useState<ChartData>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Set default time range based on mobile
  useEffect(() => {
    if (isMobile) {
      setTimeRange('7d');
    }
  }, [isMobile]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const result = await getSalesChartData(days);
      
      if (result.success && result.data) {
        setChartData(result.data);
      }
      setIsLoading(false);
    }

    fetchData();
  }, [timeRange, siteId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Sales Overview</h3>
          <p className="text-sm text-muted-foreground">
            Total sales for the last {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '3 months'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Toggle Group */}
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value as TimeRange)}
            variant="outline"
            className="hidden sm:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>

          {/* Mobile Select */}
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger
              className="flex w-40 sm:hidden"
              size="sm"
              aria-label="Select a time range"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart Container */}
      <div className="rounded-lg border bg-card p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No sales data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-sales)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-sales)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-orders)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-orders)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value: string) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="orders"
                type="natural"
                fill="url(#fillOrders)"
                stroke="var(--color-orders)"
                stackId="a"
              />
              <Area
                dataKey="sales"
                type="natural"
                fill="url(#fillSales)"
                stroke="var(--color-sales)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
