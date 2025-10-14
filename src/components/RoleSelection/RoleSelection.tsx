// Role Selection Screen - equivalent to your RoleSelectionScreen in Kotlin

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelection.css';
import { useTranslation } from 'react-i18next';

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleTeacherSelect = () => {
    navigate('/create-class');
  };

  const handleStudentSelect = () => {
    navigate('/join-class');
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-content">
        <h1 className="app-title">{t('app.title')}</h1>
        <p className="app-description">{t('app.description')}</p>
        
        <div className="role-buttons">
          <button 
            className="role-button teacher-button"
            onClick={handleTeacherSelect}
          >
            <div className="button-icon">👨‍🏫</div>
            <div className="button-text">
              <h2>{t('role.teacher.label')}</h2>
              <p>{t('role.teacher.description')}</p>
            </div>
          </button>
          
          <button 
            className="role-button student-button"
            onClick={handleStudentSelect}
          >
            <div className="button-icon">👨‍🎓</div>
            <div className="button-text">
              <h2>{t('role.student.label')}</h2>
              <p>{t('role.student.description')}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;