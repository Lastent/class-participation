// Teacher Class Screen - equivalent to your TeacherClassScreen in Kotlin

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { firebaseService } from '../../services/firebaseService';
import { notificationService } from '../../services/notificationService';
import { Student, Question } from '../../types';
import { formatDateTime, getRelativeTime } from '../../utils/dateUtils';
import NotificationSettings from '../NotificationSettings/NotificationSettings';
import HandHistory from '../HandHistory/HandHistory';
import './TeacherClass.css';
import { useTranslation } from 'react-i18next';

const TeacherClass: React.FC = () => {
  const { classCode } = useParams<{ classCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const [className, setClassName] = useState<string>('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [error, setError] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answerText, setAnswerText] = useState('');
  
  // Refs for cleanup and tracking previous state
  const studentsUnsubscribe = useRef<(() => void) | null>(null);
  const questionsUnsubscribe = useRef<(() => void) | null>(null);
  const previousStudents = useRef<Student[]>([]);
  const previousQuestions = useRef<Question[]>([]);
  const notificationsEnabledRef = useRef<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!classCode) {
      navigate('/');
      return;
    }

    // Initialize notification status
    const initialNotificationStatus = notificationService.isEnabled();
    setNotificationsEnabled(initialNotificationStatus);
    notificationsEnabledRef.current = initialNotificationStatus;

    // Get class name from location state or fetch from Firebase
    const stateClassName = location.state?.className;
    if (stateClassName) {
      setClassName(stateClassName);
    } else {
      // Fetch class details
      firebaseService.getClass(classCode).then(classData => {
        if (classData) {
          setClassName(classData.name);
        } else {
            setError(t('teacherClass.error.notFound'));
          }
      }).catch(err => {
        console.error('Error fetching class:', err);
          setError(t('teacherClass.error.loadFailed'));
      });
    }

    // Set up real-time listeners
    studentsUnsubscribe.current = firebaseService.onStudentsUpdate(classCode, (updatedStudents) => {
      // Check for newly raised hands
      if (notificationsEnabledRef.current && previousStudents.current.length > 0) {
        updatedStudents.forEach(student => {
          const previousStudent = previousStudents.current.find(s => s.id === student.id);
          // If student just raised their hand (wasn't raised before, but is now)
          if (student.handRaised && (!previousStudent || !previousStudent.handRaised)) {
            notificationService.showHandRaisedNotification(student.name, classCode);
          }
        });
      }
      
      previousStudents.current = updatedStudents;
      setStudents(updatedStudents);
    });

    questionsUnsubscribe.current = firebaseService.onQuestionsUpdate(classCode, (updatedQuestions) => {
      // Check for new questions
      if (notificationsEnabledRef.current && previousQuestions.current.length > 0) {
        const newQuestions = updatedQuestions.filter(question => 
          !previousQuestions.current.some(prev => prev.id === question.id)
        );
        
        newQuestions.forEach(question => {
          // Find student name from current students state
          const currentStudents = previousStudents.current;
          const studentName = currentStudents.find(s => s.id === question.studentId)?.name || 'Unknown Student';
          notificationService.showQuestionNotification(studentName, question.text, classCode);
        });
      }
      
      previousQuestions.current = updatedQuestions;
      setQuestions(updatedQuestions);
    });

    // Cleanup function
    return () => {
      if (studentsUnsubscribe.current) {
        studentsUnsubscribe.current();
      }
      if (questionsUnsubscribe.current) {
        questionsUnsubscribe.current();
      }
    };
  }, [classCode, location.state, navigate, t]);

  const handleRemoveQuestion = async (questionId: string) => {
    try {
      await firebaseService.removeQuestion(classCode!, questionId);
    } catch (err) {
      console.error('Error removing question:', err);
    }
  };

  const handleOpenAnswerDialog = (question: Question) => {
    setSelectedQuestion(question);
    setAnswerText(question.answer || '');
    setShowAnswerDialog(true);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedQuestion || !answerText.trim()) {
      return;
    }

    try {
      await firebaseService.answerQuestion(
        classCode!,
        selectedQuestion.id,
        answerText.trim(),
        'Teacher' // You might want to use actual teacher name here
      );
      setShowAnswerDialog(false);
      setSelectedQuestion(null);
      setAnswerText('');
    } catch (err) {
      console.error('Error answering question:', err);
      setError(t('common.error'));
    }
  };

  const handleMarkQuestionAnswered = async (questionId: string) => {
    try {
      await firebaseService.updateQuestionStatus(classCode!, questionId, 'answered');
    } catch (err) {
      console.error('Error marking question as answered:', err);
    }
  };

  const handleMarkQuestionPending = async (questionId: string) => {
    try {
      await firebaseService.updateQuestionStatus(classCode!, questionId, 'pending');
    } catch (err) {
      console.error('Error marking question as pending:', err);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      // Mark student as removed instead of deleting the doc
      await firebaseService.updateStudentStatus(classCode!, studentId, 'removed');
    } catch (err) {
      console.error('Error marking student removed:', err);
    }
  };

  const handleLowerStudentHand = async (studentId: string) => {
    try {
      await firebaseService.lowerStudentHand(classCode!, studentId);
    } catch (err) {
      console.error('Error lowering student hand:', err);
    }
  };

  const handleEndClass = () => {
    if (window.confirm(t('teacherClass.endConfirm'))) {
      // Mark the class as closed (persist closeAt and state)
      firebaseService.closeClass(classCode!).then(() => {
        // After closing, navigate teacher back home
        navigate('/');
      }).catch(err => {
        console.error('Error closing class:', err);
        setError(t('teacherClass.error.loadFailed'));
      });
    }
  };

  const handleNotificationSettingsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    notificationsEnabledRef.current = enabled;
  };

  const getStudentName = (studentId: string): string => {
    const student = students.find(s => s.id === studentId);
    return student?.name || t('teacherClass.unknownStudent');
  };

  const activeStudents = students.filter(s => s.status !== 'removed');
  const handsRaisedCount = activeStudents.filter(s => s.handRaised).length;
  const joinUrl = `${window.location.origin}/join/${classCode}`;
  
  // Calculate question counts by status
  const pendingQuestions = questions.filter(q => q.status !== 'answered').length;
  const answeredQuestions = questions.filter(q => q.status === 'answered').length;

  if (error) {
    return (
      <div className="teacher-class-container">
        <div className="error-state">
          <h2>{t('common.error')}</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>{t('common.backToHome')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-class-container">
      <header className="class-header">
        <div className="class-info">
          <h1>{className}</h1>
          <div className="class-code-display">
            <span>{t('teacherClass.shareCode', { code: classCode })}</span>
            <button 
              className="qr-toggle-button"
              onClick={() => setShowQRCode(!showQRCode)}
            >
              {showQRCode ? t('buttons.hideQR') : t('buttons.showQR')}
            </button>
          </div>
        </div>
        
        <div className="class-actions">
          <button className="end-class-button" onClick={handleEndClass}>
            {t('buttons.endClass')}
          </button>
        </div>
      </header>

      {showQRCode && (
        <div className="qr-code-section">
          <div className="qr-code-container">
            <QRCode value={joinUrl} size={200} />
            <p>{t('teacherClass.qrInfo')}</p>
          </div>
        </div>
      )}

      <NotificationSettings 
        onSettingsChange={handleNotificationSettingsChange}
        enabled={notificationsEnabled}
      />

      <div className="class-content">
        <div className="students-section">
          <div className="section-header">
            <h2>{t('teacherClass.studentsCount', { count: activeStudents.length })}</h2>
            {handsRaisedCount > 0 && (
              <div className="hands-raised-badge">
                🖐️ {t('teacherClass.handsRaised', { count: handsRaisedCount })}
              </div>
            )}
          </div>
          
          <div className="students-list">
            {students.filter(s => s.status !== 'removed').length === 0 ? (
                <div className="empty-state">
                <p>{t('teacherClass.noStudents')}</p>
                <p>{t('teacherClass.shareCode', { code: classCode })}</p>
              </div>
            ) : (
              students.filter(s => s.status !== 'removed').map(student => (
                <div key={student.id} className={`student-card ${student.handRaised ? 'hand-raised' : ''}`}>
                  <div className="student-info">
                    <span className="student-name">{student.name}</span>
                    {student.handRaised && <span className="hand-icon">🖐️</span>}
                  </div>
                  <div className="student-actions">
                    <button
                      className="history-button"
                      onClick={() => setSelectedStudentForHistory(student)}
                      title="View hand raise history"
                    >
                      📋
                    </button>
                    {student.handRaised && (
                      <button
                        className="lower-hand-button"
                        onClick={() => handleLowerStudentHand(student.id)}
                        title={t('teacherClass.actionTitles.lowerStudentHand')}
                      >
                        👇
                      </button>
                    )}
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveStudent(student.id)}
                      title={t('teacherClass.actionTitles.removeStudent')}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="questions-section">
          <div className="section-header">
            <h2>{t('teacherClass.questionsCount', { count: questions.length })}</h2>
            <div className="question-counts">
              <span className="pending-count">⏳ {pendingQuestions} {t('teacherClass.pending')}</span>
              <span className="answered-count">✓ {answeredQuestions} {t('teacherClass.answered')}</span>
            </div>
          </div>
          
          <div className="questions-list">
            {questions.length === 0 ? (
              <div className="empty-state">
                <p>{t('teacherClass.noQuestions')}</p>
                <p>{t('teacherClass.questionsHint')}</p>
              </div>
            ) : (
              questions.map(question => (
                <div key={question.id} className={`question-card ${question.status === 'answered' ? 'answered' : 'pending'}`}>
                  <div className="question-content">
                    <div className="question-header">
                      <div className="question-text">{question.text}</div>
                      <div className="question-status">
                        <span className={`status-badge ${question.status || 'pending'}`}>
                          {question.status === 'answered' ? `✓ ${t('teacherClass.answered')}` : `⏳ ${t('teacherClass.pending')}`}
                        </span>
                      </div>
                    </div>
                    <div className="question-meta">
                      <span className="question-author">— {getStudentName(question.studentId)}</span>
                      {question.createdAt && (
                        <span className="question-time" title={formatDateTime(question.createdAt)}>
                          {getRelativeTime(question.createdAt)}
                        </span>
                      )}
                    </div>
                    {question.answer && (
                      <div className="question-answer">
                        <div className="answer-label">{t('teacherClass.teacherAnswer', { name: question.answeredBy || 'Teacher' })}</div>
                        <div className="answer-text">{question.answer}</div>
                      </div>
                    )}
                  </div>
                  <div className="question-actions">
                    <button
                      className="answer-dialog-button"
                      onClick={() => handleOpenAnswerDialog(question)}
                      title={t('teacherClass.actionTitles.answerQuestion')}
                    >
                      💬
                    </button>
                    {question.status !== 'answered' ? (
                      <button
                        className="answer-button"
                        onClick={() => handleMarkQuestionAnswered(question.id)}
                        title={t('teacherClass.actionTitles.markAnswered')}
                      >
                        ✓
                      </button>
                    ) : (
                      <button
                        className="pending-button"
                        onClick={() => handleMarkQuestionPending(question.id)}
                        title={t('teacherClass.actionTitles.markPending')}
                      >
                        ⏳
                      </button>
                    )}
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveQuestion(question.id)}
                      title={t('teacherClass.actionTitles.removeQuestion')}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAnswerDialog && selectedQuestion && (
        <div className="dialog-overlay" onClick={() => setShowAnswerDialog(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>{t('teacherClass.answerDialogTitle')}</h3>
              <button 
                className="close-button"
                onClick={() => setShowAnswerDialog(false)}
              >
                ×
              </button>
            </div>
            
            <div className="dialog-body">
              <div className="question-preview">
                <strong>{t('teacherClass.studentQuestion')}:</strong>
                <p>{selectedQuestion.text}</p>
              </div>

              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder={t('teacherClass.answerPlaceholder')}
                maxLength={1000}
                rows={6}
                autoFocus
              />
            </div>

            <div className="dialog-actions">
              <button 
                className="cancel-button"
                onClick={() => setShowAnswerDialog(false)}
              >
                {t('buttons.cancel')}
              </button>
              <button 
                className="submit-button"
                onClick={handleSubmitAnswer}
                disabled={!answerText.trim()}
              >
                {t('buttons.submitAnswer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStudentForHistory && (
        <HandHistory
          classCode={classCode!}
          studentId={selectedStudentForHistory.id}
          studentName={selectedStudentForHistory.name}
          onClose={() => setSelectedStudentForHistory(null)}
        />
      )}
    </div>
  );
};

export default TeacherClass;