// Join Class Screen - equivalent to your EnterClassCodeScreen in Kotlin

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { isValidClassCode } from '../../utils/codeUtils';
import './JoinClass.css';

const JoinClass: React.FC = () => {
  const [studentName, setStudentName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!classCode.trim()) {
      setError('Please enter a class code');
      return;
    }

    const formattedCode = classCode.trim(); // Preserve original case
    
    if (!isValidClassCode(formattedCode)) {
      setError('Class code must be 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check if class exists
      const classExists = await firebaseService.classExists(formattedCode);
      
      if (!classExists) {
        setError('Class not found. Please check the code and try again.');
        setIsLoading(false);
        return;
      }

      // Add student to the class
      const studentId = await firebaseService.addStudent(formattedCode, studentName.trim());
      
      // Navigate to student class screen
      navigate(`/student/${formattedCode}`, { 
        state: { 
          studentName: studentName.trim(),
          studentId: studentId
        } 
      });
      
    } catch (err) {
      console.error('Error joining class:', err);
      setError('Failed to join class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow uppercase letters, lowercase letters, and numbers
    // Remove any non-alphanumeric characters (spaces, symbols, etc.)
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, '');
    if (value.length <= 6) {
      setClassCode(value);
    }
  };

  return (
    <div className="join-class-container">
      <div className="join-class-content">
        <button className="back-button" onClick={handleBack}>
          ← Back
        </button>
        
        <h1 className="page-title">Join Class</h1>
        <p className="page-description">
          Enter your name and the 6-character class code provided by your teacher
        </p>

        <form onSubmit={handleJoinClass} className="join-class-form">
          <div className="input-group">
            <label htmlFor="studentName">Your Name</label>
            <input
              id="studentName"
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter your full name"
              maxLength={50}
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="classCode">Class Code</label>
            <input
              id="classCode"
              type="text"
              value={classCode}
              onChange={handleCodeChange}
              placeholder="6-character code (e.g., ABC123)"
              className="code-input"
              disabled={isLoading}
            />
            <small className="input-hint">
              Ask your teacher for the 6-character class code
            </small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="join-button"
            disabled={isLoading || !studentName.trim() || !classCode.trim()}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Joining Class...
              </>
            ) : (
              'Join Class'
            )}
          </button>
        </form>

        <div className="info-section">
          <h3>What you can do in class:</h3>
          <ul>
            <li>Raise your hand to get the teacher's attention</li>
            <li>Ask questions that the teacher will see in real-time</li>
            <li>Participate in classroom discussions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoinClass;