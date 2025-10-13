import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import './NotificationSettings.css';

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
          <span>Notifications not supported in this browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <div className="notification-header">
        <span className="notification-icon">🔔</span>
        <span>Notifications</span>
      </div>
      
      {permission === 'denied' && (
        <div className="notification-status denied">
          <span className="status-icon">❌</span>
          <span>Notifications blocked. Enable in browser settings.</span>
        </div>
      )}
      
      {permission === 'default' && (
        <div className="notification-status default">
          <button 
            className="enable-notifications-btn"
            onClick={handleEnableNotifications}
          >
            Enable Notifications
          </button>
          <small>Get notified when students raise hands or ask questions</small>
        </div>
      )}
      
      {permission === 'granted' && (
        <div className="notification-status enabled">
          <span className="status-icon">✅</span>
          <span>Notifications enabled</span>
          <button 
            className="test-notification-btn"
            onClick={() => notificationService.showHandRaisedNotification('Test Student', 'TEST')}
          >
            Test
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;