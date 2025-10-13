// Role Selection Screen - equivalent to your RoleSelectionScreen in Kotlin

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelection.css';

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();

  const handleTeacherSelect = () => {
    navigate('/create-class');
  };

  const handleStudentSelect = () => {
    navigate('/join-class');
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-content">
        <h1 className="app-title">Classroom Interaction</h1>
        <p className="app-description">
          Real-time classroom communication tool for teachers and students
        </p>
        
        <div className="role-buttons">
          <button 
            className="role-button teacher-button"
            onClick={handleTeacherSelect}
          >
            <div className="button-icon">👨‍🏫</div>
            <div className="button-text">
              <h2>I'm a Teacher</h2>
              <p>Create and manage a class</p>
            </div>
          </button>
          
          <button 
            className="role-button student-button"
            onClick={handleStudentSelect}
          >
            <div className="button-icon">👨‍🎓</div>
            <div className="button-text">
              <h2>I'm a Student</h2>
              <p>Join a class with code</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;