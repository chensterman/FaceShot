import React, { useState } from 'react';
import './researchButton.css';
import { processMultipleFaces } from '../services/faceResearch';

const FaceGallery = ({ faceImages, isLoading }) => {
  const [isResearching, setIsResearching] = useState(false);
  const [researchResults, setResearchResults] = useState([]);
  const [researchProgress, setResearchProgress] = useState({});
  const [selectedFace, setSelectedFace] = useState(null);
  const [detailView, setDetailView] = useState(false);
  
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

  // Handle clicking on a face card to show detailed view
  const handleFaceClick = (face, index) => {
    const faceResult = researchResults.find(result => 
      result.imageDataUrl === face.imageUrl
    );
    
    if (faceResult) {
      setSelectedFace({
        ...face,
        index,
        result: faceResult
      });
      setDetailView(true);
    }
  };
  
  // Handle going back to the gallery view
  const handleBackToGallery = () => {
    setDetailView(false);
    setSelectedFace(null);
  };
  
  // Render the detailed view for a selected face
  if (detailView && selectedFace) {
    const { result, index } = selectedFace;
    return (
      <div className="face-detail-view">
        <div className="detail-header">
          <button className="back-button" onClick={handleBackToGallery}>
            ← Back to Gallery
          </button>
          <h3>{result.name || `Face #${index + 1}`}</h3>
        </div>
        
        <div className="detail-content">
          <div className="detail-main-image">
            <img 
              src={selectedFace.imageUrl} 
              alt={`Face ${index + 1}`} 
              className="detail-face-image"
            />
          </div>
          
          <div className="detail-info">
            <h4>Identity Information</h4>
            <div className="detail-name">{result.name || 'Unknown'}</div>
            <div className="detail-description">{result.description || 'No information found'}</div>
          </div>
          
          {result.sourceUrls && result.sourceUrls.length > 0 && (
            <div className="detail-sources">
              <h4>Sources ({result.sourceUrls.length})</h4>
              <div className="source-list">
                {result.sourceUrls.map((url, i) => {
                  // Extract domain name for display
                  let domain = '';
                  try {
                    domain = new URL(url).hostname;
                  } catch (e) {
                    domain = url;
                  }
                  
                  return (
                    <div key={i} className="source-item">
                      <div className="source-thumbnail">
                        {result.thumbnailUrls && result.thumbnailUrls[i] ? (
                          <img 
                            src={result.thumbnailUrls[i]} 
                            alt={`Source ${i + 1}`} 
                            className="thumbnail-image"
                          />
                        ) : (
                          <div className="thumbnail-placeholder">No Image</div>
                        )}
                      </div>
                      <div className="source-url">
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          {domain}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Render the main gallery view
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
            <div 
              key={index} 
              className={`face-item ${faceResult ? 'has-results clickable' : ''}`}
              onClick={() => faceResult && handleFaceClick(face, index)}
            >
              <img 
                src={face.imageUrl} 
                alt={`Face ${index + 1}`}
                className="face-image"
              />
              <div className="face-number">Face #{index + 1}</div>
              
              {isResearching && (
                <div className="face-research-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress?.progress || 0}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {progress?.message || `Researching... ${progress?.progress || 0}%`}
                  </div>
                </div>
              )}
              
              {faceResult && (
                <div className="face-research-result">
                  <button className="view-details-button" onClick={(e) => {
                    e.stopPropagation();
                    handleFaceClick(face, index);
                  }}>
                    View Research Results
                  </button>
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
