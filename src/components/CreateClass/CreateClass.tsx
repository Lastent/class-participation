// Create Class Screen - equivalent to your CreateClassScreen in Kotlin

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '../../services/firebaseService';
import { generateClassCode } from '../../utils/codeUtils';
import { getRelativeTime, formatTime } from '../../utils/dateUtils';
import './CreateClass.css';
import { useTranslation } from 'react-i18next';

const CreateClass: React.FC = () => {
  const [className, setClassName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!className.trim()) {
      setError(t('createClass.errors.emptyName'));
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
      // Persist this class locally as a recent class (for 1 hour recall)
      try {
        const recentsRaw = localStorage.getItem('recentClasses');
        const recents = recentsRaw ? JSON.parse(recentsRaw) as Array<any> : [];
        recents.unshift({ id: classCode, name: className.trim(), createdAt: Date.now() });
        // Keep list unique by id and limit to 10
        const unique = Array.from(new Map(recents.map(r => [r.id, r])).values()).slice(0, 10);
        localStorage.setItem('recentClasses', JSON.stringify(unique));
      } catch (err) {
        // ignore local storage errors
      }
      
      // Navigate to teacher class screen with the class code
      navigate(`/teacher/${classCode}`, { 
        state: { className: className.trim() } 
      });
      
    } catch (err) {
      console.error('Error creating class:', err);
        setError(t('createClass.errors.createFailed'));
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
          ← {t('buttons.back')}
        </button>

        <h1 className="page-title">{t('createClass.title')}</h1>
        <p className="page-description">{t('createClass.description')}</p>

        <form onSubmit={handleCreateClass} className="create-class-form">
          <div className="input-group">
            <label htmlFor="className">{t('createClass.labelClassName')}</label>
            <input
              id="className"
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder={t('createClass.placeholderClassName')}
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
                {t('buttons.creating')}
              </>
            ) : (
              t('buttons.createClass')
            )}
          </button>
        </form>
        <div className="recent-classes-card">
          <h4>{t('createClass.recentTitle')}</h4>
          <div className="recent-list">
            {(() => {
              try {
                const recentsRaw = localStorage.getItem('recentClasses');
                const recents = recentsRaw ? JSON.parse(recentsRaw) as Array<any> : [];
                const oneHour = Date.now() - (60 * 60 * 1000);
                return recents.filter(r => r.createdAt >= oneHour).map(r => {
                  const created = new Date(r.createdAt);
                  return (
                  <div key={r.id} className="recent-item">
                    <div className="recent-meta">
                      <div className="recent-name">{r.name}</div>
                      <div className="recent-code">{r.id}</div>
                      <div className="recent-created">{getRelativeTime(created)} · {formatTime(created)}</div>
                    </div>
                    <div className="recent-actions">
                      <button
                        className="reopen-button"
                        onClick={async () => {
                          try {
                            // Try to reopen the class before navigating (idempotent if already open)
                            await firebaseService.reopenClass(r.id);
                          } catch (err) {
                            // If reopen fails, still attempt to navigate so teacher can inspect the class
                            console.error('Error reopening class:', err);
                          }
                          navigate(`/teacher/${r.id}`, { state: { className: r.name } });
                        }}
                      >
                        {t('buttons.reopenClass') /* Keep label simple; translation may change */}
                      </button>
                    </div>
                  </div>
                  );
                });
              } catch (e) {
                return null;
              }
            })()}
          </div>
        </div>
        <div className="info-section">
          <h3>{t('createClass.whatNextTitle')}</h3>
          <ul>
            {((t('createClass.whatNext', { returnObjects: true }) as unknown) as string[]).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateClass;