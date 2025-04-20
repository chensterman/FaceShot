import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './researchButton.css';
import { processMultipleFaces } from '../services/faceResearch';

const FaceGallery = forwardRef(({ faceImages: initialFaceImages, isLoading, hideResearchButton = false }, ref) => {
  // Track faces locally so we can remove them
  const [faceImages, setFaceImages] = useState(initialFaceImages || []);
  const [isResearching, setIsResearching] = useState(false);
  const [researchResults, setResearchResults] = useState([]);
  const [researchProgress, setResearchProgress] = useState({});
  const [selectedFace, setSelectedFace] = useState(null);
  const [detailView, setDetailView] = useState(false);
  
  // Add some CSS for error styling and face removal
  useEffect(() => {
    const styles = document.createElement('style');
    styles.textContent = `
      .remove-face-button {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .face-item {
        position: relative;
      }
      
      .face-item:hover .remove-face-button {
        opacity: 1;
      }
      
      .remove-face-button:hover {
        background-color: rgba(220, 0, 0, 0.8);
      }
      
      .face-error-message {
        background-color: rgba(255, 0, 0, 0.1);
        color: #d32f2f;
        padding: 8px;
        border-radius: 4px;
        font-size: 12px;
        text-align: center;
        cursor: pointer;
      }
      
      .face-research-result.error {
        background-color: rgba(255, 0, 0, 0.05);
      }
      
      .detail-error {
        background-color: rgba(255, 0, 0, 0.05);
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
      }
      
      .error-message {
        font-size: 16px;
        color: #d32f2f;
        margin-bottom: 8px;
      }
      
      .error-details, .error-type {
        font-size: 14px;
        color: #757575;
        margin-top: 8px;
      }
    `;
    document.head.appendChild(styles);
    
    // Clean up style element on unmount
    return () => {
      document.head.removeChild(styles);
    };
  }, []);
  
  // Update local faces when props change
  useEffect(() => {
    if (initialFaceImages && initialFaceImages.length > 0) {
      setFaceImages(initialFaceImages);
    }
  }, [initialFaceImages]);
  
  // Load saved research results when component mounts
  useEffect(() => {
    const loadSavedResults = async () => {
      try {
        // Get saved face images and research results from Chrome storage
        // Also check for previous research results that might have been preserved
        chrome.storage.local.get([
          'savedFaceImages', 
          'savedResearchResults', 
          'previousFaceImages', 
          'previousResearchResults'
        ], (result) => {
          const savedFaceImages = result.savedFaceImages || [];
          const savedResearchResults = result.savedResearchResults || [];
          const previousFaceImages = result.previousFaceImages || [];
          const previousResearchResults = result.previousResearchResults || [];
          
          // Check if the current face images match the saved ones
          const currentFaceUrls = faceImages.map(face => face.imageUrl);
          const savedFaceUrls = savedFaceImages.map(face => face.imageUrl);
          
          // First try to restore current research results if they match
          if (currentFaceUrls.length > 0 && 
              currentFaceUrls.length === savedFaceUrls.length && 
              currentFaceUrls.every((url, i) => url === savedFaceUrls[i])) {
            console.log('Restoring saved research results');
            setResearchResults(savedResearchResults);
            return;
          }
          
          // If no current match, try to match with previous research results
          if (previousResearchResults.length > 0 && previousFaceImages.length > 0) {
            const previousFaceUrls = previousFaceImages.map(face => face.imageUrl);
            
            // Check if any of the current faces match previous faces
            const matchedResults = [];
            
            currentFaceUrls.forEach(currentUrl => {
              // Find the index of this URL in the previous faces
              const prevIndex = previousFaceUrls.findIndex(prevUrl => prevUrl === currentUrl);
              
              // If found, get the corresponding research result
              if (prevIndex !== -1 && previousResearchResults[prevIndex]) {
                matchedResults.push(previousResearchResults[prevIndex]);
                console.log(`Restored research result for face with URL ${currentUrl.substring(0, 30)}...`);
              }
            });
            
            if (matchedResults.length > 0) {
              console.log(`Restored ${matchedResults.length} research results from previous session`);
              setResearchResults(matchedResults);
            }
          }
        });
      } catch (error) {
        console.error('Error loading saved research results:', error);
      }
    };
    
    loadSavedResults();
  }, [faceImages]);
  
  // Expose the handleResearchClick method to parent components
  useImperativeHandle(ref, () => ({
    handleResearchClick: async () => {
      if (isResearching || !faceImages || faceImages.length === 0) return Promise.resolve();
      
      setIsResearching(true);
      // Don't clear existing research results immediately
      // This allows us to keep existing results while researching new faces
      // setResearchResults([]);
      setResearchProgress({});
      
      try {
        // Get the list of faces that haven't been researched yet
        const existingResultUrls = researchResults.map(result => result.imageDataUrl);
        const facesToResearch = faceImages.filter(face => 
          !existingResultUrls.includes(face.imageUrl)
        );
        
        console.log(`Researching ${facesToResearch.length} new faces out of ${faceImages.length} total faces`);
        
        // Process only the new faces if there are any, otherwise process all faces
        const facesToProcess = facesToResearch.length > 0 ? facesToResearch : faceImages;
        
        // Process faces concurrently
        const newResults = await processMultipleFaces(facesToProcess, {
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
        
        // Combine existing results with new ones
        let combinedResults = [...researchResults];
        
        // Add new results
        newResults.forEach(newResult => {
          // Check if this result already exists (by imageDataUrl)
          const existingIndex = combinedResults.findIndex(r => r.imageDataUrl === newResult.imageDataUrl);
          if (existingIndex !== -1) {
            // Replace the existing result
            combinedResults[existingIndex] = newResult;
          } else {
            // Add the new result
            combinedResults.push(newResult);
          }
        });
        
        setResearchResults(combinedResults);
        console.log('Research results updated:', combinedResults);
        
        // Save results to Chrome storage
        try {
          chrome.storage.local.set({
            savedFaceImages: faceImages,
            savedResearchResults: combinedResults,
            // Also update the previous results to ensure they're preserved
            previousFaceImages: faceImages,
            previousResearchResults: combinedResults
          });
          console.log('Research results saved to storage');
        } catch (error) {
          console.error('Error saving research results:', error);
        }
        return Promise.resolve();
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
  
  // Handle removing a face from the gallery
  const handleRemoveFace = (index, e) => {
    e.stopPropagation(); // Prevent triggering the face click handler
    
    // Remove the face from the local state
    const updatedFaces = [...faceImages];
    updatedFaces.splice(index, 1);
    setFaceImages(updatedFaces);
    
    // Remove the corresponding research result if it exists
    const updatedResults = researchResults.filter(result => 
      result.imageDataUrl !== faceImages[index].imageUrl
    );
    setResearchResults(updatedResults);
    
    // Update storage with the new lists
    try {
      chrome.storage.local.set({
        savedFaceImages: updatedFaces,
        savedResearchResults: updatedResults
      });
      console.log('Updated storage after removing face');
    } catch (error) {
      console.error('Error updating storage after removing face:', error);
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
  
  // Render the detailed view for a selected face
  if (detailView && selectedFace) {
    const { result, index } = selectedFace;
    
    // Check if the result is an error
    const isError = result && result.error;
    
    return (
      <div className="face-detail-view">
        <div className="detail-header">
          <button className="back-button" onClick={handleBackToGallery}>
            ← Back
          </button>
          <h3>{isError ? `Face #${index + 1}` : (result.name || `Face #${index + 1}`)}</h3>
        </div>
        
        <div className="detail-content">
          <div className="detail-main-image">
            <img 
              src={selectedFace.imageUrl} 
              alt={`Face ${index + 1}`} 
              className="detail-face-image"
            />
          </div>
          
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
            </>
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
        {!hideResearchButton && (
          <button 
            className={`research-button ${isResearching ? 'researching' : ''}`}
            onClick={handleResearchClick}
            disabled={isResearching}
          >
            {isResearching ? 'Researching...' : 'Research Faces'}
          </button>
        )}
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
              style={faceResult?.error ? { borderColor: '#ffcdd2', borderWidth: '2px' } : {}}
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
              
              {faceResult && (
                <div className={`face-research-result ${faceResult.error ? 'error' : ''}`}>
                  {faceResult.error ? (
                    <div className="face-error-message" onClick={(e) => {
                      e.stopPropagation();
                      handleFaceClick(face, index);
                    }}>
                      ⚠️ {faceResult.errorMessage || 'Processing failed'}
                    </div>
                  ) : (
                    <button className="view-details-button" onClick={(e) => {
                      e.stopPropagation();
                      handleFaceClick(face, index);
                    }}>
                      Results
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default FaceGallery;
