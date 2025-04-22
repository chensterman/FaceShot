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
  const [researchedFaces, setResearchedFaces] = useState([]);
  const [showResearchedFaces, setShowResearchedFaces] = useState(true);
  
  // Define helper functions early to avoid reference errors
  const toggleResearchedFaces = () => {
    setShowResearchedFaces(!showResearchedFaces);
  };
  
  // Handle clicking on a researched face
  const handleResearchedFaceClick = (face) => {
    console.log('Showing detail view for researched face:', face);
    setSelectedFace({
      ...face.faceImage,
      result: face.researchResult,
      index: researchedFaces.findIndex(f => f.faceImage.imageUrl === face.faceImage.imageUrl)
    });
    setDetailView(true);
  };
  
  // Handle removing a researched face
  const handleRemoveResearchedFace = (index, e) => {
    e.stopPropagation();
    
    // Remove the face from the researched faces
    const updatedResearchedFaces = [...researchedFaces];
    updatedResearchedFaces.splice(index, 1);
    setResearchedFaces(updatedResearchedFaces);
    
    // Update storage
    chrome.storage.local.set({
      savedResearchedFaces: updatedResearchedFaces
    }, () => {
      console.log('Removed face from researched faces');
    });
  };
  
  // Check if we have researched faces to display
  const hasResearchedFaces = researchedFaces && researchedFaces.length > 0;
  
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
  
  // Load saved researched faces when component mounts
  useEffect(() => {
    const loadSavedResearchedFaces = async () => {
      try {
        // Get researched faces from Chrome storage (both images and results)
        chrome.storage.local.get(['savedResearchedFaces'], (result) => {
          const savedResearchedFaces = result.savedResearchedFaces || [];
          
          if (savedResearchedFaces.length === 0) {
            console.log('No saved researched faces found');
            return;
          }
          
          console.log(`Loaded ${savedResearchedFaces.length} saved researched faces`);
          setResearchedFaces(savedResearchedFaces);
          
          // Extract just the research results for the current session
          const savedResults = savedResearchedFaces.map(face => face.researchResult);
          
          // Also check if any current faces match with saved researched faces
          if (faceImages.length > 0) {
            const currentFaceUrls = faceImages.map(face => face.imageUrl);
            const matchingResults = [];
            
            // For each current face, find its matching research result
            currentFaceUrls.forEach(faceUrl => {
              const matchingFace = savedResearchedFaces.find(face => 
                face.faceImage.imageUrl === faceUrl
              );
              
              if (matchingFace) {
                matchingResults.push(matchingFace.researchResult);
                console.log(`Found matching research result for current face`);
              }
            });
            
            if (matchingResults.length > 0) {
              // Combine with any existing research results
              setResearchResults(prev => [...prev, ...matchingResults]);
            }
          }
        });
      } catch (error) {
        console.error('Error loading saved researched faces:', error);
      }
    };
    
    loadSavedResearchedFaces();
  }, []);
  
  // Update research results when faceImages change
  useEffect(() => {
    if (faceImages.length === 0 || researchResults.length === 0) return;
    
    // Match research results with current faces
    const currentFaceUrls = faceImages.map(face => face.imageUrl);
    const matchingResults = [];
    
    // For each current face, find its matching research result
    currentFaceUrls.forEach(faceUrl => {
      const matchingResult = researchResults.find(result => 
        result.imageDataUrl === faceUrl
      );
      
      if (matchingResult) {
        matchingResults.push(matchingResult);
      }
    });
    
    // Only update if we found matches and the count is different
    if (matchingResults.length > 0 && matchingResults.length !== researchResults.length) {
      console.log(`Matched ${matchingResults.length} research results with current faces`);
      setResearchResults(matchingResults);
    }
  }, [faceImages, researchResults]);
  
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
        
        // Save both face images and research results for researched faces
        try {
          // Create new researched faces entries
          const newResearchedFaces = [];
          
          // For each new result, find its corresponding face image
          newResults.forEach(newResult => {
            const matchingFace = facesToProcess.find(face => 
              face.imageUrl === newResult.imageDataUrl
            );
            
            if (matchingFace) {
              // Create a new researched face entry
              newResearchedFaces.push({
                faceImage: matchingFace,
                researchResult: newResult,
                timestamp: new Date().toISOString()
              });
            }
          });
          
          // Combine with existing researched faces
          const updatedResearchedFaces = [...researchedFaces];
          
          // Add or update researched faces
          newResearchedFaces.forEach(newFace => {
            // Check if this face already exists
            const existingIndex = updatedResearchedFaces.findIndex(
              f => f.faceImage.imageUrl === newFace.faceImage.imageUrl
            );
            
            if (existingIndex !== -1) {
              // Replace the existing face
              updatedResearchedFaces[existingIndex] = newFace;
            } else {
              // Add the new face
              updatedResearchedFaces.push(newFace);
            }
          });
          
          // Update state
          setResearchedFaces(updatedResearchedFaces);
          
          // Save to Chrome storage
          chrome.storage.local.set({
            savedResearchedFaces: updatedResearchedFaces
          }, () => {
            console.log('Researched faces saved to storage (both images and results)');
          });
        } catch (error) {
          console.error('Error saving researched faces:', error);
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
    
    // Get the face URL before removing it
    const faceToRemove = faceImages[index];
    const faceUrlToRemove = faceToRemove.imageUrl;
    
    // Remove the face from the local state
    const updatedFaces = [...faceImages];
    updatedFaces.splice(index, 1);
    setFaceImages(updatedFaces);
    
    // Remove the corresponding research result if it exists
    const updatedResults = researchResults.filter(result => 
      result.imageDataUrl !== faceUrlToRemove
    );
    setResearchResults(updatedResults);
    
    // Update researched faces in storage
    try {
      // Remove from researched faces if it exists there
      const updatedResearchedFaces = researchedFaces.filter(face => 
        face.faceImage.imageUrl !== faceUrlToRemove
      );
      
      // Only update if something was actually removed
      if (updatedResearchedFaces.length !== researchedFaces.length) {
        setResearchedFaces(updatedResearchedFaces);
        
        // Update storage
        chrome.storage.local.set({
          savedResearchedFaces: updatedResearchedFaces
        }, () => {
          console.log('Updated researched faces in storage after removing face');
        });
      }
    } catch (error) {
      console.error('Error updating researched faces after removing face:', error);
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
    // This is already handled above
    // The detailed view will be shown for both current and researched faces
  }
  // If no current faces but we have researched faces, show those
  else if (!faceImages || faceImages.length === 0) {
    return (
      <div className="face-gallery">
        <div className="face-gallery empty">
          <div className="empty-message">
            No faces detected. Try capturing another screenshot.
          </div>
        </div>
        
        {/* Always show researched faces section if available */}
        {hasResearchedFaces && (
          <div className="researched-faces-section">
            <div className="researched-faces-header" onClick={toggleResearchedFaces}>
              <h3>Researched Faces ({researchedFaces.length})</h3>
              <button className="toggle-button">
                {showResearchedFaces ? '▼' : '►'}
              </button>
            </div>
            
            {showResearchedFaces && (
              <div className="face-grid researched-faces-grid">
                {researchedFaces.map((face, index) => {
                  const faceResult = face.researchResult;
                  
                  return (
                    <div 
                      key={`researched-${index}`} 
                      className={`face-item researched-face ${faceResult ? 'has-results clickable' : ''}`}
                      onClick={() => handleResearchedFaceClick(face)}
                      style={faceResult?.error ? { borderColor: '#ffcdd2', borderWidth: '2px' } : {}}
                    >
                      <button 
                        className="remove-face-button" 
                        onClick={(e) => handleRemoveResearchedFace(index, e)}
                        title="Remove this face"
                      >
                        ×
                      </button>
                      <img 
                        src={face.faceImage.imageUrl} 
                        alt={`Researched Face ${index + 1}`}
                        className="face-image"
                      />
                      <div className="face-name">
                        {faceResult.name || `Face ${index + 1}`}
                      </div>
                      
                      {faceResult && (
                        <div className={`face-research-result ${faceResult.error ? 'error' : ''}`}>
                          {faceResult.error ? (
                            <div className="face-error-message">
                              ⚠️ {faceResult.errorMessage || 'Processing failed'}
                            </div>
                          ) : (
                            <button className="view-details-button">
                              View Details
                            </button>
                          )}
                        </div>
                      )}
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
  
  // Render the detailed view for a selected face
  if (detailView && selectedFace) {
    // Get the result and index from selectedFace
    // The structure might be different depending on whether it came from
    // current faces or researched faces
    const result = selectedFace.result;
    const index = selectedFace.index !== undefined ? selectedFace.index : 0;
    
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
                {result.simplified && (
                  <div className="simplified-notice">
                    <p>URL scraping and LLM aggregation were skipped.</p>
                    <p>Found {result.matchCount || 0} potential matches.</p>
                  </div>
                )}
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
  
  // These functions are now defined at the top of the component to avoid reference errors

  // Render the main gallery view
  return (
    <div className="face-gallery">
      {/* Current session faces */}
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
      
      {/* Researched faces section */}
      {researchedFaces.length > 0 && (
        <div className="researched-faces-section">
          <div className="researched-faces-header" onClick={toggleResearchedFaces}>
            <h3>Researched Faces ({researchedFaces.length})</h3>
            <button className="toggle-button">
              {showResearchedFaces ? '▼' : '►'}
            </button>
          </div>
          
          {showResearchedFaces && (
            <div className="face-grid researched-faces-grid">
              {researchedFaces.map((face, index) => {
                const faceResult = face.researchResult;
                
                return (
                  <div 
                    key={`researched-${index}`} 
                    className={`face-item researched-face ${faceResult ? 'has-results clickable' : ''}`}
                    onClick={() => handleResearchedFaceClick(face)}
                    style={faceResult?.error ? { borderColor: '#ffcdd2', borderWidth: '2px' } : {}}
                  >
                    <button 
                      className="remove-face-button" 
                      onClick={(e) => handleRemoveResearchedFace(index, e)}
                      title="Remove this face"
                    >
                      ×
                    </button>
                    <img 
                      src={face.faceImage.imageUrl} 
                      alt={`Researched Face ${index + 1}`}
                      className="face-image"
                    />
                    <div className="face-name">
                      {faceResult.name || `Face ${index + 1}`}
                    </div>
                    
                    {faceResult && (
                      <div className={`face-research-result ${faceResult.error ? 'error' : ''}`}>
                        {faceResult.error ? (
                          <div className="face-error-message">
                            ⚠️ {faceResult.errorMessage || 'Processing failed'}
                          </div>
                        ) : (
                          <button className="view-details-button">
                            View Details
                          </button>
                        )}
                      </div>
                    )}
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
