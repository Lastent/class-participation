// Student Class Screen - equivalent to your ClassScreen in Kotlin

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { Question } from '../../types';
import './StudentClass.css';
import { useTranslation } from 'react-i18next';

interface StopConfig {
  enabled: boolean;
  until?: Date;
}

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

const StudentClass: React.FC = () => {
  const { classCode } = useParams<{ classCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [studentName, setStudentName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [handRaised, setHandRaised] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [className, setClassName] = useState<string>('');
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionImageFiles, setQuestionImageFiles] = useState<File[]>([]);
  const [questionImagePreviewUrls, setQuestionImagePreviewUrls] = useState<string[]>([]);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [handRaiseStop, setHandRaiseStop] = useState<StopConfig>({ enabled: false });
  const [messageStop, setMessageStop] = useState<StopConfig>({ enabled: false });
  const [clockMs, setClockMs] = useState(Date.now());
  const { t } = useTranslation();
  
  // Refs for cleanup
  const questionsUnsubscribe = useRef<(() => void) | null>(null);
  const studentDocUnsub = useRef<(() => void) | null>(null);

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
      questionImagePreviewUrls.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [questionImagePreviewUrls]);

  useEffect(() => {
    if (!classCode) {
      navigate('/');
      return;
    }

    // Get student info from location state
    const stateStudentName = location.state?.studentName;
    const stateStudentId = location.state?.studentId;
    
    if (!stateStudentName || !stateStudentId) {
      // If no student info, redirect to join page
      navigate(`/join-class`);
      return;
    }

    setStudentName(stateStudentName);
    setStudentId(stateStudentId);

    // Fetch class details with better error handling
    console.log('Student: Attempting to fetch class details for:', classCode);
    firebaseService.getClass(classCode)
      .then(classData => {
        console.log('Student: Successfully fetched class data:', classData);
        if (classData) {
          setClassName(classData.name);
        } else {
          setError(t('teacherClass.error.notFound'));
        }
      })
      .catch(err => {
        console.error('Student: Error fetching class details:', err);
        // Don't set error here, as it's not critical for student functionality
        setClassName(t('studentClass.pageTitle', { className: 'Class' })); // fallback name
      });

    // Set up real-time listener for questions with error handling
    console.log('Student: Setting up questions listener for:', classCode);
    try {
      questionsUnsubscribe.current = firebaseService.onQuestionsUpdate(classCode, (updatedQuestions) => {
        console.log('Student: Received questions update:', updatedQuestions);
        setQuestions(updatedQuestions);
      });
    } catch (err) {
      console.error('Student: Error setting up questions listener:', err);
      // Don't fail completely, just log the error
    }

    // Listen for class-level updates (e.g. state changes such as 'closed')
    let classUnsub: (() => void) | null = null;
    try {
      classUnsub = firebaseService.onClassUpdate(classCode, (data) => {
        setHandRaiseStop(toStopConfig(data?.handRaiseStop));
        setMessageStop(toStopConfig(data?.messageStop));
        if (data && data.state === 'closed') {
          // If class closed, navigate students back to home (kicked out)
          alert(t('studentClassExtra.classClosedAlert'));
          navigate('/');
        }
      });
    } catch (err) {
      console.error('Student: Error setting up class listener:', err);
    }

    // Listen to own student doc for status changes and hand raised updates
    try {
      studentDocUnsub.current = firebaseService.onStudentDoc(classCode, stateStudentId, (docData) => {
        if (docData) {
          // Update handRaised state in real-time if teacher lowered it
          if (docData.handRaised !== undefined) {
            setHandRaised(docData.handRaised);
          }
          // Check if student was removed
          if (docData.status === 'removed') {
            alert(t('studentClass.removedAlert'));
            navigate('/');
          }
        }
      });
    } catch (err) {
      console.error('Student: Error setting up student doc listener:', err);
    }

    // Cleanup function
    return () => {
      if (questionsUnsubscribe.current) {
        questionsUnsubscribe.current();
      }
      if (classUnsub) classUnsub();
      if (studentDocUnsub.current) studentDocUnsub.current();
    };
  }, [classCode, location.state, navigate, t]);

  const handleHandToggle = async () => {
    if (isStopActive(handRaiseStop, Date.now())) {
      setError(t('studentClass.stops.handBlocked'));
      return;
    }

    try {
      const newHandState = !handRaised;
      await firebaseService.updateHandRaised(classCode!, studentId, newHandState);
      setHandRaised(newHandState);
    } catch (err) {
      console.error('Error updating hand raised status:', err);
      setError(t('studentClass.submitFailed'));
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isStopActive(messageStop, Date.now())) {
      setError(t('studentClass.stops.messageBlocked'));
      return;
    }
    
    if (!questionText.trim() && questionImageFiles.length === 0) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await firebaseService.addQuestion(
        classCode!,
        questionText.trim(),
        studentId,
        questionImageFiles.length > 0 ? questionImageFiles : undefined
      );
      closeQuestionDialog();
    } catch (err) {
      console.error('Error submitting question:', err);
      setError(t('studentClass.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addQuestionImageFiles = (files: File[]) => {
    if (files.length === 0) return;

    const currentCount = questionImageFiles.length;
    if (currentCount >= MAX_ATTACHMENTS) {
      setError(t('studentClass.imageLimitReached', { count: MAX_ATTACHMENTS }));
      return;
    }

    const remainingSlots = MAX_ATTACHMENTS - currentCount;
    const validFiles: File[] = [];
    const previewUrls: string[] = [];

    for (const file of files.slice(0, remainingSlots)) {
      if (!file.type.startsWith('image/')) {
        setError(t('studentClass.imageInvalidType'));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(t('studentClass.imageTooLarge'));
        continue;
      }
      validFiles.push(file);
      previewUrls.push(URL.createObjectURL(file));
    }

    if (files.length > remainingSlots) {
      setError(t('studentClass.imageLimitReached', { count: MAX_ATTACHMENTS }));
    }

    if (validFiles.length > 0) {
      setQuestionImageFiles((prev) => [...prev, ...validFiles]);
      setQuestionImagePreviewUrls((prev) => [...prev, ...previewUrls]);
    }
  };

  const handleQuestionImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    addQuestionImageFiles(files);
    e.target.value = '';
  };

  const handleQuestionPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items || []);
    const imageFiles = items
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);

    if (imageFiles.length === 0) return;

    e.preventDefault();
    addQuestionImageFiles(imageFiles);
  };

  const removeQuestionImage = (index: number) => {
    setQuestionImageFiles((prev) => prev.filter((_, i) => i !== index));
    setQuestionImagePreviewUrls((prev) => {
      const target = prev[index];
      if (target && target.startsWith('blob:')) {
        URL.revokeObjectURL(target);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const closeQuestionDialog = () => {
    setShowQuestionDialog(false);
    setQuestionText('');
    questionImagePreviewUrls.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setQuestionImageFiles([]);
    setQuestionImagePreviewUrls([]);
  };

  const handleLeaveClass = () => {
    if (window.confirm(t('studentClass.leaveConfirm'))) {
      firebaseService.removeStudent(classCode!, studentId).finally(() => {
        navigate('/');
      });
    }
  };

  const handleEditName = () => {
    setEditNameValue(studentName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed || trimmed === studentName) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      await firebaseService.updateStudentName(classCode!, studentId, trimmed);
      setStudentName(trimmed);
      setIsEditingName(false);
    } catch (err) {
      console.error('Error updating name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
  };

  const myQuestions = questions.filter(q => q.studentId === studentId);
  const handStopActive = isStopActive(handRaiseStop, clockMs);
  const messageStopActive = isStopActive(messageStop, clockMs);

  if (error) {
    return (
      <div className="student-class-container">
        <div className="error-state">
          <h2>{t('common.error')}</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>{t('common.backToHome')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-class-container">
      <header className="class-header">
        <div className="class-info">
          <h1>{className}</h1>
          <div className="student-info">
            {isEditingName ? (
              <div className="edit-name-inline">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEditName();
                  }}
                  disabled={isSavingName}
                  autoFocus
                  maxLength={50}
                  className="edit-name-input"
                />
                <button
                  className="edit-name-save"
                  onClick={handleSaveName}
                  disabled={isSavingName || !editNameValue.trim()}
                  title={t('studentClass.saveName')}
                >
                  ✓
                </button>
                <button
                  className="edit-name-cancel"
                  onClick={handleCancelEditName}
                  disabled={isSavingName}
                  title={t('buttons.cancel')}
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="name-display">
                {t('studentClass.welcome', { name: studentName })}
                <button
                  className="edit-name-button"
                  onClick={handleEditName}
                  title={t('studentClass.editName')}
                >
                  ✏️
                </button>
              </span>
            )}
            <span className="class-code">{t('studentClass.code', { code: classCode })}</span>
          </div>
        </div>
        
        <button className="leave-button" onClick={handleLeaveClass}>
          {t('studentClass.leave')}
        </button>
      </header>

      <div className="student-actions">
        {handStopActive && (
          <div className="student-stop-notice">
            {t('studentClass.stops.handBlocked')}
          </div>
        )}
        {messageStopActive && (
          <div className="student-stop-notice">
            {t('studentClass.stops.messageBlocked')}
          </div>
        )}

        <button 
          className={`hand-button ${handRaised ? 'raised' : ''}`}
          onClick={handleHandToggle}
          disabled={handStopActive}
        >
          <span className="hand-icon">🖐️</span>
            <span className="hand-text">
            {handRaised ? t('buttons.lowerHand') : t('buttons.raiseHand')}
          </span>
        </button>

        <button 
          className="question-button"
          onClick={() => setShowQuestionDialog(true)}
          disabled={messageStopActive}
        >
          <span className="question-icon">❓</span>
          <span className="question-text">{t('buttons.askQuestion')}</span>
        </button>
      </div>

      <div className="my-questions-section">
        <h2>{t('studentClass.myQuestions', { count: myQuestions.length })}</h2>
        <div className="questions-list">
          {myQuestions.length === 0 ? (
            <div className="empty-state">
              <p>{t('studentClass.noMyQuestions')}</p>
              <p>{t('studentClass.askDialogPlaceholder')}</p>
            </div>
          ) : (
            myQuestions.map(question => (
              <div key={question.id} className={`question-card ${question.status === 'answered' ? 'answered' : 'pending'}`}>
                <div className="question-text">{question.text || t('studentClass.imageOnlyMessage')}</div>
                <div className="question-status">
                  <span className={`status-badge ${question.status || 'pending'}`}>
                    {question.status === 'answered' ? `✓ ${t('teacherClass.answered')}` : `⏳ ${t('teacherClass.pending')}`}
                  </span>
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
                        <img src={url} alt={t('studentClass.attachmentAlt')} className="question-image" />
                      </button>
                    ))}
                  </div>
                )}
                {(question.answer || question.answerImageUrl || (question.answerImageUrls && question.answerImageUrls.length > 0)) && (
                  <div className="question-answer">
                    <div className="answer-label">{t('studentClass.teacherAnswer', { name: question.answeredBy || 'Teacher' })}</div>
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
                            <img src={url} alt={t('studentClass.answerAttachmentAlt')} className="question-image" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showQuestionDialog && (
        <div className="dialog-overlay" onClick={closeQuestionDialog}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>{t('studentClass.askDialogTitle')}</h3>
              <button 
                className="close-button"
                onClick={closeQuestionDialog}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleQuestionSubmit} className="question-form">
                <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                  onPaste={handleQuestionPaste}
                placeholder={t('studentClass.askDialogPlaceholder')}
                maxLength={500}
                rows={4}
                disabled={isSubmitting}
                autoFocus
              />

              <div className="attachment-controls">
                <label className={`attach-image-label ${isSubmitting ? 'disabled' : ''}`}>
                  {t('buttons.attachImage')}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleQuestionImageInputChange}
                    disabled={isSubmitting}
                    hidden
                  />
                </label>
              </div>

              {questionImagePreviewUrls.length > 0 && (
                <div className="image-grid attachment-preview-wrap">
                  {questionImagePreviewUrls.map((url, idx) => (
                    <div key={`preview-${idx}`} className="question-image-box preview-box">
                      <img src={url} alt={t('studentClass.attachmentAlt')} className="question-image" />
                      <button
                        type="button"
                        className="remove-image-chip"
                        onClick={() => removeQuestionImage(idx)}
                        disabled={isSubmitting}
                        aria-label={t('buttons.removeImage')}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="dialog-actions">
                <button 
                  type="button"
                  className="cancel-button"
                  onClick={closeQuestionDialog}
                  disabled={isSubmitting}
                >
                  {t('buttons.cancel')}
                </button>
                <button 
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting || (!questionText.trim() && questionImageFiles.length === 0) || messageStopActive}
                >
                  {isSubmitting ? t('buttons.submitting') : t('buttons.submitQuestion')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {imageModalUrl && (
        <div className="image-modal-overlay" onClick={() => setImageModalUrl(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setImageModalUrl(null)}>
              ×
            </button>
            <img src={imageModalUrl} alt={t('studentClass.attachmentAlt')} className="image-modal-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentClass;