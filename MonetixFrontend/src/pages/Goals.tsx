import React, { useEffect, useState } from 'react';
import { Goal, GoalStatus } from '@/types/finance.types';
import goalsService from '@/services/goals.service';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Loader from '@/components/common/Loader';
import '@/styles/pages/Goals.css';

const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Partial<Goal>>({ status: 'active' });
  const [isEditing, setIsEditing] = useState(false);
  const [projections, setProjections] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await goalsService.getAll();
      const goalsArray = Array.isArray(data) ? data : ((data as any)?.items || []);
      setGoals(goalsArray);
      
      goalsArray.forEach(async (goal: Goal) => {
        const goalId = goal.id || goal._id;
        if (goal && goalId && goal.status === 'active') {
          try {
            const proj = await goalsService.getProjection(goalId);
            setProjections(prev => ({ ...prev, [goalId]: proj }));
          } catch (e) {
            // Silent fail for projections
          }
        }
      });
    } catch (error) {
      console.error('Error fetching goals:', error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (goal?: Goal) => {
    if (goal) {
      setCurrentGoal({
        ...goal,
        targetDate: new Date(goal.targetDate).toISOString().split('T')[0]
      });
      setIsEditing(true);
    } else {
      setCurrentGoal({ status: 'active' });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentGoal({ status: 'active' });
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const goalId = currentGoal.id || currentGoal._id;
      if (isEditing && goalId) {
        await goalsService.update(goalId, currentGoal);
      } else {
        await goalsService.create(currentGoal);
      }
      fetchGoals();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta meta?')) {
      try {
        await goalsService.delete(id);
        fetchGoals();
      } catch (error) {
        console.error('Error deleting goal:', error);
      }
    }
  };

  const getStatusClass = (status: GoalStatus) => {
    return `goal-card__status goal-card__status--${status}`;
  };

  const getStatusLabel = (status: GoalStatus) => {
    const labels = { active: 'Activa', completed: 'Completada', cancelled: 'Cancelada' };
    return labels[status] || status;
  };

  if (loading) return <Loader />;

  return (
    <div className="goals-page">
      <div className="goals-page__header">
        <h1 className="goals-page__title">Mis Metas</h1>
        <Button onClick={() => handleOpenModal()}>+ Nueva Meta</Button>
      </div>

      {goals.length === 0 ? (
        <div className="goals-empty">
          <div className="goals-empty__icon">🎯</div>
          <p className="goals-empty__text">No tienes metas creadas aún.</p>
          <Button onClick={() => handleOpenModal()}>Crear Primera Meta</Button>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => {
            const goalId = goal.id || goal._id || '';
            const projection = goalId ? projections[goalId] : null;
            const progress = goal.progress || ((goal.currentAmount / goal.targetAmount) * 100);
            const daysRemaining = Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isCompleted = progress >= 100;

            return (
              <div key={goalId} className="goal-card">
                <div className="goal-card__header">
                  <div>
                    <h3 className="goal-card__title">{goal.name}</h3>
                    <p className="goal-card__description">{goal.description || 'Sin descripción'}</p>
                  </div>
                  <span className={getStatusClass(goal.status)}>{getStatusLabel(goal.status)}</span>
                </div>

                {/* Progress Bar */}
                <div className="goal-card__progress">
                  <div className="goal-card__progress-header">
                    <span className="goal-card__progress-label">Progreso</span>
                    <span className="goal-card__progress-value">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="goal-card__progress-bar">
                    <div 
                      className={`goal-card__progress-fill ${isCompleted ? 'goal-card__progress-fill--completed' : 'goal-card__progress-fill--active'}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="goal-card__amounts">
                  <div className="goal-card__amount-item">
                    <p className="goal-card__amount-label">Actual</p>
                    <p className="goal-card__amount-value goal-card__amount-value--current">
                      ${goal.currentAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="goal-card__amount-item">
                    <p className="goal-card__amount-label">Meta</p>
                    <p className="goal-card__amount-value goal-card__amount-value--target">
                      ${goal.targetAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="goal-card__date">
                  <p className="goal-card__date-label">Fecha límite</p>
                  <p className="goal-card__date-value">{new Date(goal.targetDate).toLocaleDateString('es-ES')}</p>
                  {daysRemaining > 0 && (
                    <p className="goal-card__date-remaining">{daysRemaining} días restantes</p>
                  )}
                </div>

                {/* Projection */}
                {projection && (
                  <div className="goal-card__projection">
                    <p className="goal-card__projection-title">📊 Proyección</p>
                    <p className={`goal-card__projection-status ${projection.willAchieve ? 'goal-card__projection-status--success' : 'goal-card__projection-status--warning'}`}>
                      {projection.willAchieve ? '✓ Alcanzarás tu meta' : '⚠ No alcanzarás tu meta'}
                    </p>
                    <p className="goal-card__projection-amount">
                      Proyectado: ${projection.projectedAmount?.toLocaleString('es-ES', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="goal-card__actions">
                  <Button variant="secondary" size="sm" onClick={() => handleOpenModal(goal)}>Editar</Button>
                  {goalId && <Button variant="danger" size="sm" onClick={() => handleDelete(goalId)}>Eliminar</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? 'Editar Meta' : 'Nueva Meta'}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Nombre"
            value={currentGoal.name || ''}
            onChange={(e) => setCurrentGoal({ ...currentGoal, name: e.target.value })}
            required
          />
          
          <Input
            label="Monto Objetivo"
            type="number"
            step="0.01"
            value={currentGoal.targetAmount || ''}
            onChange={(e) => setCurrentGoal({ ...currentGoal, targetAmount: parseFloat(e.target.value) })}
            required
          />

          <Input
            label="Monto Actual"
            type="number"
            step="0.01"
            value={currentGoal.currentAmount || 0}
            onChange={(e) => setCurrentGoal({ ...currentGoal, currentAmount: parseFloat(e.target.value) })}
          />

          <Input
            label="Fecha Límite"
            type="date"
            value={currentGoal.targetDate || ''}
            onChange={(e) => setCurrentGoal({ ...currentGoal, targetDate: e.target.value })}
            required
          />

          <Input
            label="Descripción"
            value={currentGoal.description || ''}
            onChange={(e) => setCurrentGoal({ ...currentGoal, description: e.target.value })}
          />

          {isEditing && (
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-input"
                value={currentGoal.status}
                onChange={(e) => setCurrentGoal({ ...currentGoal, status: e.target.value as GoalStatus })}
              >
                <option value="active">Activa</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
          )}

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit">{isEditing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Goals;

