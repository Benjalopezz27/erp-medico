import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Clock } from 'lucide-react';
import { StockMovementType, type IStockEvolutionPoint } from '../types/stock.types';

interface StockEvolutionChartProps {
  points: IStockEvolutionPoint[];
  minStock: number;
  truncated: boolean;
  baseUnitSymbol: string;
  currentStock: number;
  isLoading?: boolean;
}

const formatDateTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

const formatMovementType = (type: string) => {
  switch (type) {
    case StockMovementType.ENTRADA_COMPRA:
      return 'Entrada (Compra)';
    case StockMovementType.SALIDA_VENTA:
      return 'Salida (Venta)';
    case StockMovementType.MERMA:
      return 'Merma / Pérdida';
    case StockMovementType.AJUSTE_ENTRADA:
      return 'Ajuste Entrada';
    case StockMovementType.AJUSTE_SALIDA:
      return 'Ajuste Salida';
    case StockMovementType.DEVOLUCION_CLIENTE:
      return 'Devolución Cliente';
    case 'BASELINE':
      return 'Saldo Inicial del Período';
    default:
      return type;
  }
};

export const StockEvolutionChart: React.FC<StockEvolutionChartProps> = ({
  points,
  minStock,
  truncated,
  baseUnitSymbol,
  currentStock,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        data-testid="stock-evolution-loading"
        className="bg-card rounded-lg border border-border p-6 h-72 flex items-center justify-center animate-pulse text-muted-foreground text-sm"
      >
        Cargando gráfica de evolución...
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div
        data-testid="stock-evolution-empty"
        className="bg-card rounded-lg border border-border p-8 text-center space-y-2"
      >
        <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto" />
        <div className="text-sm font-medium text-foreground">
          Sin movimientos registrados en este período
        </div>
        <p className="text-xs text-muted-foreground">
          Saldo vigente a la fecha:{' '}
          <strong className="text-foreground">
            {currentStock.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            {baseUnitSymbol}
          </strong>
        </p>
      </div>
    );
  }

  const chartData = points.map((p, idx) => ({
    id: `${p.timestamp}-${idx}`,
    timestamp: p.timestamp,
    formattedDate: formatDateTime(p.timestamp),
    balance: p.balance,
    event: p.event,
    formattedEvent: formatMovementType(p.event),
    quantity: p.quantity,
  }));

  return (
    <div
      data-testid="stock-evolution-chart"
      className="bg-card rounded-lg border border-border p-4 sm:p-6 space-y-4"
      role="region"
      aria-label="Gráfico de evolución histórica de stock"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Evolución Histórica de Stock</h2>
        </div>

        {truncated && (
          <span
            data-testid="stock-evolution-truncated-badge"
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground"
          >
            <Clock className="w-3.5 h-3.5" />
            Mostrando últimos {points.length - 1} movimientos
          </span>
        )}
      </div>

      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />

            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />

            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              domain={[0, 'auto']}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover text-popover-foreground p-2.5 rounded-md shadow-md border border-border text-xs space-y-1">
                      <div className="font-semibold text-foreground">{data.formattedDate}</div>
                      <div className="text-muted-foreground">
                        Evento: <strong className="text-foreground">{data.formattedEvent}</strong>
                      </div>
                      {data.event !== 'BASELINE' && (
                        <div className="text-muted-foreground">
                          Cantidad:{' '}
                          <strong className="text-foreground">
                            {data.quantity} {baseUnitSymbol}
                          </strong>
                        </div>
                      )}
                      <div className="text-primary font-bold">
                        Saldo:{' '}
                        {data.balance.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {baseUnitSymbol}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {minStock > 0 && (
              <ReferenceLine
                y={minStock}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Mínimo: ${minStock}`,
                  position: 'right',
                  fill: '#f59e0b',
                  fontSize: 11,
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="balance"
              stroke="#2563eb"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#stockGradient)"
              dot={{ r: 3, fill: '#2563eb' }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
