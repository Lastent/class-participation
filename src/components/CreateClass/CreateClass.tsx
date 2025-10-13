// Create Class Screen - equivalent to your CreateClassScreen in Kotlin

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { generateClassCode } from '../../utils/codeUtils';
import './CreateClass.css';

const CreateClass: React.FC = () => {
  const [className, setClassName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!className.trim()) {
      setError('Please enter a class name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Generate unique class code
      let classCode: string;
      let codeExists = true;
      
      // Keep generating codes until we find one that doesn't exist
      do {
        classCode = generateClassCode();
        codeExists = await firebaseService.classExists(classCode);
      } while (codeExists);

      // Create the class
      await firebaseService.createClass(classCode, className.trim());
      
      // Navigate to teacher class screen with the class code
      navigate(`/teacher/${classCode}`, { 
        state: { className: className.trim() } 
      });
      
    } catch (err) {
      console.error('Error creating class:', err);
      setError('Failed to create class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="create-class-container">
      <div className="create-class-content">
        <button className="back-button" onClick={handleBack}>
          ← Back
        </button>
        
        <h1 className="page-title">Create New Class</h1>
        <p className="page-description">
          Enter a name for your class to get started
        </p>

        <form onSubmit={handleCreateClass} className="create-class-form">
          <div className="input-group">
            <label htmlFor="className">Class Name</label>
            <input
              id="className"
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g., Math 101, Physics Lab A"
              maxLength={50}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="create-button"
            disabled={isLoading || !className.trim()}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Creating Class...
              </>
            ) : (
              'Create Class'
            )}
          </button>
        </form>

        <div className="info-section">
          <h3>What happens next?</h3>
          <ul>
            <li>A unique 6-character code will be generated</li>
            <li>Students can join using this code</li>
            <li>You'll see real-time updates of student activity</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateClass;