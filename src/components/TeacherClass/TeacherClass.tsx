// Teacher Class Screen - equivalent to your TeacherClassScreen in Kotlin

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { firebaseService } from '../../services/firebaseService';
import { notificationService } from '../../services/notificationService';
import { Student, Question } from '../../types';
import { formatDateTime, getRelativeTime } from '../../utils/dateUtils';
import NotificationSettings from '../NotificationSettings/NotificationSettings';
import './TeacherClass.css';

const TeacherClass: React.FC = () => {
  const { classCode } = useParams<{ classCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [className, setClassName] = useState<string>('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [error, setError] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Refs for cleanup and tracking previous state
  const studentsUnsubscribe = useRef<(() => void) | null>(null);
  const questionsUnsubscribe = useRef<(() => void) | null>(null);
  const previousStudents = useRef<Student[]>([]);
  const previousQuestions = useRef<Question[]>([]);
  const notificationsEnabledRef = useRef<boolean>(false);

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
          setError('Class not found');
        }
      }).catch(err => {
        console.error('Error fetching class:', err);
        setError('Failed to load class details');
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
  }, [classCode, location.state, navigate]);

  const handleRemoveQuestion = async (questionId: string) => {
    try {
      await firebaseService.removeQuestion(classCode!, questionId);
    } catch (err) {
      console.error('Error removing question:', err);
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
      await firebaseService.removeStudent(classCode!, studentId);
    } catch (err) {
      console.error('Error removing student:', err);
    }
  };

  const handleEndClass = () => {
    if (window.confirm('Are you sure you want to end this class? Students will be disconnected.')) {
      navigate('/');
    }
  };

  const handleNotificationSettingsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    notificationsEnabledRef.current = enabled;
  };

  const getStudentName = (studentId: string): string => {
    const student = students.find(s => s.id === studentId);
    return student?.name || 'Unknown Student';
  };

  const handsRaisedCount = students.filter(s => s.handRaised).length;
  const joinUrl = `${window.location.origin}/join/${classCode}`;
  
  // Calculate question counts by status
  const pendingQuestions = questions.filter(q => q.status !== 'answered').length;
  const answeredQuestions = questions.filter(q => q.status === 'answered').length;

  if (error) {
    return (
      <div className="teacher-class-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>Back to Home</button>
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
            <span>Class Code: <strong>{classCode}</strong></span>
            <button 
              className="qr-toggle-button"
              onClick={() => setShowQRCode(!showQRCode)}
            >
              {showQRCode ? 'Hide QR' : 'Show QR'}
            </button>
          </div>
        </div>
        
        <div className="class-actions">
          <button className="end-class-button" onClick={handleEndClass}>
            End Class
          </button>
        </div>
      </header>

      {showQRCode && (
        <div className="qr-code-section">
          <div className="qr-code-container">
            <QRCode value={joinUrl} size={200} />
            <p>Students can scan this QR code to join</p>
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
            <h2>Students ({students.length})</h2>
            {handsRaisedCount > 0 && (
              <div className="hands-raised-badge">
                🖐️ {handsRaisedCount} hand{handsRaisedCount !== 1 ? 's' : ''} raised
              </div>
            )}
          </div>
          
          <div className="students-list">
            {students.length === 0 ? (
              <div className="empty-state">
                <p>No students have joined yet</p>
                <p>Share the class code: <strong>{classCode}</strong></p>
              </div>
            ) : (
              students.map(student => (
                <div key={student.id} className={`student-card ${student.handRaised ? 'hand-raised' : ''}`}>
                  <div className="student-info">
                    <span className="student-name">{student.name}</span>
                    {student.handRaised && <span className="hand-icon">🖐️</span>}
                  </div>
                  <button
                    className="remove-button"
                    onClick={() => handleRemoveStudent(student.id)}
                    title="Remove student"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="questions-section">
          <div className="section-header">
            <h2>Questions ({questions.length})</h2>
            <div className="question-counts">
              <span className="pending-count">⏳ {pendingQuestions} Pending</span>
              <span className="answered-count">✓ {answeredQuestions} Answered</span>
            </div>
          </div>
          
          <div className="questions-list">
            {questions.length === 0 ? (
              <div className="empty-state">
                <p>No questions yet</p>
                <p>Students can ask questions that will appear here in real-time</p>
              </div>
            ) : (
              questions.map(question => (
                <div key={question.id} className={`question-card ${question.status === 'answered' ? 'answered' : 'pending'}`}>
                  <div className="question-content">
                    <div className="question-header">
                      <div className="question-text">{question.text}</div>
                      <div className="question-status">
                        <span className={`status-badge ${question.status || 'pending'}`}>
                          {question.status === 'answered' ? '✓ Answered' : '⏳ Pending'}
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
                  </div>
                  <div className="question-actions">
                    {question.status !== 'answered' ? (
                      <button
                        className="answer-button"
                        onClick={() => handleMarkQuestionAnswered(question.id)}
                        title="Mark as answered"
                      >
                        ✓
                      </button>
                    ) : (
                      <button
                        className="pending-button"
                        onClick={() => handleMarkQuestionPending(question.id)}
                        title="Mark as pending"
                      >
                        ⏳
                      </button>
                    )}
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveQuestion(question.id)}
                      title="Remove question"
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
    </div>
  );
};

export default TeacherClass;