import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatCompactRupiah, formatRupiah } from '@/lib/money';
import type { RevenueChartPoint } from '@/types/domain';

interface RevenueChartProps {
  data: RevenueChartPoint[];
  mode?: 'daily' | 'monthly';
  onModeChange?: (mode: 'daily' | 'monthly') => void;
  title?: string;
}

export function RevenueChart({
  data,
  mode,
  onModeChange,
  title = 'Grafik Omzet',
}: RevenueChartProps) {
  const hasRevenue = data.some((d) => d.revenue > 0);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-brand-900">{title}</h2>
        {mode && onModeChange && (
          <div className="inline-flex rounded-xl bg-stone-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onModeChange('daily')}
              className={`rounded-lg px-3 py-1.5 transition ${
                mode === 'daily' ? 'bg-white text-brand-900 shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => onModeChange('monthly')}
              className={`rounded-lg px-3 py-1.5 transition ${
                mode === 'monthly'
                  ? 'bg-white text-brand-900 shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Bulanan
            </button>
          </div>
        )}
      </div>

      {!hasRevenue ? (
        <div className="flex h-44 items-center justify-center rounded-xl bg-stone-50 text-sm text-muted">
          Belum ada omzet pada periode ini
        </div>
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 4, left: -12, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompactRupiah(v).replace('Rp ', '')}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#FFFBEB' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatRupiah(value), 'Omzet']}
              />
              <Bar dataKey="revenue" fill="#B45309" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

