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

interface StopConfig {
  enabled: boolean;
  until?: Date;
}

const STOP_MINUTES_OPTIONS = [
  { key: '5', minutes: 5 },
  { key: '15', minutes: 15 },
  { key: '30', minutes: 30 },
  { key: '60', minutes: 60 }
];

const toStopConfig = (value: any): StopConfig => {
  if (!value) return { enabled: false };

  const untilRaw = value.until;
  let until: Date | undefined;

  if (untilRaw?.toDate) {
    until = untilRaw.toDate();
  } else if (untilRaw instanceof Date) {
    until = untilRaw;
  } else if (typeof untilRaw === 'number') {
    until = new Date(untilRaw);
  }

  return {
    enabled: !!value.enabled,
    until
  };
};

const isStopActive = (stop: StopConfig, nowMs: number): boolean => {
  if (!stop.enabled) return false;
  if (!stop.until) return true;
  return stop.until.getTime() > nowMs;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

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
  const [answerImageFiles, setAnswerImageFiles] = useState<File[]>([]);
  const [answerImagePreviewUrls, setAnswerImagePreviewUrls] = useState<string[]>([]);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [handRaiseStop, setHandRaiseStop] = useState<StopConfig>({ enabled: false });
  const [messageStop, setMessageStop] = useState<StopConfig>({ enabled: false });
  const [openStopMenu, setOpenStopMenu] = useState<'hands' | 'messages' | null>(null);
  const [controlsBusy, setControlsBusy] = useState<'hands' | 'messages' | null>(null);
  const [clockMs, setClockMs] = useState(Date.now());
  
  // Refs for cleanup and tracking previous state
  const studentsUnsubscribe = useRef<(() => void) | null>(null);
  const questionsUnsubscribe = useRef<(() => void) | null>(null);
  const classUnsubscribe = useRef<(() => void) | null>(null);
  const previousStudents = useRef<Student[]>([]);
  const previousQuestions = useRef<Question[]>([]);
  const notificationsEnabledRef = useRef<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    return () => {
      answerImagePreviewUrls.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [answerImagePreviewUrls]);

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
          setHandRaiseStop(toStopConfig(classData.handRaiseStop));
          setMessageStop(toStopConfig(classData.messageStop));
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

    classUnsubscribe.current = firebaseService.onClassUpdate(classCode, (classData) => {
      if (!classData) return;
      if (classData.name) setClassName(classData.name);
      setHandRaiseStop(toStopConfig(classData.handRaiseStop));
      setMessageStop(toStopConfig(classData.messageStop));
    });

    // Cleanup function
    return () => {
      if (studentsUnsubscribe.current) {
        studentsUnsubscribe.current();
      }
      if (questionsUnsubscribe.current) {
        questionsUnsubscribe.current();
      }
      if (classUnsubscribe.current) {
        classUnsubscribe.current();
      }
    };
  }, [classCode, location.state, navigate, t]);

  const handleEnableStop = async (type: 'hands' | 'messages', minutes?: number) => {
    if (!classCode) return;

    const field = type === 'hands' ? 'handRaiseStop' : 'messageStop';
    setControlsBusy(type);
    try {
      await firebaseService.enableParticipationStop(classCode, field, minutes);
      setOpenStopMenu(null);
    } catch (err) {
      console.error('Error enabling stop:', err);
      setError(t('common.error'));
    } finally {
      setControlsBusy(null);
    }
  };

  const handleDisableStop = async (type: 'hands' | 'messages') => {
    if (!classCode) return;

    const field = type === 'hands' ? 'handRaiseStop' : 'messageStop';
    setControlsBusy(type);
    try {
      await firebaseService.disableParticipationStop(classCode, field);
    } catch (err) {
      console.error('Error disabling stop:', err);
      setError(t('common.error'));
    } finally {
      setControlsBusy(null);
    }
  };

  const getRemainingMinutes = (stop: StopConfig): number | null => {
    if (!stop.until) return null;
    const diffMs = stop.until.getTime() - clockMs;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60));
  };

  const getStopStatus = (stop: StopConfig): string => {
    const active = isStopActive(stop, clockMs);
    if (!active) return t('teacherClass.stops.inactive');

    const remaining = getRemainingMinutes(stop);
    if (remaining === null) return t('teacherClass.stops.activeIndefinite');
    return t('teacherClass.stops.activeTimed', { minutes: remaining });
  };

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
    answerImagePreviewUrls.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setAnswerImageFiles([]);
    setAnswerImagePreviewUrls(
      (question.answerImageUrls && question.answerImageUrls.length > 0)
        ? question.answerImageUrls
        : question.answerImageUrl
          ? [question.answerImageUrl]
          : []
    );
    setShowAnswerDialog(true);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedQuestion || (!answerText.trim() && answerImageFiles.length === 0 && !(selectedQuestion.answerImageUrls && selectedQuestion.answerImageUrls.length > 0) && !selectedQuestion.answerImageUrl)) {
      return;
    }

    try {
      await firebaseService.answerQuestion(
        classCode!,
        selectedQuestion.id,
        answerText.trim(),
        'Teacher', // You might want to use actual teacher name here
        answerImageFiles.length > 0 ? answerImageFiles : undefined
      );
      closeAnswerDialog();
    } catch (err) {
      console.error('Error answering question:', err);
      setError(t('common.error'));
    }
  };

  const addAnswerImageFiles = (files: File[]) => {
    if (files.length === 0) return;

    const currentCount = answerImageFiles.length;
    if (currentCount >= MAX_ATTACHMENTS) {
      setError(t('teacherClass.imageLimitReached', { count: MAX_ATTACHMENTS }));
      return;
    }

    const remainingSlots = MAX_ATTACHMENTS - currentCount;
    const validFiles: File[] = [];
    const previewUrls: string[] = [];

    for (const file of files.slice(0, remainingSlots)) {
      if (!file.type.startsWith('image/')) {
        setError(t('teacherClass.imageInvalidType'));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(t('teacherClass.imageTooLarge'));
        continue;
      }
      validFiles.push(file);
      previewUrls.push(URL.createObjectURL(file));
    }

    if (files.length > remainingSlots) {
      setError(t('teacherClass.imageLimitReached', { count: MAX_ATTACHMENTS }));
    }

    if (validFiles.length > 0) {
      setAnswerImageFiles((prev) => [...prev, ...validFiles]);
      setAnswerImagePreviewUrls((prev) => [...prev, ...previewUrls]);
    }
  };

  const handleAnswerImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    addAnswerImageFiles(files);
    e.target.value = '';
  };

  const handleAnswerPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items || []);
    const imageFiles = items
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);

    if (imageFiles.length === 0) return;

    e.preventDefault();
    addAnswerImageFiles(imageFiles);
  };

  const removeAnswerImage = (index: number) => {
    setAnswerImageFiles((prev) => prev.filter((_, i) => i !== index));
    setAnswerImagePreviewUrls((prev) => {
      const target = prev[index];
      if (target && target.startsWith('blob:')) {
        URL.revokeObjectURL(target);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const closeAnswerDialog = () => {
    setShowAnswerDialog(false);
    setSelectedQuestion(null);
    setAnswerText('');
    answerImagePreviewUrls.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setAnswerImageFiles([]);
    setAnswerImagePreviewUrls([]);
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
  const handStopActive = isStopActive(handRaiseStop, clockMs);
  const messageStopActive = isStopActive(messageStop, clockMs);
  
  // Calculate question counts by status
  const pendingQuestions = questions.filter(q => q.status !== 'answered').length;
  const answeredQuestions = questions.filter(q => q.status === 'answered').length;
  const sortedQuestions = [...questions].sort((a, b) => {
    const aPendingRank = a.status === 'answered' ? 1 : 0;
    const bPendingRank = b.status === 'answered' ? 1 : 0;
    if (aPendingRank !== bPendingRank) return aPendingRank - bPendingRank;

    const aTime = a.createdAt ? a.createdAt.getTime() : 0;
    const bTime = b.createdAt ? b.createdAt.getTime() : 0;
    return bTime - aTime;
  });

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

      <div className="participation-stop-controls">
        <div className="stop-card">
          <div className="stop-card-info">
            <h3>{t('teacherClass.stops.handTitle')}</h3>
            <p>{getStopStatus(handRaiseStop)}</p>
          </div>
          <div className="split-stop-button-group">
            <button
              className={`stop-main-button ${handStopActive ? 'active' : ''}`}
              onClick={() => handStopActive ? handleDisableStop('hands') : handleEnableStop('hands')}
              disabled={controlsBusy === 'hands'}
            >
              {handStopActive ? t('teacherClass.stops.disable') : t('teacherClass.stops.enableHands')}
            </button>
            <button
              className="stop-menu-button"
              onClick={() => setOpenStopMenu(openStopMenu === 'hands' ? null : 'hands')}
              disabled={controlsBusy === 'hands'}
              title={t('teacherClass.stops.setTimer')}
            >
              ▾
            </button>
            {openStopMenu === 'hands' && (
              <div className="stop-menu-dropdown">
                {STOP_MINUTES_OPTIONS.map(option => (
                  <button
                    key={option.key}
                    className="stop-menu-item"
                    onClick={() => handleEnableStop('hands', option.minutes)}
                  >
                    {t('teacherClass.stops.minutesOption', { minutes: option.minutes })}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="stop-card">
          <div className="stop-card-info">
            <h3>{t('teacherClass.stops.messageTitle')}</h3>
            <p>{getStopStatus(messageStop)}</p>
          </div>
          <div className="split-stop-button-group">
            <button
              className={`stop-main-button ${messageStopActive ? 'active' : ''}`}
              onClick={() => messageStopActive ? handleDisableStop('messages') : handleEnableStop('messages')}
              disabled={controlsBusy === 'messages'}
            >
              {messageStopActive ? t('teacherClass.stops.disable') : t('teacherClass.stops.enableMessages')}
            </button>
            <button
              className="stop-menu-button"
              onClick={() => setOpenStopMenu(openStopMenu === 'messages' ? null : 'messages')}
              disabled={controlsBusy === 'messages'}
              title={t('teacherClass.stops.setTimer')}
            >
              ▾
            </button>
            {openStopMenu === 'messages' && (
              <div className="stop-menu-dropdown">
                {STOP_MINUTES_OPTIONS.map(option => (
                  <button
                    key={option.key}
                    className="stop-menu-item"
                    onClick={() => handleEnableStop('messages', option.minutes)}
                  >
                    {t('teacherClass.stops.minutesOption', { minutes: option.minutes })}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
              sortedQuestions.map(question => (
                <div key={question.id} className={`question-card ${question.status === 'answered' ? 'answered' : 'pending'}`}>
                  <div className="question-content">
                    <div className="question-header">
                      <div className="question-text">{question.text}</div>
                      <div className="question-status">
                        <span
                          className={`status-badge ${question.status || 'pending'}`}
                          title={question.status === 'answered' ? t('teacherClass.answered') : t('teacherClass.pending')}
                          aria-label={question.status === 'answered' ? t('teacherClass.answered') : t('teacherClass.pending')}
                        >
                          {question.status === 'answered' ? '✓' : '⏳'}
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
                    {((question.imageUrls && question.imageUrls.length > 0)
                      ? question.imageUrls
                      : question.imageUrl
                        ? [question.imageUrl]
                        : []).length > 0 && (
                      <div className="image-grid">
                        {((question.imageUrls && question.imageUrls.length > 0)
                          ? question.imageUrls
                          : question.imageUrl
                            ? [question.imageUrl]
                            : []).map((url, idx) => (
                          <button
                            key={`${question.id}-qimg-${idx}`}
                            type="button"
                            className="question-image-box"
                            onClick={() => setImageModalUrl(url)}
                          >
                            <img src={url} alt={t('teacherClass.attachmentAlt')} className="question-image" />
                          </button>
                        ))}
                      </div>
                    )}
                    {(question.answer || question.answerImageUrl || (question.answerImageUrls && question.answerImageUrls.length > 0)) && (
                      <div className="question-answer">
                        <div className="answer-label">{t('teacherClass.teacherAnswer', { name: question.answeredBy || 'Teacher' })}</div>
                        {question.answer && <div className="answer-text">{question.answer}</div>}
                        {((question.answerImageUrls && question.answerImageUrls.length > 0)
                          ? question.answerImageUrls
                          : question.answerImageUrl
                            ? [question.answerImageUrl]
                            : []).length > 0 && (
                          <div className="image-grid answer-image-wrap">
                            {((question.answerImageUrls && question.answerImageUrls.length > 0)
                              ? question.answerImageUrls
                              : question.answerImageUrl
                                ? [question.answerImageUrl]
                                : []).map((url, idx) => (
                              <button
                                key={`${question.id}-aimg-${idx}`}
                                type="button"
                                className="question-image-box"
                                onClick={() => setImageModalUrl(url)}
                              >
                                <img src={url} alt={t('teacherClass.answerAttachmentAlt')} className="question-image" />
                              </button>
                            ))}
                          </div>
                        )}
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
        <div className="dialog-overlay" onClick={closeAnswerDialog}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>{t('teacherClass.answerDialogTitle')}</h3>
              <button 
                className="close-button"
                onClick={closeAnswerDialog}
              >
                ×
              </button>
            </div>
            
            <div className="dialog-body">
              <div className="question-preview">
                <strong>{t('teacherClass.studentQuestion')}:</strong>
                <p>{selectedQuestion.text || t('teacherClass.imageOnlyMessage')}</p>
                {((selectedQuestion.imageUrls && selectedQuestion.imageUrls.length > 0)
                  ? selectedQuestion.imageUrls
                  : selectedQuestion.imageUrl
                    ? [selectedQuestion.imageUrl]
                    : []).length > 0 && (
                  <div className="image-grid">
                    {((selectedQuestion.imageUrls && selectedQuestion.imageUrls.length > 0)
                      ? selectedQuestion.imageUrls
                      : selectedQuestion.imageUrl
                        ? [selectedQuestion.imageUrl]
                        : []).map((url, idx) => (
                      <button
                        key={`preview-question-${idx}`}
                        type="button"
                        className="question-image-box"
                        onClick={() => setImageModalUrl(url)}
                      >
                        <img src={url} alt={t('teacherClass.attachmentAlt')} className="question-image" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                onPaste={handleAnswerPaste}
                placeholder={t('teacherClass.answerPlaceholder')}
                maxLength={1000}
                rows={6}
                autoFocus
              />

              <div className="attachment-controls">
                <label className="attach-image-label">
                  {t('buttons.attachImage')}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAnswerImageInputChange}
                    hidden
                  />
                </label>
              </div>

              {answerImagePreviewUrls.length > 0 && (
                <div className="image-grid attachment-preview-wrap">
                  {answerImagePreviewUrls.map((url, idx) => (
                    <div key={`preview-answer-${idx}`} className="question-image-box preview-box">
                      <img src={url} alt={t('teacherClass.answerAttachmentAlt')} className="question-image" />
                      <button
                        type="button"
                        className="remove-image-chip"
                        onClick={() => removeAnswerImage(idx)}
                        aria-label={t('buttons.removeImage')}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dialog-actions">
              <button 
                className="cancel-button"
                onClick={closeAnswerDialog}
              >
                {t('buttons.cancel')}
              </button>
              <button 
                className="submit-button"
                onClick={handleSubmitAnswer}
                disabled={
                  !answerText.trim()
                  && answerImageFiles.length === 0
                  && !(selectedQuestion?.answerImageUrls && selectedQuestion.answerImageUrls.length > 0)
                  && !selectedQuestion?.answerImageUrl
                }
              >
                {t('buttons.submitAnswer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {imageModalUrl && (
        <div className="image-modal-overlay" onClick={() => setImageModalUrl(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setImageModalUrl(null)}>
              ×
            </button>
            <img src={imageModalUrl} alt={t('teacherClass.attachmentAlt')} className="image-modal-image" />
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