import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './researchButton.css';
import { processMultipleFaces } from '../services/faceResearch';

const FaceGallery = forwardRef((props, ref) => {
  const { faceImages: initialFaceImages, isLoading, hideResearchButton = false, onFaceRemove } = props;
  // Track faces locally so we can remove them
  const [faceImages, setFaceImages] = useState(initialFaceImages || []);
  const [isResearching, setIsResearching] = useState(false);
  // Store a single research result for the current batch of faces
  const [currentResearchResult, setCurrentResearchResult] = useState(null);
  const [researchProgress, setResearchProgress] = useState({});
  const [selectedFace, setSelectedFace] = useState(null);
  const [detailView, setDetailView] = useState(false);
  // Store past research attempts, each containing multiple faces
  const [researchAttempts, setResearchAttempts] = useState([]);
  const [showResearchHistory, setShowResearchHistory] = useState(true);
  
  // Define helper functions early to avoid reference errors
  const toggleResearchHistory = () => {
    setShowResearchHistory(!showResearchHistory);
  };
  
  // Handle clicking on a research attempt to view details
  const handleResearchAttemptClick = (attempt) => {
    console.log('Showing detail view for research attempt:', attempt);
    // Set the selected face with just the research result, not including face images
    setSelectedFace({
      imageUrl: null, // No face image needed
      result: attempt.researchResult,
      researchAttempt: attempt,
      index: researchAttempts.findIndex(a => a.id === attempt.id)
    });
    setDetailView(true);
  };
  
  // Handle removing a research attempt
  const handleRemoveResearchAttempt = (index, e) => {
    e.stopPropagation();
    
    // Remove the research attempt
    const updatedResearchAttempts = [...researchAttempts];
    updatedResearchAttempts.splice(index, 1);
    setResearchAttempts(updatedResearchAttempts);
    
    // Update storage
    chrome.storage.local.set({
      savedResearchAttempts: updatedResearchAttempts
    }, () => {
      console.log('Removed research attempt');
    });
  };
  
  // Check if we have research history to display
  const hasResearchHistory = researchAttempts && researchAttempts.length > 0;
  
  // Add some CSS for error styling and face removal
  useEffect(() => {
    const styles = document.createElement('style');
    styles.textContent = `
      .face-item .remove-face-button {
        position: absolute;
        top: 5px;
        right: 5px;
        background-color: rgba(255, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        z-index: 10;
        opacity: 0;
        transition: opacity 0.2s;
      }
      
      .face-item:hover .remove-face-button {
        opacity: 1;
      }
      
      .research-attempt-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        margin-bottom: 8px;
        background-color: #f8f9fa;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .research-attempt-item:hover {
        background-color: #e9ecef;
      }
      
      .attempt-info {
        flex: 1;
      }
      
      .attempt-timestamp {
        font-size: 0.8rem;
        color: #6c757d;
      }
      
      .attempt-stats {
        font-size: 0.9rem;
        color: #495057;
        font-weight: 500;
      }
      
      .remove-attempt-button {
        background-color: rgba(255, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.2s;
      }
      
      .research-attempt-item:hover .remove-attempt-button {
        opacity: 1;
      }
      
      .research-history-section {
        margin-top: 20px;
        border-top: 1px solid #e9ecef;
        padding-top: 10px;
      }
      
      .research-history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        padding: 5px 0;
      }
      
      .research-history-header h3 {
        font-size: 1rem;
        margin: 0;
        color: #495057;
      }
      
      .toggle-button {
        background: none;
        border: none;
        color: #6c757d;
        cursor: pointer;
        font-size: 1rem;
      }
      
      .research-attempts-list {
        margin-top: 10px;
      }
      
      .source-item {
        margin-bottom: 10px;
        padding: 8px;
        background-color: #f8f9fa;
        border-radius: 4px;
        word-break: break-all;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .source-thumbnail {
        flex-shrink: 0;
        width: 60px;
        height: 60px;
        overflow: hidden;
        border-radius: 4px;
        border: 1px solid #dee2e6;
      }
      
      .source-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .source-url {
        flex: 1;
      }
      
      .sources-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .open-all-links-button {
        background-color: #4a90e2;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 5px 10px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .open-all-links-button:hover {
        background-color: #3a7bc8;
      }
    `;
    document.head.appendChild(styles);
    
    // Clean up style element on unmount
    return () => {
      document.head.removeChild(styles);
    };
  }, []);
  
  // Update local state when initialFaceImages changes
  useEffect(() => {
    if (initialFaceImages) {
      console.log('Updating face images in FaceGallery:', initialFaceImages.length);
      setFaceImages(initialFaceImages || []);
    }
  }, [initialFaceImages]);
  
  // Load saved research attempts when component mounts
  useEffect(() => {
    // Helper function to ensure thumbnails are loaded for research results
    const ensureThumbnailsLoaded = (attempts) => {
      return attempts.map(attempt => {
        // Make sure the research result has thumbnailUrls initialized
        if (attempt.researchResult && 
            attempt.researchResult.sourceUrls && 
            (!attempt.researchResult.thumbnailUrls || 
             attempt.researchResult.thumbnailUrls.length === 0)) {
          
          // Create empty thumbnails array matching the length of sourceUrls
          attempt.researchResult.thumbnailUrls = 
            Array(attempt.researchResult.sourceUrls.length).fill(null);
        }
        return attempt;
      });
    };
    
    const loadSavedResearchAttempts = async () => {
      try {
        // Get research attempts from Chrome storage
        chrome.storage.local.get(['savedResearchAttempts'], (result) => {
          if (result.savedResearchAttempts) {
            console.log('Loaded saved research attempts:', result.savedResearchAttempts.length);
            
            // Clean up research attempts by removing face images to save storage space
            const cleanedAttempts = result.savedResearchAttempts.map(attempt => ({
              ...attempt,
              // Remove face images but keep the count
              faceImages: undefined,
              // Make sure we have a faceCount even if it was stored with images before
              faceCount: attempt.faceCount || (attempt.faceImages ? attempt.faceImages.length : 0)
            }));
            
            // Ensure all research attempts have thumbnailUrls initialized
            const processedAttempts = ensureThumbnailsLoaded(cleanedAttempts);
            
            console.log(`Loaded ${processedAttempts.length} saved research attempts`);
            setResearchAttempts(processedAttempts);
            
            // Save the cleaned attempts back to storage
            chrome.storage.local.set({
              savedResearchAttempts: processedAttempts
            }, () => {
              console.log('Cleaned up research attempts in storage');
            });
          }
        });
      } catch (error) {
        console.error('Error loading saved research attempts:', error);
      }
    };
    
    loadSavedResearchAttempts();
  }, []);
  
  // No need to update research results when faceImages change anymore
  // since we're now using a single research result for all faces
  
  // Expose the handleResearchClick method to parent components
  useImperativeHandle(ref, () => ({
    handleResearchClick: async () => {
      if (isResearching || !faceImages || faceImages.length === 0) return Promise.resolve();
      
      setIsResearching(true);
      setResearchProgress({});
      
      try {
        console.log(`Researching ${faceImages.length} faces as a single research attempt`);
        
        // Process all faces as a single research attempt
        const researchResult = await processMultipleFaces(faceImages, {
          verbose: true,
          onProgress: (progress) => {
            setResearchProgress({
              stage: progress.stage,
              progress: progress.progress,
              message: progress.message
            });
          }
        });
        
        // Store the current research result
        setCurrentResearchResult(researchResult);
        console.log('Research result:', researchResult);
        
        // Ensure thumbnailUrls is initialized if not present
        if (researchResult.sourceUrls && (!researchResult.thumbnailUrls || researchResult.thumbnailUrls.length === 0)) {
          researchResult.thumbnailUrls = Array(researchResult.sourceUrls.length).fill(null);
        }
        
        // Create a new research attempt entry
        const newResearchAttempt = {
          id: researchResult.researchId || `research-${Date.now()}`,
          researchResult: researchResult,
          timestamp: researchResult.timestamp || new Date().toISOString(),
          faceCount: faceImages.length
        };
        
        // Add to research attempts history
        const updatedResearchAttempts = [newResearchAttempt, ...researchAttempts];
        setResearchAttempts(updatedResearchAttempts);
        
        // Save to Chrome storage
        chrome.storage.local.set({
          savedResearchAttempts: updatedResearchAttempts
        }, () => {
          console.log('Research attempt saved to storage');
        });
        
        return Promise.resolve(researchResult);
      } catch (error) {
        console.error('Error researching faces:', error);
        return Promise.reject(error);
      } finally {
        setIsResearching(false);
      }
    }
  }));
  
  // Local handler for the research button (if shown)
  const handleResearchClick = async () => {
    if (ref.current && ref.current.handleResearchClick) {
      ref.current.handleResearchClick();
    }
  };
  
  // Handle clicking on a face card to show detailed view
  const handleFaceClick = (face, index) => {
    if (currentResearchResult) {
      setSelectedFace({
        ...face,
        index,
        result: currentResearchResult
      });
      setDetailView(true);
    }
  };
  
  // Handle going back to the gallery view
  const handleBackToGallery = () => {
    setDetailView(false);
    setSelectedFace(null);
  };
  
  // Handle removing a face from the gallery
  const handleRemoveFace = (index, e) => {
    e.stopPropagation(); // Prevent triggering the face click handler
    
    // Get the face URL before removing it
    const faceToRemove = faceImages[index];
    if (!faceToRemove) {
      console.error('No face found at index', index);
      return;
    }
    
    const faceUrlToRemove = faceToRemove.imageUrl;
    console.log('Removing face at index', index, 'with URL', faceUrlToRemove);
    
    // Call the onFaceRemove callback if provided (to update the face count in useScreenshotCapture)
    if (onFaceRemove) {
      console.log('Calling onFaceRemove with index', index);
      onFaceRemove(index);
    } else {
      console.log('No onFaceRemove callback provided');
      
      // If no callback provided, update local state
      const updatedFaces = [...faceImages];
      updatedFaces.splice(index, 1);
      setFaceImages(updatedFaces);
    }
  };
  
  if (isLoading) {
    return (
      <div className="face-gallery loading">
        <div className="loading-text">Detecting faces...</div>
      </div>
    );
  }

  // If we're showing the detail view, render that regardless of whether there are current faces
  if (detailView && selectedFace) {
    const result = selectedFace.result;
    const index = selectedFace.index !== undefined ? selectedFace.index : 0;
    const researchAttempt = selectedFace.researchAttempt;
    
    // Check if the result is an error
    const isError = result && result.error;
    
    return (
      <div className="face-detail-view">
        <div className="detail-header">
          <button className="back-button" onClick={handleBackToGallery}>
            ← Back
          </button>
          <h3>Research Results</h3>
        </div>
        
        <div className="detail-content">
          {selectedFace.imageUrl && (
            <div className="detail-main-image">
              <img 
                src={selectedFace.imageUrl} 
                alt={`Face ${index + 1}`} 
                className="detail-face-image"
              />
            </div>
          )}
          
          {isError ? (
            <div className="detail-error">
              <h4>Error Processing Face</h4>
              <div className="error-message">{result.errorMessage}</div>
              {result.details && (
                <div className="error-details">{result.details}</div>
              )}
              {result.errorType && (
                <div className="error-type">Error type: {result.errorType}</div>
              )}
            </div>
          ) : (
            <>
              <div className="detail-info">
                <h4>Research Summary</h4>
                <div className="simplified-notice">
                  <p>Found {result.matchCount || 0} potential matches.</p>
                  {researchAttempt && (
                    <p>This research included {researchAttempt.faceCount || 0} faces.</p>
                  )}
                  {researchAttempt && researchAttempt.timestamp && (
                    <p>Research performed: {new Date(researchAttempt.timestamp).toLocaleString()}</p>
                  )}
                </div>
              </div>
              
              {result.sourceUrls && result.sourceUrls.length > 0 && (
                <div className="detail-sources">
                  <div className="sources-header">
                    <h4>Sources ({result.sourceUrls.length})</h4>
                    <button 
                      className="open-all-links-button"
                      onClick={() => {
                        // Open URLs one at a time with a delay to avoid popup blocking
                        const openUrlWithDelay = (urls, index) => {
                          if (index >= urls.length) return;
                          
                          const newTab = window.open(urls[index], '_blank');
                          console.log(`Opening URL ${index + 1}/${urls.length}: ${urls[index]}`);
                          
                          // If successful, continue with the next URL after a delay
                          if (newTab) {
                            setTimeout(() => {
                              openUrlWithDelay(urls, index + 1);
                            }, 300); // 300ms delay between opening tabs
                          } else {
                            console.error('Popup was blocked for URL:', urls[index]);
                            alert('Please allow popups for this site to open all links');
                          }
                        };
                        
                        // Start opening URLs from the first one
                        openUrlWithDelay(result.sourceUrls, 0);
                      }}
                    >
                      Open All Links
                    </button>
                  </div>
                  <div className="source-list">
                    {result.sourceUrls.map((url, i) => {
                      // Get the corresponding thumbnail if available
                      const thumbnail = result.thumbnailUrls && result.thumbnailUrls[i];
                      
                      return (
                        <div key={`source-${i}`} className="source-item">
                          {thumbnail && (
                            <div className="source-thumbnail">
                              <img src={thumbnail} alt="Result thumbnail" />
                            </div>
                          )}
                          <div className="source-url">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              {url.length > 50 ? url.substring(0, 50) + '...' : url}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  
  // If no current faces but we have research history, show that
  if (!faceImages || faceImages.length === 0) {
    return (
      <div className="face-gallery">
        <div className="face-gallery empty">
          <div className="empty-message">
            No faces detected. Try capturing another screenshot.
          </div>
        </div>
        
        {/* Always show research history section if available */}
        {hasResearchHistory && (
          <div className="research-history-section">
            <div className="research-history-header" onClick={toggleResearchHistory}>
              <h3>Research History ({researchAttempts.length})</h3>
              <button className="toggle-button">
                {showResearchHistory ? '▼' : '►'}
              </button>
            </div>
            
            {showResearchHistory && (
              <div className="research-attempts-list">
                {researchAttempts.map((attempt, index) => {
                  const timestamp = new Date(attempt.timestamp).toLocaleString();
                  const faceCount = attempt.faceCount || attempt.faceImages?.length || 0;
                  const matchCount = attempt.researchResult?.matchCount || 0;
                  
                  return (
                    <div 
                      key={`attempt-${index}`} 
                      className="research-attempt-item"
                      onClick={() => handleResearchAttemptClick(attempt)}
                    >
                      <div className="attempt-info">
                        <div className="attempt-timestamp">{timestamp}</div>
                        <div className="attempt-stats">
                          {faceCount} faces, {matchCount} matches
                        </div>
                      </div>
                      <button 
                        className="remove-attempt-button" 
                        onClick={(e) => handleRemoveResearchAttempt(index, e)}
                        title="Remove this research attempt"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Default view: show the face gallery
  return (
    <div className="face-gallery">
      {/* Current faces */}
      <div className="face-gallery-header">
        <h3>Detected Faces ({faceImages.length})</h3>
      </div>
      
      <div className="face-grid">
        {faceImages.map((face, index) => {
          const progress = researchProgress;
          
          return (
            <div 
              key={`face-${index}`} 
              className={`face-item ${isResearching ? 'researching' : ''}`}
              onClick={() => handleFaceClick(face, index)}
            >
              <button 
                className="remove-face-button" 
                onClick={(e) => handleRemoveFace(index, e)}
                title="Remove this face"
              >
                ×
              </button>
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
            </div>
          );
        })}
      </div>
      
      {/* Research button (if not hidden) */}
      {!hideResearchButton && (
        <div className="research-button-container">
          <button 
            className={`research-button ${isResearching ? 'researching' : ''}`}
            onClick={handleResearchClick}
            disabled={isResearching || faceImages.length === 0}
          >
            {isResearching ? 'Researching...' : 'Research Faces'}
          </button>
        </div>
      )}
      
      {/* Research history section */}
      {hasResearchHistory && (
        <div className="research-history-section">
          <div className="research-history-header" onClick={toggleResearchHistory}>
            <h3>Research History ({researchAttempts.length})</h3>
            <button className="toggle-button">
              {showResearchHistory ? '▼' : '►'}
            </button>
          </div>
          
          {showResearchHistory && (
            <div className="research-attempts-list">
              {researchAttempts.map((attempt, index) => {
                const timestamp = new Date(attempt.timestamp).toLocaleString();
                const faceCount = attempt.faceCount || attempt.faceImages?.length || 0;
                const matchCount = attempt.researchResult?.matchCount || 0;
                
                return (
                  <div 
                    key={`attempt-${index}`} 
                    className="research-attempt-item"
                    onClick={() => handleResearchAttemptClick(attempt)}
                  >
                    <div className="attempt-info">
                      <div className="attempt-timestamp">{timestamp}</div>
                      <div className="attempt-stats">
                        {matchCount} matches
                      </div>
                    </div>
                    <button 
                      className="remove-attempt-button" 
                      onClick={(e) => handleRemoveResearchAttempt(index, e)}
                      title="Remove this research attempt"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default FaceGallery;
