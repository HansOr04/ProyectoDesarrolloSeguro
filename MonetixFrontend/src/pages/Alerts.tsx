import React, { useEffect, useState } from 'react';
import { Alert } from '@/types/finance.types';
import alertsService from '@/services/alerts.service';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Loader from '@/components/common/Loader';
import '@/styles/pages/Alerts.css';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertsService.getAll();
      const alertsArray = Array.isArray(data) ? data : ((data as any)?.items || []);
      setAlerts(alertsArray);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await alertsService.markAsRead(id);
      setAlerts(prev => prev.map(a => {
        const aId = a.id || a._id;
        return aId === id ? { ...a, isRead: true } : a;
      }));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await alertsService.markAllAsRead();
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar esta alerta?')) {
      try {
        await alertsService.delete(id);
        setAlerts(prev => prev.filter(a => {
          const aId = a.id || a._id;
          return aId !== id;
        }));
      } catch (error) {
        console.error('Error deleting alert:', error);
      }
    }
  };

  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      recommendation: '🤖',
      overspending: '💸',
      goal_progress: '🎯',
      unusual_pattern: '📈',
    };
    return icons[type] || 'ℹ️';
  };

  const getSeverityBadgeClass = (severity: string): string => {
    const classes: Record<string, string> = {
      info: 'badge--info',
      warning: 'badge--warning',
      critical: 'badge--danger',
    };
    return classes[severity] || 'badge--info';
  };

  if (loading) return <Loader />;

  return (
    <div className="alerts-page">
      <div className="alerts-page__header">
        <h1 className="alerts-page__title">Alertas y Notificaciones</h1>
        {alerts.some(a => !a.isRead) && (
          <Button variant="secondary" onClick={handleMarkAllAsRead}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {alerts.length === 0 ? (
        <Card className="card-glass">
          <div className="alerts-page__empty">
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔔</span>
            <p>No tienes alertas en este momento.</p>
            <p style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.5rem' }}>
              Las alertas aparecerán cuando detectemos patrones en tus finanzas.
            </p>
          </div>
        </Card>
      ) : (
        <div className="alerts-grid">
          {alerts.map((alert) => {
            const alertId = alert.id || alert._id;
            const severityClass = `alert-card--${alert.severity}`;
            const readClass = alert.isRead ? 'alert-card--read' : 'alert-card--unread';

            return (
              <div
                key={alertId}
                className={`alert-card ${severityClass} ${readClass}`}
              >
                <div className="alert-card__content">
                  <div className="alert-card__body">
                    <div className="alert-card__header">
                      <span className="alert-card__icon">{getTypeIcon(alert.type)}</span>
                      <div className="alert-card__badges">
                        <span className={`badge ${getSeverityBadgeClass(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        {!alert.isRead && (
                          <span className="badge badge--primary">Nuevo</span>
                        )}
                        {alert.type === 'recommendation' && (
                          <span className="badge badge--ai">IA</span>
                        )}
                      </div>
                    </div>
                    <h3 className="alert-card__type">{alert.type.replace('_', ' ')}</h3>
                    <p className="alert-card__message">{alert.message}</p>
                    {alert.createdAt && (
                      <p className="alert-card__date">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="alert-card__actions">
                    {!alert.isRead && alertId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleMarkAsRead(alertId)}
                      >
                        Marcar leída
                      </Button>
                    )}
                    {alertId && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(alertId)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Alerts;

