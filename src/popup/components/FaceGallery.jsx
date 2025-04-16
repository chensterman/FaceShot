import React, { useState } from 'react';
import './researchButton.css';
import { processMultipleFaces } from '../services/faceResearch';

const FaceGallery = ({ faceImages, isLoading }) => {
  const [isResearching, setIsResearching] = useState(false);
  const [researchResults, setResearchResults] = useState([]);
  const [researchProgress, setResearchProgress] = useState({});
  
  const handleResearchClick = async () => {
    if (isResearching || !faceImages || faceImages.length === 0) return;
    
    setIsResearching(true);
    setResearchResults([]);
    setResearchProgress({});
    
    try {
      // Process all faces concurrently
      const results = await processMultipleFaces(faceImages, {
        verbose: true,
        onProgress: (progress) => {
          setResearchProgress(prev => ({
            ...prev,
            [progress.faceIndex]: {
              stage: progress.stage,
              progress: progress.progress,
              message: progress.message
            }
          }));
        }
      });
      
      setResearchResults(results);
      console.log('Research results:', results);
    } catch (error) {
      console.error('Error researching faces:', error);
    } finally {
      setIsResearching(false);
    }
  };
  if (isLoading) {
    return (
      <div className="face-gallery loading">
        <div className="loading-text">Detecting faces...</div>
      </div>
    );
  }

  if (!faceImages || faceImages.length === 0) {
    return (
      <div className="face-gallery empty">
        <div className="empty-message">
          No faces detected. Try capturing another screenshot.
        </div>
      </div>
    );
  }

  return (
    <div className="face-gallery">
      <div className="face-gallery-header">
        <h3>Detected Faces ({faceImages.length})</h3>
        <button 
          className={`research-button ${isResearching ? 'researching' : ''}`}
          onClick={handleResearchClick}
          disabled={isResearching}
        >
          {isResearching ? 'Researching...' : 'Research Faces'}
        </button>
      </div>
      <div className="face-grid">
        {faceImages.map((face, index) => {
          const faceResult = researchResults.find(result => 
            result.imageDataUrl === face.imageUrl
          );
          const progress = researchProgress[index] || {};
          
          return (
            <div key={index} className="face-item">
              <img 
                src={face.imageUrl} 
                alt={`Face ${index + 1}`}
                className="face-image"
              />
              <div className="face-number">Face #{index + 1}</div>
              
              {isResearching && progress.stage && (
                <div className="face-research-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress.progress || 0}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">{progress.message || 'Researching...'}</div>
                </div>
              )}
              
              {faceResult && (
                <div className="face-research-result">
                  <div className="result-name">{faceResult.name || 'Unknown'}</div>
                  <div className="result-description">{faceResult.description || 'No information found'}</div>
                  {faceResult.sourceUrls && faceResult.sourceUrls.length > 0 && (
                    <div className="result-sources">
                      <span>Sources: {faceResult.sourceUrls.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FaceGallery;
