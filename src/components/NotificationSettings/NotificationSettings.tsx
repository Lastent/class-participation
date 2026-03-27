import React, { useState, useEffect, useRef } from 'react';
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
  const [isPaused, setIsPaused] = useState(notificationService.isPaused());
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(notificationService.getRemainingPauseMinutes());
  const [showPauseOptions, setShowPauseOptions] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const remainingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsSupported(notificationService.isSupported());
    setPermission(notificationService.getPermissionStatus());

    const unsubscribe = notificationService.onPauseChange((paused, remaining) => {
      setIsPaused(paused);
      setRemainingMinutes(remaining);
      if (!paused) setShowPauseOptions(false);
    });

    // Update remaining time every 30 seconds
    remainingInterval.current = setInterval(() => {
      if (notificationService.isPaused()) {
        setRemainingMinutes(notificationService.getRemainingPauseMinutes());
      }
    }, 30000);

    return () => {
      unsubscribe();
      if (remainingInterval.current) clearInterval(remainingInterval.current);
    };
  }, []);
  const { t } = useTranslation();

  const handlePause = (minutes?: number) => {
    notificationService.pauseNotifications(minutes);
    setShowPauseOptions(false);
    setCustomMinutes('');
  };

  const handleResume = () => {
    notificationService.resumeNotifications();
  };

  const handleCustomPause = () => {
    const mins = parseInt(customMinutes, 10);
    if (mins > 0) {
      handlePause(mins);
    }
  };

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
      
      {permission === 'granted' && !isPaused && (
        <div className="notification-status enabled">
          <span className="status-icon">✅</span>
          <span>{t('notifications.enabled')}</span>
          <button
            className="pause-notifications-btn"
            onClick={() => setShowPauseOptions(!showPauseOptions)}
          >
            {t('notifications.pause.button')}
          </button>
        </div>
      )}

      {permission === 'granted' && isPaused && (
        <div className="notification-status paused">
          <span className="status-icon">🔇</span>
          <span>
            {remainingMinutes
              ? t('notifications.pause.pausedFor', { minutes: remainingMinutes })
              : t('notifications.pause.pausedIndefinitely')}
          </span>
          <button
            className="resume-notifications-btn"
            onClick={handleResume}
          >
            {t('notifications.pause.resume')}
          </button>
        </div>
      )}

      {showPauseOptions && (
        <div className="pause-options">
          <div className="pause-presets">
            <button onClick={() => handlePause(5)}>5 min</button>
            <button onClick={() => handlePause(10)}>10 min</button>
            <button onClick={() => handlePause(15)}>15 min</button>
            <button onClick={() => handlePause(30)}>30 min</button>
          </div>
          <div className="pause-custom">
            <input
              type="number"
              min="1"
              max="180"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder={t('notifications.pause.customPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomPause()}
            />
            <button onClick={handleCustomPause} disabled={!customMinutes || parseInt(customMinutes, 10) <= 0}>
              {t('notifications.pause.set')}
            </button>
          </div>
          <button className="pause-indefinite-btn" onClick={() => handlePause()}>
            {t('notifications.pause.indefinitely')}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;