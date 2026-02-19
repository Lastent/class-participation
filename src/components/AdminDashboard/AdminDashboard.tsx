import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { formatDateTime, getRelativeTime } from '../../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import './AdminDashboard.css';

interface ClassInfo {
  code: string;
  name: string;
  createdAt: Date;
  closeAt: Date;
  state: string;
}

const AdminDashboard: React.FC = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassCode, setSelectedClassCode] = useState<string | null>(null);
  const [classStats, setClassStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const allClasses = await firebaseService.getAllClasses();
      // Sort by createdAt descending (newest first)
      const sorted = (allClasses as ClassInfo[]).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setClasses(sorted);
    } catch (err) {
      console.error('Error loading classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassStats = async (classCode: string) => {
    try {
      setStatsLoading(true);
      const stats = await firebaseService.getClassStatistics(classCode);
      setClassStats(stats);
      setSelectedClassCode(classCode);
    } catch (err) {
      console.error('Error loading class stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>📊 {t('admin.title')}</h1>
        <p className="admin-subtitle">{t('admin.subtitle')}</p>
      </header>

      <div className="admin-content">
        <div className="classes-list-section">
          <h2>{t('admin.classes')}</h2>
          {loading ? (
            <div className="loading-state">
              <p>{t('admin.loadingClasses')}</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="empty-state">
              <p>{t('admin.noClasses')}</p>
            </div>
          ) : (
            <div className="classes-list">
              {classes.map(classItem => (
                <div
                  key={classItem.code}
                  className={`class-item ${selectedClassCode === classItem.code ? 'selected' : ''}`}
                  onClick={() => loadClassStats(classItem.code)}
                >
                  <div className="class-item-header">
                    <h3>{classItem.name}</h3>
                    <span className="class-code">{classItem.code}</span>
                  </div>
                  <div className="class-item-meta">
                    <span className="class-date">
                      📅 {classItem.createdAt ? formatDateTime(classItem.createdAt) : 'Unknown'}
                    </span>
                    <span className={`class-state ${classItem.state}`}>
                      {classItem.state === 'closed' ? t('admin.closed') : t('admin.open')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedClassCode && (
          <div className="stats-section">
            {statsLoading ? (
              <div className="loading-state">
                <p>{t('admin.loadingStats')}</p>
              </div>
            ) : classStats ? (
              <>
                <div className="stats-header">
                  <h2>{classStats.name}</h2>
                  <p className="stats-code">{t('admin.code')}: {classStats.code}</p>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                      <div className="stat-label">{t('admin.stats.totalStudents')}</div>
                      <div className="stat-value">{classStats.totalStudents}</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">❓</div>
                    <div className="stat-content">
                      <div className="stat-label">{t('admin.stats.totalQuestions')}</div>
                      <div className="stat-value">{classStats.totalQuestions}</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">✓</div>
                    <div className="stat-content">
                      <div className="stat-label">{t('admin.stats.answeredQuestions')}</div>
                      <div className="stat-value">{classStats.answeredQuestions}</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">✋</div>
                    <div className="stat-content">
                      <div className="stat-label">{t('admin.stats.handRaises')}</div>
                      <div className="stat-value">{classStats.totalHandRaises}</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">⏱️</div>
                    <div className="stat-content">
                      <div className="stat-label">{t('admin.stats.duration')}</div>
                      <div className="stat-value">{formatDuration(classStats.durationMinutes)}</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                      <div className="stat-label">{t('admin.stats.created')}</div>
                      <div className="stat-value-small">{formatDateTime(classStats.createdAt)}</div>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h3>{t('admin.studentDetails')}</h3>
                  {classStats.students.length === 0 ? (
                    <p className="empty-detail">{t('admin.noStudents')}</p>
                  ) : (
                    <div className="students-table">
                      <div className="table-header">
                        <div className="col-name">{t('admin.studentTable.name')}</div>
                        <div className="col-hands">{t('admin.studentTable.handRaises')}</div>
                        <div className="col-hands">{t('admin.studentTable.lowers')}</div>
                      </div>
                      {classStats.students.map((student: any) => {
                        const stats = classStats.handRaiseStats[student.id] || {
                          totalRaises: 0,
                          totalLowers: 0
                        };
                        return (
                          <div key={student.id} className="table-row">
                            <div className="col-name">{student.name}</div>
                            <div className="col-hands">{stats.totalRaises}</div>
                            <div className="col-hands">{stats.totalLowers}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="details-section">
                  <h3>{t('admin.questions')} ({classStats.totalQuestions})</h3>
                  {classStats.questions.length === 0 ? (
                    <p className="empty-detail">{t('admin.noQuestions')}</p>
                  ) : (
                    <div className="questions-list">
                      {classStats.questions.map((question: any) => {
                        const studentName = classStats.students.find(
                          (s: any) => s.id === question.studentId
                        )?.name || t('admin.unknown');
                        return (
                          <div key={question.id} className={`question-item ${question.status}`}>
                            <div className="question-text">{question.text}</div>
                            <div className="question-meta">
                              <span className="question-student">{t('admin.questionMeta.by')} {studentName}</span>
                              <span className={`question-status ${question.status}`}>
                                {question.status === 'answered' ? t('admin.questionMeta.answered') : t('admin.questionMeta.pending')}
                              </span>
                              <span className="question-time">
                                {question.createdAt ? getRelativeTime(question.createdAt) : t('admin.unknown')}
                              </span>
                            </div>
                            {question.answer && (
                              <div className="question-answer">
                                <strong>{t('admin.questionMeta.answerFrom')} {question.answeredBy}:</strong>
                                <p>{question.answer}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>{t('admin.errorLoading')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
