import { Prediction } from '@/types/finance.types';

export const MODEL_NAMES: Record<string, string> = {
  linear_regression: 'Regresión Lineal',
  moving_average: 'Media Móvil',
  exponential_smoothing: 'Suavizado Exponencial',
};

export interface CombinedChartPoint {
  fecha: string;
  ingresos?: number;
  ingresosMin?: number;
  ingresosMax?: number;
  gastos?: number;
  gastosMin?: number;
  gastosMax?: number;
  ideal: number;
}

export interface PredictionChartData {
  combinedData: CombinedChartPoint[];
  modelName: string;
  confidence: number | undefined;
  createdAt: string | undefined;
}

function resolvePredictionsByType(predictions: Prediction[]): {
  latestIncome: Prediction | null;
  latestExpense: Prediction | null;
} {
  let latestIncome = predictions.find(p => p.type === 'income') ?? null;
  let latestExpense = predictions.find(p => p.type === 'expense') ?? null;

  // Fallback: if no type field, assume positional order
  if (!latestIncome && !latestExpense && predictions.length > 0) {
    latestIncome = predictions[0];
    latestExpense = predictions[1] ?? null;
  }
  return { latestIncome, latestExpense };
}

function buildDateMap(
  incomeData: any[],
  expenseData: any[]
): Map<string, Omit<CombinedChartPoint, 'ideal'>> {
  const map = new Map<string, Omit<CombinedChartPoint, 'ideal'>>();

  incomeData.forEach(point => {
    const fecha = new Date(point.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    map.set(point.date, {
      fecha,
      ingresos: point.amount || 0,
      ingresosMin: point.lowerBound || 0,
      ingresosMax: point.upperBound || point.amount || 0,
    });
  });

  expenseData.forEach(point => {
    const fecha = new Date(point.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const existing = map.get(point.date) ?? { fecha };
    map.set(point.date, {
      ...existing,
      gastos: point.amount || 0,
      gastosMin: point.lowerBound || 0,
      gastosMax: point.upperBound || point.amount || 0,
    });
  });

  return map;
}

export function buildPredictionChartData(predictions: Prediction[]): PredictionChartData {
  const { latestIncome, latestExpense } = resolvePredictionsByType(predictions);

  const incomeData = latestIncome?.predictions ?? [];
  const expenseData = latestExpense?.predictions ?? [];
  const dateMap = buildDateMap(incomeData, expenseData);

  const combinedData: CombinedChartPoint[] = Array.from(dateMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([, value]) => ({
      ...value,
      ideal: (value.ingresos ?? 0) - (value.gastos ?? 0),
    }));

  const modelType = latestIncome?.modelType ?? latestExpense?.modelType ?? 'linear_regression';

  return {
    combinedData,
    modelName: MODEL_NAMES[modelType] ?? modelType,
    confidence: latestIncome?.confidence ?? latestExpense?.confidence,
    createdAt: latestIncome?.createdAt ?? latestExpense?.createdAt,
  };
}
