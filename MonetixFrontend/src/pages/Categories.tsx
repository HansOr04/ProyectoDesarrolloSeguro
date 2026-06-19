import React, { useEffect, useState } from 'react';
import { Category, CategoryStats, TransactionType } from '@/types/finance.types';
import categoriesService from '@/services/categories.service';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Loader from '@/components/common/Loader';
import { getId } from '@/utils/helpers';
import '@/styles/pages/Categories.css';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({ type: 'expense', isDefault: false });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cats, st] = await Promise.all([
        categoriesService.getAll(),
        categoriesService.getStats()
      ]);
      setCategories(cats);
      setStats(st);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setCurrentCategory(category);
      setIsEditing(true);
    } else {
      setCurrentCategory({ type: 'expense', isDefault: false });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCategory({ type: 'expense', isDefault: false });
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const catId = currentCategory.id || currentCategory._id;
      if (isEditing && catId) {
        await categoriesService.update(catId, currentCategory);
      } else {
        await categoriesService.create(currentCategory);
      }
      fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error al guardar la categoría.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      try {
        await categoriesService.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="categories-page">
      <div className="categories-page__header">
        <h1 className="categories-page__title">Categorías</h1>
        <Button onClick={() => handleOpenModal()}>+ Nueva Categoría</Button>
      </div>

      {/* Stats Grid */}
      {stats.length > 0 && (
        <div className="category-stats-grid">
          {stats.map((stat) => (
            <div key={stat.categoryId} className="category-stat-card">
              <h3 className="category-stat-card__name">
                <span className="category-stat-card__icon">📊</span>
                {stat.categoryName}
              </h3>
              <p className="category-stat-card__amount">
                ${stat.totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
              <p className="category-stat-card__count">
                {stat.transactionCount} transacciones
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table */}
      <Card>
        <div className="categories-desktop table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const catId = getId(category);
                return (
                  <tr key={catId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {category.icon && <span style={{ fontSize: '1.25rem' }}>{category.icon}</span>}
                        <span style={{ fontWeight: 500 }}>{category.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`cat-card__type cat-card__type--${category.type}`}>
                        {category.type === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                      </span>
                    </td>
                    <td>{category.description || '-'}</td>
                    <td>
                      <div className="table__actions" style={{ justifyContent: 'center' }}>
                        {!category.isDefault ? (
                          <>
                            <Button variant="secondary" size="sm" onClick={() => handleOpenModal(category)}>
                              Editar
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(catId)}>
                              Eliminar
                            </Button>
                          </>
                        ) : (
                          <span className="cat-card__system">Categoría del sistema</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="categories-mobile-list">
          {categories.map((category) => {
            const catId = getId(category);
            return (
              <div key={catId} className="cat-card">
                <div className="cat-card__top">
                  <div className="cat-card__name">
                    {category.icon && <span className="cat-card__icon">{category.icon}</span>}
                    {category.name}
                  </div>
                  <span className={`cat-card__type cat-card__type--${category.type}`}>
                    {category.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </div>
                <p className="cat-card__description">{category.description || 'Sin descripción'}</p>
                {!category.isDefault ? (
                  <div className="cat-card__actions">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenModal(category)}>
                      Editar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(catId)}>
                      Eliminar
                    </Button>
                  </div>
                ) : (
                  <span className="cat-card__system">Categoría del sistema</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Nombre"
            value={currentCategory.name || ''}
            onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
            required
          />
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select
              className="form-input"
              value={currentCategory.type}
              onChange={(e) => setCurrentCategory({ ...currentCategory, type: e.target.value as TransactionType })}
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>
          <Input
            label="Icono (Emoji)"
            value={currentCategory.icon || ''}
            onChange={(e) => setCurrentCategory({ ...currentCategory, icon: e.target.value })}
            placeholder="Ej: 🍔"
          />
          <Input
            label="Descripción"
            value={currentCategory.description || ''}
            onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
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

export default Categories;

