// Join Class Screen - equivalent to your EnterClassCodeScreen in Kotlin

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { isValidClassCode } from '../../utils/codeUtils';
import './JoinClass.css';
import { useTranslation } from 'react-i18next';

const JoinClass: React.FC = () => {
  const [studentName, setStudentName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const params = useParams<{ classCode?: string }>();
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // If a classCode is provided via the /join/:classCode route (QRCode link), prefill it.
  useEffect(() => {
    const raw = params.classCode;
    if (raw) {
      // Normalize: remove non-alphanumeric, uppercase, limit to 6 chars
      const normalized = raw.replace(/[^A-Za-z0-9]/g, '').slice(0, 6);
      setClassCode(normalized);
      // focus the student name input so user can quickly type their name
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [params.classCode]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentName.trim()) {
      setError(t('joinClass.errors.emptyName'));
      return;
    }

    if (!classCode.trim()) {
      setError(t('joinClass.errors.emptyCode'));
      return;
    }

    const formattedCode = classCode.trim(); // Preserve original case
    
    if (!isValidClassCode(formattedCode)) {
      setError(t('joinClass.errors.invalidCode'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check if class exists
      const classExists = await firebaseService.classExists(formattedCode);
      
      if (!classExists) {
        setError(t('joinClass.errors.notFound'));
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
  setError(t('joinClass.errors.joinFailed'));
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
          ← {t('buttons.back')}
        </button>
        
        <h1 className="page-title">{t('joinClass.title')}</h1>
        <p className="page-description">
          {t('joinClass.description')}
        </p>

        <form onSubmit={handleJoinClass} className="join-class-form">
          <div className="input-group">
            <label htmlFor="studentName">{t('joinClass.labelName')}</label>
            <input
              id="studentName"
              type="text"
              ref={nameInputRef}
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder={t('joinClass.placeholderName')}
              maxLength={50}
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="classCode">{t('joinClass.labelCode')}</label>
            <input
              id="classCode"
              type="text"
              value={classCode}
              onChange={handleCodeChange}
              placeholder={t('joinClass.placeholderCode')}
              className="code-input"
              disabled={isLoading}
            />
            <small className="input-hint">
              {t('joinClass.inputHint')}
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
                {t('buttons.joining')}
              </>
            ) : (
              t('buttons.joinClass')
            )}
          </button>
        </form>

        <div className="info-section">
          <h3>{t('joinClass.infoTitle')}</h3>
          <ul>
            {((t('joinClass.infoList', { returnObjects: true }) as unknown) as string[]).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoinClass;