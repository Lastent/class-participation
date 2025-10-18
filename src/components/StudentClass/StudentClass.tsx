// Student Class Screen - equivalent to your ClassScreen in Kotlin

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { Question } from '../../types';
import './StudentClass.css';
import { useTranslation } from 'react-i18next';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();
  
  // Refs for cleanup
  const questionsUnsubscribe = useRef<(() => void) | null>(null);
  const studentDocUnsub = useRef<(() => void) | null>(null);

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
        if (data && data.state === 'closed') {
          // If class closed, navigate students back to home (kicked out)
          alert(t('studentClassExtra.classClosedAlert'));
          navigate('/');
        }
      });
    } catch (err) {
      console.error('Student: Error setting up class listener:', err);
    }

    // Listen to own student doc for status changes (e.g., removed)
    try {
      studentDocUnsub.current = firebaseService.onStudentDoc(classCode, stateStudentId, (docData) => {
        if (docData && docData.status === 'removed') {
          alert(t('studentClass.removedAlert'));
          navigate('/');
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
    
    if (!questionText.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await firebaseService.addQuestion(classCode!, questionText.trim(), studentId);
      setQuestionText('');
      setShowQuestionDialog(false);
    } catch (err) {
      console.error('Error submitting question:', err);
      setError(t('studentClass.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveClass = () => {
    if (window.confirm(t('studentClass.leaveConfirm'))) {
      firebaseService.removeStudent(classCode!, studentId).finally(() => {
        navigate('/');
      });
    }
  };

  const myQuestions = questions.filter(q => q.studentId === studentId);

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
            <span>{t('studentClass.welcome', { name: studentName })}</span>
            <span className="class-code">{t('studentClass.code', { code: classCode })}</span>
          </div>
        </div>
        
        <button className="leave-button" onClick={handleLeaveClass}>
          {t('studentClass.leave')}
        </button>
      </header>

      <div className="student-actions">
        <button 
          className={`hand-button ${handRaised ? 'raised' : ''}`}
          onClick={handleHandToggle}
        >
          <span className="hand-icon">🖐️</span>
            <span className="hand-text">
            {handRaised ? t('buttons.lowerHand') : t('buttons.raiseHand')}
          </span>
        </button>

        <button 
          className="question-button"
          onClick={() => setShowQuestionDialog(true)}
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
                <div className="question-text">{question.text}</div>
                <div className="question-status">
                  <span className={`status-badge ${question.status || 'pending'}`}>
                    {question.status === 'answered' ? `✓ ${t('teacherClass.answered')}` : `⏳ ${t('teacherClass.pending')}`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showQuestionDialog && (
        <div className="dialog-overlay" onClick={() => setShowQuestionDialog(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>{t('studentClass.askDialogTitle')}</h3>
              <button 
                className="close-button"
                onClick={() => setShowQuestionDialog(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleQuestionSubmit} className="question-form">
                <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder={t('studentClass.askDialogPlaceholder')}
                maxLength={500}
                rows={4}
                disabled={isSubmitting}
                autoFocus
              />
              
              <div className="dialog-actions">
                <button 
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowQuestionDialog(false)}
                  disabled={isSubmitting}
                >
                  {t('buttons.cancel')}
                </button>
                <button 
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting || !questionText.trim()}
                >
                  {isSubmitting ? t('buttons.submitting') : t('buttons.submitQuestion')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentClass;