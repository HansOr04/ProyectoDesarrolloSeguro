
// src/pages/Home.tsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/common/Button';
import Loader from '@/components/common/Loader';
import transactionsService from '@/services/transactions.service';
import { Transaction } from '@/types/finance.types';
import { useNavigate } from 'react-router-dom';
import { getId, getCategoryFromTransaction } from '@/utils/helpers';
import '@/styles/pages/Home.css';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    balance: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txsResponse] = await Promise.all([
        transactionsService.getAll({ limit: 5 }),
        transactionsService.getStatistics()
      ]);

      setTransactions(txsResponse.data || []);

      const allTxsResponse = await transactionsService.getAll();
      const allTxs = allTxsResponse.data || [];

      const inc = allTxs.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
      const exp = allTxs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
      setStats({ income: inc, expense: exp, balance: inc - exp });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      alert('Error: No se puede eliminar la transacción (ID no válido)');
      return;
    }
    
    if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      try {
        await transactionsService.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error al eliminar la transacción');
      }
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) return <Loader />;

  return (
    <div className="home-page">
      {/* Header */}
      <div className="home-page__header">
        <h1 className="home-page__title">
          Bienvenido, {user?.name?.split(' ')[0]}! <span className="home-page__title-emoji">👋</span>
        </h1>
        <Button onClick={() => navigate('/transactions')}>+ Nueva Transacción</Button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {/* Income Card */}
        <div className="stat-card stat-card--income">
          <div className="stat-card__header">
            <div className="stat-card__icon">💰</div>
            <h3 className="stat-card__label">Ingresos Totales</h3>
          </div>
          <p className="stat-card__value">${stats.income.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
        </div>

        {/* Expense Card */}
        <div className="stat-card stat-card--expense">
          <div className="stat-card__header">
            <div className="stat-card__icon">💸</div>
            <h3 className="stat-card__label">Gastos Totales</h3>
          </div>
          <p className="stat-card__value">${stats.expense.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
        </div>

        {/* Balance Card */}
        <div className={`stat-card ${stats.balance >= 0 ? 'stat-card--balance' : 'stat-card--negative'}`}>
          <div className="stat-card__header">
            <div className="stat-card__icon">{stats.balance >= 0 ? '📈' : '📉'}</div>
            <h3 className="stat-card__label">Balance Actual</h3>
          </div>
          <p className="stat-card__value">${stats.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="transactions-section">
        <div className="transactions-section__header">
          <h2 className="transactions-section__title">Transacciones Recientes</h2>
          <Button variant="secondary" size="sm" onClick={() => navigate('/transactions')}>
            Ver Todas →
          </Button>
        </div>
        
        {transactions.length === 0 ? (
          <div className="transactions-empty">
            <div className="transactions-empty__icon">📝</div>
            <p className="transactions-empty__title">No hay transacciones recientes</p>
            <p className="transactions-empty__text">
              Crea tu primera transacción para comenzar a llevar control de tus finanzas
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="transactions-desktop">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const txId = getId(transaction);
                    const category = getCategoryFromTransaction(transaction.categoryId) || transaction.category;
                    
                    return (
                      <tr key={txId}>
                        <td>{formatDate(transaction.date)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{category?.icon}</span>
                            <span>{category?.name || 'Sin categoría'}</span>
                          </div>
                        </td>
                        <td>{transaction.description || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`transaction-card__amount transaction-card__amount--${transaction.type}`}>
                            {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <div className="table__actions" style={{ justifyContent: 'center' }}>
                            <Button variant="secondary" size="sm" onClick={() => navigate('/transactions')}>
                              Editar
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(txId)}>
                              Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="transactions-mobile">
              {transactions.map((transaction) => {
                const txId = getId(transaction);
                const category = getCategoryFromTransaction(transaction.categoryId) || transaction.category;
                
                return (
                  <div key={txId} className="transaction-card">
                    <div className="transaction-card__top">
                      <div className="transaction-card__category">
                        <span className="transaction-card__icon">{category?.icon}</span>
                        <span className="transaction-card__name">{category?.name || 'Sin categoría'}</span>
                      </div>
                      <span className={`transaction-card__amount transaction-card__amount--${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </span>
                    </div>
                    <p className="transaction-card__description">{transaction.description || '-'}</p>
                    <div className="transaction-card__bottom">
                      <span className="transaction-card__date">{formatDate(transaction.date)}</span>
                      <div className="transaction-card__actions">
                        <Button variant="secondary" size="sm" onClick={() => navigate('/transactions')}>
                          Editar
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(txId)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;

