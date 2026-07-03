import React, { useEffect, useState } from 'react';
import { Prediction } from '@/types/finance.types';
import predictionsService from '@/services/predictions.service';
import { buildPredictionChartData } from '@/utils/predictionsHelpers';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Loader from '@/components/common/Loader';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import '@/styles/pages/Users.css';

const Predictions: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Debug: Log whenever predictions state changes
  useEffect(() => {
    // console.log('Predictions state updated:', predictions);
  }, [predictions]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [preds, ins] = await Promise.all([
        predictionsService.getAll(),
        predictionsService.getInsights()
      ]);
      
      // Ensure preds is an array - handle both array and object responses
      // API might return { success: true, data: [...] } or just [...]
      let predsArray: Prediction[] = [];
      if (Array.isArray(preds)) {
        predsArray = preds;
      } else if ((preds as any)?.data && Array.isArray((preds as any).data)) {
        predsArray = (preds as any).data;
      } else if ((preds as any)?.items) {
        predsArray = (preds as any).items;
      }

      setPredictions(predsArray);
      setInsights(ins);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // 1. Generate Global Income Prediction
      console.log('Generating global income prediction...');
      const incomeResult = await predictionsService.generate({
        type: 'income',
        months: 6,
        modelType: 'linear_regression'
      });
      // Manually tag the result to ensure frontend knows it's income
      const taggedIncome = { ...incomeResult, type: 'income' as const };
      console.log('Income result:', taggedIncome);

      // 2. Generate Global Expense Prediction
      console.log('Generating global expense prediction...');
      const expenseResult = await predictionsService.generate({
        type: 'expense',
        months: 6,
        modelType: 'linear_regression'
      });
      // Manually tag the result to ensure frontend knows it's expense
      const taggedExpense = { ...expenseResult, type: 'expense' as const };
      console.log('Expense result:', taggedExpense);

      // 3. Fetch updated insights
      console.log('Fetching updated insights...');
      const newInsights = await predictionsService.getInsights();

      // 4. Update state directly with the fresh, correctly tagged data
      // This bypasses potential backend issues where getAll() might return ambiguous data
      setPredictions([taggedIncome, taggedExpense]);
      setInsights(newInsights);

      alert('Predicciones globales generadas exitosamente!');
      
    } catch (error) {
      console.error('Error generating prediction:', error);
      if (error && typeof error === 'object' && 'response' in error) {
          console.error('Server response:', (error as any).response.data);
          alert('Error al generar predicción: ' + ((error as any).response.data?.message || 'Inténtalo de nuevo'));
      } else {
        alert('Error al generar predicción. Revisa la consola para más detalles.');
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="users-page">
      <div className="users-page__header">
        <h1 className="users-page__title">Predicciones Financieras</h1>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generando...' : 'Generar Nueva Predicción'}
        </Button>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Insights Section */}
        {insights && insights.data && (
          <>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>
              Análisis Financiero
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {/* Check if insights has summary property */}
              {insights.data.summary && (
                <>
                  {/* Total Transactions */}
                  {insights.data.summary.totalTransactions !== undefined && (
                    <Card key="total-transactions" style={{ 
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F0 100%)', 
                      border: '1px solid var(--color-border)', 
                      boxShadow: 'var(--shadow-md)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}>
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: 'var(--border-radius-lg)', 
                            background: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            color: '#FFFFFF'
                          }}>
                            📊
                          </div>
                          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Total Transacciones
                          </h3>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
                          {insights.data.summary.totalTransactions}
                        </p>
                      </div>
                    </Card>
                  )}

                  {/* Total Income */}
                  {insights.data.summary.totalIncome !== undefined && (
                    <Card key="total-income" style={{ 
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                      border: 'none', 
                      boxShadow: 'var(--shadow-md)',
                      color: '#FFFFFF'
                    }}>
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: 'var(--border-radius-lg)', 
                            background: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem'
                          }}>
                            💰
                          </div>
                          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'rgba(255, 255, 255, 0.9)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Ingresos Totales
                          </h3>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'var(--font-weight-bold)', color: '#FFFFFF', margin: 0 }}>
                          ${typeof insights.data.summary.totalIncome === 'number' ? insights.data.summary.totalIncome.toFixed(2) : insights.data.summary.totalIncome}
                        </p>
                      </div>
                    </Card>
                  )}

                  {/* Total Expense */}
                  {insights.data.summary.totalExpense !== undefined && (
                    <Card key="total-expense" style={{ 
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                      border: 'none', 
                      boxShadow: 'var(--shadow-md)',
                      color: '#FFFFFF'
                    }}>
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: 'var(--border-radius-lg)', 
                            background: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem'
                          }}>
                            💸
                          </div>
                          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'rgba(255, 255, 255, 0.9)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Gastos Totales
                          </h3>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'var(--font-weight-bold)', color: '#FFFFFF', margin: 0 }}>
                          ${typeof insights.data.summary.totalExpense === 'number' ? insights.data.summary.totalExpense.toFixed(2) : insights.data.summary.totalExpense}
                        </p>
                      </div>
                    </Card>
                  )}

                  {/* Balance */}
                  {insights.data.summary.balance !== undefined && (
                    <Card key="balance" style={{ 
                      background: insights.data.summary.balance >= 0 
                        ? 'linear-gradient(135deg, #809671 0%, #5a6b4f 100%)' 
                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: 'none', 
                      boxShadow: 'var(--shadow-md)',
                      color: '#FFFFFF'
                    }}>
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: 'var(--border-radius-lg)', 
                            background: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem'
                          }}>
                            {insights.data.summary.balance >= 0 ? '⚖️' : '⚠️'}
                          </div>
                          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'rgba(255, 255, 255, 0.9)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Balance Neto
                          </h3>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'var(--font-weight-bold)', color: '#FFFFFF', margin: 0 }}>
                          ${typeof insights.data.summary.balance === 'number' ? insights.data.summary.balance.toFixed(2) : insights.data.summary.balance}
                        </p>
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* Insights messages */}
              {insights.data.insights && Array.isArray(insights.data.insights) && insights.data.insights.length > 0 && (
                <Card style={{ 
                  background: '#FFFFFF', 
                  borderLeft: '4px solid var(--color-primary)', 
                  boxShadow: 'var(--shadow-md)', 
                  gridColumn: '1 / -1' 
                }}>
                  <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        background: '#FEF3C7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem'
                      }}>
                        �
                      </div>
                      <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
                        Recomendaciones Inteligentes
                      </h3>
                    </div>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {insights.data.insights.map((insight: string, index: number) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          gap: '1rem', 
                          alignItems: 'flex-start',
                          padding: '1rem',
                          backgroundColor: '#FAFAF8',
                          borderRadius: 'var(--border-radius-md)'
                        }}>
                          <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1.2rem' }}>•</span>
                          <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.6' }}>
                            {insight}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Combined Predictions Chart */}
        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginTop: '2rem' }}>
          Historial de Predicciones
        </h2>

        {predictions.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📈</div>
              <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                No hay predicciones generadas aún
              </p>
              <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)' }}>
                Haz clic en "Generar Nueva Predicción" para comenzar
              </p>
            </div>
          </Card>
        ) : (() => {
          const { combinedData, modelName, confidence, createdAt } = buildPredictionChartData(predictions);

          return (
            <Card style={{ overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ 
                padding: '2rem', 
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #809671 100%)',
                borderBottom: '1px solid var(--color-border)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: 'var(--border-radius-lg)', 
                        background: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                      }}>
                        📊
                      </div>
                      <h3 style={{ 
                        fontSize: 'var(--font-size-2xl)', 
                        fontWeight: 'var(--font-weight-bold)', 
                        color: '#FFFFFF', 
                        margin: 0 
                      }}>
                        {modelName}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                      {confidence !== undefined && (
                        <div>
                          <p style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.25rem' }}>
                            Nivel de Confianza
                          </p>
                          <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: '#FFFFFF', margin: 0 }}>
                            {(confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                      {createdAt && (
                        <div>
                          <p style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.25rem' }}>
                            Fecha de Generación
                          </p>
                          <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: '#FFFFFF', margin: 0 }}>
                            {new Date(createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.25rem' }}>
                          Período de Predicción
                        </p>
                        <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: '#FFFFFF', margin: 0 }}>
                          {combinedData.length} meses
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recharts Line Chart */}
              {combinedData.length > 0 && (
                <div style={{ padding: '2.5rem', backgroundColor: '#FAFAF8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: 'var(--border-radius-md)', 
                      background: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem'
                    }}>
                      📈
                    </div>
                    <h4 style={{ 
                      fontSize: 'var(--font-size-xl)', 
                      fontWeight: 'var(--font-weight-bold)', 
                      margin: 0, 
                      color: 'var(--color-text-primary)' 
                    }}>
                      Proyección Financiera
                    </h4>
                  </div>
                  <ResponsiveContainer width="100%" height={500}>
                    <AreaChart
                      data={combinedData}
                      margin={{ top: 20, right: 40, left: 10, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorIdeal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#809671" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#809671" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D4D4C8" opacity={0.5} />
                      <XAxis
                        dataKey="fecha"
                        stroke="#725C3A"
                        style={{ fontSize: '0.875rem', fontWeight: '500' }}
                        tick={{ fill: '#725C3A' }}
                      />
                      <YAxis
                        stroke="#725C3A"
                        style={{ fontSize: '0.875rem', fontWeight: '500' }}
                        tick={{ fill: '#725C3A' }}
                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '2px solid var(--color-primary)',
                          borderRadius: '12px',
                          padding: '16px',
                          boxShadow: 'var(--shadow-lg)'
                        }}
                        labelStyle={{ 
                          fontWeight: 'var(--font-weight-bold)', 
                          color: 'var(--color-text-primary)',
                          marginBottom: '8px'
                        }}
                        formatter={(value: any) => [`$${value.toFixed(2)}`, '']}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '30px' }}
                        iconType="line"
                      />
                      {/* Income area with confidence bands */}
                      <Area
                        type="monotone"
                        dataKey="ingresosMax"
                        stroke="none"
                        fill="url(#colorIncome)"
                        fillOpacity={0.3}
                        name="Rango Ingresos"
                      />
                      {/* Income line */}
                      <Line
                        type="monotone"
                        dataKey="ingresos"
                        stroke="#10b981"
                        strokeWidth={4}
                        dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#FFFFFF' }}
                        activeDot={{ r: 8, strokeWidth: 2 }}
                        name="Ingresos"
                      />
                      {/* Expense line */}
                      <Line
                        type="monotone"
                        dataKey="gastos"
                        stroke="#ef4444"
                        strokeWidth={4}
                        dot={{ fill: '#ef4444', r: 6, strokeWidth: 2, stroke: '#FFFFFF' }}
                        activeDot={{ r: 8, strokeWidth: 2 }}
                        name="Gastos"
                      />
                      {/* Ideal line (balance) */}
                      <Line
                        type="monotone"
                        dataKey="ideal"
                        stroke="#809671"
                        strokeWidth={3}
                        strokeDasharray="8 4"
                        dot={{ fill: '#809671', r: 5, strokeWidth: 2, stroke: '#FFFFFF' }}
                        activeDot={{ r: 7, strokeWidth: 2 }}
                        name="Balance Ideal"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div style={{ padding: '2.5rem', backgroundColor: '#FFFFFF', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: 'var(--border-radius-md)', 
                    background: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem'
                  }}>
                    📋
                  </div>
                  <h4 style={{ 
                    fontSize: 'var(--font-size-xl)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    margin: 0, 
                    color: 'var(--color-text-primary)' 
                  }}>
                    Detalle de Predicciones
                  </h4>
                </div>
                <div className="table-container" style={{ 
                  borderRadius: 'var(--border-radius-lg)', 
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <table className="table" style={{ marginBottom: 0 }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #F5F5F0 0%, #FAFAF8 100%)' }}>
                        <th style={{ 
                          padding: '1rem 1.5rem',
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: 'var(--color-text-primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Fecha Predicha
                        </th>
                        <th style={{ 
                          padding: '1rem 1.5rem',
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: '#10b981',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Ingresos
                        </th>
                        <th style={{ 
                          padding: '1rem 1.5rem',
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: '#ef4444',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Gastos
                        </th>
                        <th style={{ 
                          padding: '1rem 1.5rem',
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-bold)',
                          color: '#809671',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Balance Ideal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedData.map((point: any, index: number) => (
                        <tr key={index} style={{ 
                          borderBottom: index < combinedData.length - 1 ? '1px solid var(--color-border)' : 'none',
                          transition: 'background-color 0.2s ease'
                        }}>
                          <td style={{ 
                            padding: '1rem 1.5rem',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-text-primary)'
                          }}>
                            {point.fecha}
                          </td>
                          <td style={{ 
                            padding: '1rem 1.5rem',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 'var(--font-weight-bold)', 
                            color: '#10b981' 
                          }}>
                            ${(point.ingresos || 0).toFixed(2)}
                          </td>
                          <td style={{ 
                            padding: '1rem 1.5rem',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 'var(--font-weight-bold)', 
                            color: '#ef4444' 
                          }}>
                            ${(point.gastos || 0).toFixed(2)}
                          </td>
                          <td style={{ 
                            padding: '1rem 1.5rem',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 'var(--font-weight-bold)', 
                            color: '#809671' 
                          }}>
                            ${(point.ideal || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          );
        })()}
      </div>
    </div>
  );
};

export default Predictions;
