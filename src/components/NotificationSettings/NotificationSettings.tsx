import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import './NotificationSettings.css';
import { useTranslation } from 'react-i18next';

interface NotificationSettingsProps {
  onSettingsChange?: (enabled: boolean) => void;
  enabled?: boolean;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onSettingsChange, enabled = false }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setIsSupported(notificationService.isSupported());
    setPermission(notificationService.getPermissionStatus());
  }, []);
  const { t } = useTranslation();

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setPermission(notificationService.getPermissionStatus());
    
    if (onSettingsChange) {
      onSettingsChange(granted);
    }

    if (granted) {
      // Show a test notification
      setTimeout(() => {
        notificationService.showHandRaisedNotification('Test Student', 'TEST');
      }, 500);
    }
  };

  if (!isSupported) {
    return (
      <div className="notification-settings">
          <div className="notification-status unsupported">
            <span className="status-icon">🚫</span>
            <span>{t('notifications.unsupported')}</span>
          </div>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <div className="notification-header">
        <span className="notification-icon">🔔</span>
        <span>{t('notifications.title')}</span>
      </div>
      
      {permission === 'denied' && (
        <div className="notification-status denied">
          <span className="status-icon">❌</span>
          <span>{t('notifications.blocked')}</span>
        </div>
      )}
      
      {permission === 'default' && (
        <div className="notification-status default">
          <button 
            className="enable-notifications-btn"
            onClick={handleEnableNotifications}
          >
            {t('notifications.enable')}
          </button>
          <small>{t('notifications.description')}</small>
        </div>
      )}
      
      {permission === 'granted' && (
          <div className="notification-status enabled">
          <span className="status-icon">✅</span>
          <span>{t('notifications.enabled')}</span>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;