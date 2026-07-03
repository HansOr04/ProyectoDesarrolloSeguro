import React, { useEffect, useState } from 'react';
import comparisonsService from '@/services/comparisons.service';
import categoriesService from '@/services/categories.service';
import predictionsService from '@/services/predictions.service';
import transactionsService from '@/services/transactions.service';
import { getDateRange } from '@/utils/date.utils';
import Card from '@/components/common/Card';
import Loader from '@/components/common/Loader';
import Select from '@/components/common/Select';
import { Category } from '@/types/finance.types';
import '@/styles/pages/Users.css';

const Comparisons: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'category' | 'temporal' | 'real-vs-predicted' | 'compare-categories'>('temporal');
  const [categoryData, setCategoryData] = useState<any>(null);
  const [temporalData, setTemporalData] = useState<any>(null);
  const [realVsPredicted, setRealVsPredicted] = useState<any>(null);
  const [compareCategoriesData, setCompareCategoriesData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCategoryA, setSelectedCategoryA] = useState<string>('');
  const [selectedCategoryB, setSelectedCategoryB] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedCategory, selectedPeriod, selectedCategoryA, selectedCategoryB]);

  const fetchCategories = async () => {
    try {
      const cats = await categoriesService.getAll();
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategory(cats[0]._id || cats[0].id || '');
        if (cats.length > 1) {
            setSelectedCategoryA(cats[0]._id || cats[0].id || '');
            setSelectedCategoryB(cats[1]._id || cats[1].id || '');
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCategoryData = async () => {
    if (!selectedCategory) return;
    const result = await comparisonsService.getByCategory({ categoryId: selectedCategory });
    setCategoryData(result);
  };

  const fetchTemporalData = async () => {
    const result = await comparisonsService.getTemporal({ period: selectedPeriod });
    setTemporalData(result);
  };

  const fetchRealVsPredicted = async () => {
    try {
      const result = await predictionsService.getAll();
      let predictions: any[] = [];
      if (Array.isArray(result)) {
        predictions = result;
      } else if ((result as any)?.data && Array.isArray((result as any).data)) {
        predictions = (result as any).data;
      } else if ((result as any)?.items) {
        predictions = (result as any).items;
      }
      if (predictions.length === 0) return;
      const predictionId = predictions[0]._id || predictions[0].id;
      if (predictionId) {
        const comparison = await comparisonsService.getRealVsPredicted(predictionId);
        setRealVsPredicted(comparison);
      }
    } catch (err) {
      console.error('Error fetching predictions for comparison:', err);
    }
  };

  const fetchCompareCategories = async () => {
    if (!selectedCategoryA || !selectedCategoryB) return;
    const { startDate, endDate } = getDateRange(selectedPeriod);
    const [incomeStats, expenseStats] = await Promise.all([
      transactionsService.getByCategory({ startDate, endDate, type: 'income' }),
      transactionsService.getByCategory({ startDate, endDate, type: 'expense' }),
    ]);
    const stats = [...(incomeStats || []), ...(expenseStats || [])];

    const getCategoryStats = (categoryId: string) => {
      const category = categories.find(c => (c._id || c.id) === categoryId);
      const stat = stats.find(s => {
        if (s.category && (s.category._id === categoryId || (s.category as any).id === categoryId)) return true;
        if ((s as any).categoryId === categoryId) return true;
        if (typeof (s as any)._id === 'string' && (s as any)._id === categoryId) return true;
        return false;
      });
      return {
        name: category?.name || 'Unknown',
        icon: category?.icon || '📦',
        total: stat ? stat.total : 0,
        count: stat ? stat.count : 0,
      };
    };

    const statsA = getCategoryStats(selectedCategoryA);
    const statsB = getCategoryStats(selectedCategoryB);
    const difference = statsA.total - statsB.total;
    setCompareCategoriesData({
      categoryA: statsA,
      categoryB: statsB,
      comparison: {
        difference,
        higherCategory: Math.abs(difference) < 0.01 ? 'equal' : (statsA.total > statsB.total ? 'A' : 'B'),
      },
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'category')           await fetchCategoryData();
      else if (activeTab === 'temporal')      await fetchTemporalData();
      else if (activeTab === 'real-vs-predicted') await fetchRealVsPredicted();
      else if (activeTab === 'compare-categories') await fetchCompareCategories();
    } catch (error: any) {
      console.error('Error fetching comparison data:', error);
      setError(error.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="users-page">
      <div className="users-page__header">
        <h1 className="users-page__title">Comparativas Financieras</h1>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        borderBottom: '2px solid #e5e7eb',
        padding: '0 0.5rem',
        overflowX: 'auto'
      }}>
        <button
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'category' ? 'bold' : 'normal',
            color: activeTab === 'category' ? '#809671' : '#6b7280',
            borderBottom: activeTab === 'category' ? '3px solid #809671' : '3px solid transparent',
            transition: 'all 0.2s ease',
            fontSize: '1rem',
            whiteSpace: 'nowrap'
          }}
          onClick={() => setActiveTab('category')}
        >
          📊 Por Categoría
        </button>
        <button
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'temporal' ? 'bold' : 'normal',
            color: activeTab === 'temporal' ? '#809671' : '#6b7280',
            borderBottom: activeTab === 'temporal' ? '3px solid #809671' : '3px solid transparent',
            transition: 'all 0.2s ease',
            fontSize: '1rem',
            whiteSpace: 'nowrap'
          }}
          onClick={() => setActiveTab('temporal')}
        >
          📈 Temporal
        </button>
        <button
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'real-vs-predicted' ? 'bold' : 'normal',
            color: activeTab === 'real-vs-predicted' ? '#809671' : '#6b7280',
            borderBottom: activeTab === 'real-vs-predicted' ? '3px solid #809671' : '3px solid transparent',
            transition: 'all 0.2s ease',
            fontSize: '1rem',
            whiteSpace: 'nowrap'
          }}
          onClick={() => setActiveTab('real-vs-predicted')}
        >
          🎯 Real vs Predicho
        </button>
        <button
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'compare-categories' ? 'bold' : 'normal',
            color: activeTab === 'compare-categories' ? '#809671' : '#6b7280',
            borderBottom: activeTab === 'compare-categories' ? '3px solid #809671' : '3px solid transparent',
            transition: 'all 0.2s ease',
            fontSize: '1rem',
            whiteSpace: 'nowrap'
          }}
          onClick={() => setActiveTab('compare-categories')}
        >
          ⚖️ Entre Categorías
        </button>
      </div>
      
      {error && (
        <div style={{ 
            padding: '1rem', 
            backgroundColor: '#fee2e2', 
            color: '#ef4444', 
            borderRadius: '0.5rem', 
            marginBottom: '1rem',
            textAlign: 'center'
        }}>
            {error}
        </div>
      )}

      {loading ? <Loader /> : (
        <div className="tab-content">
          {/* Por Categoría */}
          {activeTab === 'category' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <Select
                  label="Selecciona una categoría"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  options={categories.map(cat => ({
                    value: cat._id || cat.id || '',
                    label: `${cat.icon || ''} ${cat.name} (${cat.type === 'income' ? 'Ingreso' : 'Gasto'})`
                  }))}
                />
              </div>

              {categoryData ? (
                <Card>
                  <div style={{ padding: '2rem' }}>
                    <h2 className="text-xl font-bold mb-4">
                      Comparación: {categoryData.category?.name || 'Categoría'}
                    </h2>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '1.5rem',
                      marginBottom: '2rem'
                    }}>
                      <div style={{
                        padding: '1.5rem',
                        backgroundColor: '#f0f9ff',
                        borderRadius: '0.5rem',
                        border: '2px solid #3b82f6'
                      }}>
                        <p className="text-sm text-gray-500 mb-1">Período Anterior</p>
                        <p className="text-3xl font-bold" style={{ color: '#3b82f6' }}>
                          ${categoryData.previousPeriod?.total?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {categoryData.previousPeriod?.count || 0} transacciones
                        </p>
                      </div>

                      <div style={{
                        padding: '1.5rem',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '0.5rem',
                        border: '2px solid #10b981'
                      }}>
                        <p className="text-sm text-gray-500 mb-1">Período Actual</p>
                        <p className="text-3xl font-bold" style={{ color: '#10b981' }}>
                          ${categoryData.currentPeriod?.total?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {categoryData.currentPeriod?.count || 0} transacciones
                        </p>
                      </div>

                      <div style={{
                        padding: '1.5rem',
                        backgroundColor: '#fef3c7',
                        borderRadius: '0.5rem',
                        border: '2px solid #f59e0b'
                      }}>
                        <p className="text-sm text-gray-500 mb-1">Cambio</p>
                        <p className="text-3xl font-bold" style={{
                          color: categoryData.comparison?.difference >= 0 ? '#ef4444' : '#10b981'
                        }}>
                          {categoryData.comparison?.difference >= 0 ? '+' : ''}
                          {categoryData.comparison?.percentageChange?.toFixed(1) || '0'}%
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          ${Math.abs(categoryData.comparison?.difference || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p className="text-gray-500">No hay datos de comparación disponibles.</p>
                    <p className="text-sm text-gray-400 mt-2">Selecciona una categoría con transacciones.</p>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Temporal */}
          {activeTab === 'temporal' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <Select
                  label="Período de comparación"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'quarter' | 'year')}
                  options={[
                    { value: 'month', label: 'Mensual' },
                    { value: 'quarter', label: 'Trimestral' },
                    { value: 'year', label: 'Anual' }
                  ]}
                />
              </div>

              {temporalData && temporalData.periods && temporalData.periods.length > 0 ? (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <Card>
                    <div style={{ padding: '2rem' }}>
                      <h2 className="text-xl font-bold mb-4">Análisis Temporal - {selectedPeriod === 'month' ? 'Mensual' : selectedPeriod === 'quarter' ? 'Trimestral' : 'Anual'}</h2>

                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Período</th>
                              <th>Ingresos</th>
                              <th>Gastos</th>
                              <th>Balance</th>
                              <th>Tendencia</th>
                            </tr>
                          </thead>
                          <tbody>
                            {temporalData.periods.map((period: any, index: number) => (
                              <tr key={period.period || index}>
                                <td className="font-medium">{period.period}</td>
                                <td style={{ color: '#10b981', fontWeight: 'bold' }}>
                                  ${period.income?.toFixed(2) || '0.00'}
                                </td>
                                <td style={{ color: '#ef4444', fontWeight: 'bold' }}>
                                  ${period.expense?.toFixed(2) || '0.00'}
                                </td>
                                <td style={{
                                  color: period.balance >= 0 ? '#10b981' : '#ef4444',
                                  fontWeight: 'bold'
                                }}>
                                  ${period.balance?.toFixed(2) || '0.00'}
                                </td>
                                <td>
                                  {index > 0 && temporalData.periods[index - 1] && (
                                    <span style={{
                                      color: period.balance > temporalData.periods[index - 1].balance ? '#10b981' : '#ef4444'
                                    }}>
                                      {period.balance > temporalData.periods[index - 1].balance ? '↑' : '↓'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {temporalData.comparison && (
                        <div style={{
                          marginTop: '2rem',
                          padding: '1.5rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '0.5rem'
                        }}>
                          <h3 className="font-bold mb-2">Resumen de Cambios</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div>
                              <p className="text-sm text-gray-500">Cambio en Ingresos</p>
                              <p className="font-bold" style={{
                                color: temporalData.comparison.incomeChange >= 0 ? '#10b981' : '#ef4444'
                              }}>
                                {temporalData.comparison.incomeChange >= 0 ? '+' : ''}
                                {temporalData.comparison.incomeChange?.toFixed(2) || '0'}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Cambio en Gastos</p>
                              <p className="font-bold" style={{
                                color: temporalData.comparison.expenseChange >= 0 ? '#ef4444' : '#10b981'
                              }}>
                                {temporalData.comparison.expenseChange >= 0 ? '+' : ''}
                                {temporalData.comparison.expenseChange?.toFixed(2) || '0'}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Cambio en Balance</p>
                              <p className="font-bold" style={{
                                color: temporalData.comparison.balanceChange >= 0 ? '#10b981' : '#ef4444'
                              }}>
                                {temporalData.comparison.balanceChange >= 0 ? '+' : ''}
                                {temporalData.comparison.balanceChange?.toFixed(2) || '0'}%
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              ) : (
                <Card>
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p className="text-gray-500">No hay datos temporales disponibles.</p>
                    <p className="text-sm text-gray-400 mt-2">Crea transacciones para ver el análisis temporal.</p>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Real vs Predicho */}
          {activeTab === 'real-vs-predicted' && (
            <div>
              {realVsPredicted && (realVsPredicted.comparisons || realVsPredicted.comparison) ? (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <Card>
                    <div style={{ padding: '2rem' }}>
                      <h2 className="text-xl font-bold mb-4">Comparación Real vs Predicho</h2>
                      <p className="text-gray-600 mb-4">
                        Precisión general: <span className="font-bold" style={{ color: '#809671' }}>
                          {realVsPredicted.accuracyRate?.toFixed(1) || realVsPredicted.overallAccuracy?.toFixed(1) || '0'}%
                        </span>
                      </p>

                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Mes</th>
                              <th>Predicho</th>
                              <th>Real</th>
                              <th>Diferencia</th>
                              <th>Precisión</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(realVsPredicted.comparisons || realVsPredicted.comparison || []).map((item: any, index: number) => (
                              <tr key={item.month || index}>
                                <td className="font-medium">
                                    {item.date ? new Date(item.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : item.month}
                                </td>
                                <td style={{ color: '#3b82f6' }}>
                                  ${(item.predictedAmount !== undefined ? item.predictedAmount : item.predicted)?.toFixed(2) || '0.00'}
                                </td>
                                <td style={{ color: '#10b981' }}>
                                  ${(item.realAmount !== undefined ? item.realAmount : item.actual)?.toFixed(2) || '0.00'}
                                </td>
                                <td style={{
                                  color: Math.abs(item.difference) > 100 ? '#ef4444' : '#6b7280'
                                }}>
                                  {item.difference >= 0 ? '+' : ''}${item.difference?.toFixed(2) || '0.00'}
                                </td>
                                <td>
                                  <span style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '1rem',
                                    backgroundColor: (item.percentageError !== undefined ? (item.percentageError < 20) : (item.accuracy >= 75)) ? '#d1fae5' : '#fee2e2',
                                    color: (item.percentageError !== undefined ? (item.percentageError < 20) : (item.accuracy >= 75)) ? '#10b981' : '#ef4444',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                  }}>
                                    {item.percentageError !== undefined ? (100 - item.percentageError).toFixed(1) : item.accuracy?.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : (
                <Card>
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎯</div>
                    <h3 className="text-xl font-bold mb-2">Comparación Real vs Predicho</h3>
                    <p className="text-gray-600 mb-4">
                      Compara tus gastos reales con las predicciones generadas
                    </p>
                    <div style={{
                      backgroundColor: '#fef3c7',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      maxWidth: '500px',
                      margin: '0 auto'
                    }}>
                      <p className="text-sm text-gray-700">
                        No hay predicciones disponibles para comparar. Ve a la sección de Predicciones y genera una predicción primero.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Entre Categorías */}
          {activeTab === 'compare-categories' && (
            <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <Select
                        label="Categoría A"
                        value={selectedCategoryA}
                        onChange={(e) => setSelectedCategoryA(e.target.value)}
                        options={categories.map(cat => ({
                            value: cat._id || cat.id || '',
                            label: `${cat.icon || ''} ${cat.name}`
                        }))}
                    />
                    <Select
                        label="Categoría B"
                        value={selectedCategoryB}
                        onChange={(e) => setSelectedCategoryB(e.target.value)}
                        options={categories.map(cat => ({
                            value: cat._id || cat.id || '',
                            label: `${cat.icon || ''} ${cat.name}`
                        }))}
                    />
                    <Select
                        label="Período"
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'quarter' | 'year')}
                        options={[
                            { value: 'month', label: 'Mensual' },
                            { value: 'quarter', label: 'Trimestral' },
                            { value: 'year', label: 'Anual' }
                        ]}
                    />
                </div>

                {compareCategoriesData ? (
                    <Card>
                        <div style={{ padding: '2rem' }}>
                            <h2 className="text-xl font-bold mb-6 text-center">
                                {compareCategoriesData.categoryA.name} vs {compareCategoriesData.categoryB.name}
                            </h2>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                gap: '2rem'
                            }}>
                                {/* Category A Card */}
                                <div style={{
                                    padding: '1.5rem',
                                    backgroundColor: '#f0f9ff',
                                    borderRadius: '1rem',
                                    border: '1px solid #bae6fd',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                                        {compareCategoriesData.categoryA.icon}
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">{compareCategoriesData.categoryA.name}</h3>
                                    <p className="text-3xl font-bold text-blue-600 mb-1">
                                        ${compareCategoriesData.categoryA.total.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {compareCategoriesData.categoryA.count} transacciones
                                    </p>
                                </div>

                                {/* Comparison Stats */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}>
                                    <div style={{
                                        padding: '1rem 2rem',
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: '2rem',
                                        fontWeight: 'bold',
                                        color: '#4b5563'
                                    }}>
                                        Diferencia: ${Math.abs(compareCategoriesData.comparison.difference).toFixed(2)}
                                    </div>
                                    <div style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 'bold',
                                        color: compareCategoriesData.comparison.higherCategory === 'A' ? '#3b82f6' : 
                                               compareCategoriesData.comparison.higherCategory === 'B' ? '#ef4444' : '#6b7280'
                                    }}>
                                        {compareCategoriesData.comparison.higherCategory === 'A' ? `Mayor gasto en ${compareCategoriesData.categoryA.name}` :
                                         compareCategoriesData.comparison.higherCategory === 'B' ? `Mayor gasto en ${compareCategoriesData.categoryB.name}` :
                                         'Gasto igual'}
                                    </div>
                                </div>

                                {/* Category B Card */}
                                <div style={{
                                    padding: '1.5rem',
                                    backgroundColor: '#fef2f2',
                                    borderRadius: '1rem',
                                    border: '1px solid #fecaca',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                                        {compareCategoriesData.categoryB.icon}
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">{compareCategoriesData.categoryB.name}</h3>
                                    <p className="text-3xl font-bold text-red-600 mb-1">
                                        ${compareCategoriesData.categoryB.total.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {compareCategoriesData.categoryB.count} transacciones
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Card>
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <p className="text-gray-500">Selecciona dos categorías para comparar.</p>
                        </div>
                    </Card>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Comparisons;
