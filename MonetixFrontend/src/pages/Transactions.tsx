import React, { useEffect, useState } from 'react';
import { Transaction, TransactionType, Category } from '@/types/finance.types';
import transactionsService, { TransactionFilters } from '@/services/transactions.service';
import categoriesService from '@/services/categories.service';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Loader from '@/components/common/Loader';
import { getId, getCategoryId, getCategoryFromTransaction } from '@/utils/helpers';
import '@/styles/pages/Transactions.css';

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 20 });
  const [totalPages, setTotalPages] = useState(1);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Partial<Transaction>>({ 
    type: 'expense', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const data = await categoriesService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await transactionsService.getAll(filters);
      setTransactions(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      const txId = getId(transaction);
      const catId = getCategoryId(transaction.categoryId);
      
      setCurrentTransaction({
        ...transaction,
        id: txId,
        categoryId: catId,
        date: new Date(transaction.date).toISOString().split('T')[0]
      });
      setIsEditing(true);
    } else {
      setCurrentTransaction({ 
        type: 'expense', 
        date: new Date().toISOString().split('T')[0] 
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentTransaction({ type: 'expense', date: new Date().toISOString().split('T')[0] });
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const txId = currentTransaction.id || currentTransaction._id;
      if (isEditing && txId) {
        await transactionsService.update(txId, currentTransaction);
      } else {
        await transactionsService.create(currentTransaction);
      }
      fetchTransactions();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      try {
        await transactionsService.delete(id);
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="transactions-page">
      <div className="transactions-page__header">
        <h1 className="transactions-page__title">Transacciones</h1>
        <Button onClick={() => handleOpenModal()}>+ Nueva Transacción</Button>
      </div>

      {/* Filters */}
      <div className="transactions-filters">
        <div className="transactions-filters__group">
          <label className="transactions-filters__label">Tipo</label>
          <select 
            className="form-input" 
            onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
            value={filters.type || ''}
          >
            <option value="">Todos los tipos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
          </select>
        </div>
        
        <div className="transactions-filters__group">
          <label className="transactions-filters__label">Categoría</label>
          <select 
            className="form-input" 
            onChange={(e) => handleFilterChange('categoryId', e.target.value || undefined)}
            value={filters.categoryId || ''}
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => {
              const catId = getId(cat);
              return (
                <option key={catId} value={catId}>{cat.name}</option>
              );
            })}
          </select>
        </div>

        <div className="transactions-filters__group">
          <label className="transactions-filters__label">Desde</label>
          <Input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>
        
        <div className="transactions-filters__group">
          <label className="transactions-filters__label">Hasta</label>
          <Input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
      </div>

      <Card>
        {loading ? <Loader /> : (
          <>
            {/* Desktop Table View */}
            <div className="transactions-desktop table-container">
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
                            <span>{category?.name || '-'}</span>
                          </div>
                        </td>
                        <td>{transaction.description || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`tx-card__amount tx-card__amount--${transaction.type}`}>
                            {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <div className="table__actions" style={{ justifyContent: 'center' }}>
                            <Button variant="secondary" size="sm" onClick={() => handleOpenModal(transaction)}>
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
            <div className="transactions-mobile-list">
              {transactions.map((transaction) => {
                const txId = getId(transaction);
                const category = getCategoryFromTransaction(transaction.categoryId) || transaction.category;
                
                return (
                  <div key={txId} className="tx-card">
                    <div className="tx-card__top">
                      <div className="tx-card__category">
                        <span className="tx-card__icon">{category?.icon}</span>
                        <span className="tx-card__cat-name">{category?.name || 'Sin categoría'}</span>
                      </div>
                      <span className={`tx-card__amount tx-card__amount--${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </span>
                    </div>
                    <p className="tx-card__description">{transaction.description || '-'}</p>
                    <div className="tx-card__bottom">
                      <span className="tx-card__date">{formatDate(transaction.date)}</span>
                      <span className={`tx-card__type-badge tx-card__type-badge--${transaction.type}`}>
                        {transaction.type === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                      </span>
                    </div>
                    <div className="tx-card__actions">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenModal(transaction)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(txId)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      <div className="transactions-pagination">
        <Button 
          variant="secondary" 
          disabled={filters.page === 1}
          onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
        >
          ← Anterior
        </Button>
        <span className="transactions-pagination__info">
          Página {filters.page} de {totalPages}
        </span>
        <Button 
          variant="secondary" 
          disabled={filters.page === totalPages}
          onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
        >
          Siguiente →
        </Button>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? 'Editar Transacción' : 'Nueva Transacción'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select
              className="form-input"
              value={currentTransaction.type}
              onChange={(e) => setCurrentTransaction({ ...currentTransaction, type: e.target.value as TransactionType })}
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>
          
          <Input
            label="Monto"
            type="number"
            step="0.01"
            value={currentTransaction.amount || ''}
            onChange={(e) => setCurrentTransaction({ ...currentTransaction, amount: parseFloat(e.target.value) })}
            required
          />

          <div className="form-group">
            <label className="form-label">Categoría</label>
            <select
              className="form-input"
              value={typeof currentTransaction.categoryId === 'string' ? currentTransaction.categoryId : ''}
              onChange={(e) => setCurrentTransaction({ ...currentTransaction, categoryId: e.target.value })}
              required
            >
              <option value="">Seleccionar categoría</option>
              {categories
                .filter(c => c.type === currentTransaction.type)
                .map(cat => {
                  const catId = getId(cat);
                  return (
                    <option key={catId} value={catId}>{cat.name}</option>
                  );
                })
              }
            </select>
          </div>

          <Input
            label="Fecha"
            type="date"
            value={currentTransaction.date || ''}
            onChange={(e) => setCurrentTransaction({ ...currentTransaction, date: e.target.value })}
            required
          />

          <Input
            label="Descripción"
            value={currentTransaction.description || ''}
            onChange={(e) => setCurrentTransaction({ ...currentTransaction, description: e.target.value })}
          />

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit">{isEditing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Transactions;

