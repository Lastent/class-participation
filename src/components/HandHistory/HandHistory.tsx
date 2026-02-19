import React, { useState, useEffect } from 'react';
import { HandHistoryEntry } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { formatDateTime, getRelativeTime } from '../../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import './HandHistory.css';

interface HandHistoryProps {
  classCode: string;
  studentId: string;
  studentName: string;
  onClose: () => void;
}

const HandHistory: React.FC<HandHistoryProps> = ({ classCode, studentId, studentName, onClose }) => {
  const [history, setHistory] = useState<HandHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await firebaseService.getHandHistory(classCode, studentId);
        setHistory(data);
      } catch (err) {
        console.error('Error loading hand history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [classCode, studentId]);

  const getActionLabel = (entry: HandHistoryEntry): string => {
    if (entry.action === 'raised') {
      return t('handHistory.raised');
    } else if (entry.raisedBy === 'teacher') {
      return t('handHistory.loweredByTeacher', { name: entry.raisedByName || 'Teacher' });
    } else {
      return t('handHistory.loweredByStudent');
    }
  };

  const getActionIcon = (entry: HandHistoryEntry): string => {
    if (entry.action === 'raised') {
      return '🖐️';
    } else {
      return '👇';
    }
  };

  return (
    <div className="hand-history-overlay">
      <div className="hand-history-dialog">
        <div className="hand-history-header">
          <h2>{t('handHistory.title', { name: studentName })}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="hand-history-content">
          {loading ? (
            <div className="loading">
              <p>{t('handHistory.loading')}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <p>{t('handHistory.noEntries')}</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((entry, index) => (
                <div key={entry.id} className={`history-entry ${entry.action}`}>
                  <div className="entry-icon">{getActionIcon(entry)}</div>
                  <div className="entry-details">
                    <div className="entry-action">
                      {getActionLabel(entry)}
                    </div>
                    <div className="entry-time">
                      <span className="relative-time">{getRelativeTime(entry.timestamp)}</span>
                      <span className="full-time" title={formatDateTime(entry.timestamp)}>
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="entry-count">
                    #{history.length - index}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hand-history-footer">
          <div className="history-stats">
            <span className="stat-item">
              🖐️ {t('handHistory.totalRaises')}: {history.filter(e => e.action === 'raised').length}
            </span>
            <span className="stat-item">
              👇 {t('handHistory.totalLowers')}: {history.filter(e => e.action === 'lowered').length}
            </span>
          </div>
          <button className="close-dialog-button" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HandHistory;
