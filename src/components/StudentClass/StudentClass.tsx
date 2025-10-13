// Student Class Screen - equivalent to your ClassScreen in Kotlin

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { Question } from '../../types';
import './StudentClass.css';

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
  
  // Refs for cleanup
  const questionsUnsubscribe = useRef<(() => void) | null>(null);

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
          setError('Class not found');
        }
      })
      .catch(err => {
        console.error('Student: Error fetching class details:', err);
        // Don't set error here, as it's not critical for student functionality
        setClassName('Class'); // fallback name
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

    // Cleanup function
    return () => {
      if (questionsUnsubscribe.current) {
        questionsUnsubscribe.current();
      }
    };
  }, [classCode, location.state, navigate]);

  const handleHandToggle = async () => {
    try {
      const newHandState = !handRaised;
      await firebaseService.updateHandRaised(classCode!, studentId, newHandState);
      setHandRaised(newHandState);
    } catch (err) {
      console.error('Error updating hand raised status:', err);
      setError('Failed to update hand status');
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
      setError('Failed to submit question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveClass = () => {
    if (window.confirm('Are you sure you want to leave this class?')) {
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
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>Back to Home</button>
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
            <span>Welcome, <strong>{studentName}</strong></span>
            <span className="class-code">Code: {classCode}</span>
          </div>
        </div>
        
        <button className="leave-button" onClick={handleLeaveClass}>
          Leave Class
        </button>
      </header>

      <div className="student-actions">
        <button 
          className={`hand-button ${handRaised ? 'raised' : ''}`}
          onClick={handleHandToggle}
        >
          <span className="hand-icon">🖐️</span>
          <span className="hand-text">
            {handRaised ? 'Lower Hand' : 'Raise Hand'}
          </span>
        </button>

        <button 
          className="question-button"
          onClick={() => setShowQuestionDialog(true)}
        >
          <span className="question-icon">❓</span>
          <span className="question-text">Ask Question</span>
        </button>
      </div>

      <div className="my-questions-section">
        <h2>My Questions ({myQuestions.length})</h2>
        <div className="questions-list">
          {myQuestions.length === 0 ? (
            <div className="empty-state">
              <p>You haven't asked any questions yet</p>
              <p>Click "Ask Question" to submit a question to your teacher</p>
            </div>
          ) : (
            myQuestions.map(question => (
              <div key={question.id} className={`question-card ${question.status === 'answered' ? 'answered' : 'pending'}`}>
                <div className="question-text">{question.text}</div>
                <div className="question-status">
                  <span className={`status-badge ${question.status || 'pending'}`}>
                    {question.status === 'answered' ? '✓ Answered' : '⏳ Pending'}
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
              <h3>Ask a Question</h3>
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
                placeholder="Type your question here..."
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
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting || !questionText.trim()}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Question'}
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