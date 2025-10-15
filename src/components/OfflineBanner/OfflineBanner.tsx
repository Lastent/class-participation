import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './OfflineBanner.css';

const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const { t } = useTranslation();
  if (online) return null;

  return (
    <div className="offline-banner">
      {t('offline.banner')}
    </div>
  );
};

export default OfflineBanner;
