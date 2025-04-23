import './index.css';
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ButtonGroup from './components/ButtonGroup';
import FaceGallery from './components/FaceGallery';
import RegionSelector from './components/RegionSelector';
import useScreenshotCapture from './hooks/useScreenshotCapture';

export default function App() {
  const { 
    isProcessing, 
    screenshotData, 
    error, 
    captureAndProcessScreenshot, 
    resetFaces,
    removeFace,
    faceCount,
    maxFaces,
    isFaceCollectionFull,
    setRegion,
    selectedRegion
  } = useScreenshotCapture();
  const [isResearching, setIsResearching] = useState(false);
  const [hasResearchedFaces, setHasResearchedFaces] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  
  // Load region selector visibility state from storage
  useEffect(() => {
    chrome.storage.local.get(['showRegionSelector'], (result) => {
      if (result.showRegionSelector !== undefined) {
        setShowRegionSelector(result.showRegionSelector);
      }
    });
  }, []);
  
  // Reference to the FaceGallery component
  const faceGalleryRef = React.useRef();
  
  // Load saved researched faces from storage
  useEffect(() => {
    chrome.storage.local.get(['savedResearchedFaces'], (result) => {
      if (result.savedResearchedFaces && result.savedResearchedFaces.length > 0) {
        setHasResearchedFaces(true);
      } else {
        setHasResearchedFaces(false);
      }
    });
  }, []);
  
  // Handle research button click
  const handleResearchClick = () => {
    if (faceGalleryRef.current && faceGalleryRef.current.handleResearchClick) {
      setIsResearching(true);
      faceGalleryRef.current.handleResearchClick()
        .finally(() => setIsResearching(false));
    }
  };

  // Handle retake/reset button click
  const handleRetakeClick = () => {
    // Pass true to reset the face collection
    captureAndProcessScreenshot(true);
  };

  // Handle add more faces button click
  const handleAddMoreClick = () => {
    // Don't reset, just add more faces
    captureAndProcessScreenshot(false);
  };

  // Handle region selection
  const handleRegionChange = (regionId) => {
    setRegion(regionId);
  };

  // Toggle region selector visibility
  const toggleRegionSelector = () => {
    const newState = !showRegionSelector;
    setShowRegionSelector(newState);
    
    // Save visibility state to Chrome storage
    chrome.storage.local.set({
      showRegionSelector: newState
    }, () => {
      console.log('Region selector visibility saved:', newState);
    });
  };

  return (
    <div className="window">
      <Header />
      
      {/* Region selector toggle button */}
      <div className="region-selector-toggle">
        <button 
          onClick={toggleRegionSelector}
          className="toggle-button"
        >
          {showRegionSelector ? 'Hide Region Options' : 'Show Region Options'}
        </button>
      </div>
      
      {/* Region selector component (conditionally rendered) */}
      {showRegionSelector && (
        <RegionSelector 
          selectedRegion={selectedRegion}
          onRegionChange={handleRegionChange}
        />
      )}
      
      {/* Face collection progress indicator */}
      {screenshotData && (
        <div className="face-collection-progress">
          <div className="progress-text">
            Face Collection: {faceCount}/{maxFaces}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(faceCount / maxFaces) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <ButtonGroup 
        hasScreenshot={!!screenshotData}
        isProcessing={isProcessing}
        isResearching={isResearching}
        isFaceCollectionFull={isFaceCollectionFull}
        faceCount={faceCount}
        onCaptureClick={() => captureAndProcessScreenshot(false)}
        onRetakeClick={handleRetakeClick}
        onAddMoreClick={handleAddMoreClick}
        onResearchClick={handleResearchClick}
      />
      
      {/* Always show FaceGallery to display researched faces, even when no current screenshot */}
      <FaceGallery 
        ref={faceGalleryRef}
        faceImages={screenshotData?.faceImages || []} 
        isLoading={isProcessing}
        hideResearchButton={true}
        onFaceRemove={removeFace}
      />
      
      {/* Show initial message only if there's no screenshot and no researched faces */}
      {!screenshotData && !isProcessing && !hasResearchedFaces && (
        <div className="initial-message">
          Click the Capture button to take a screenshot and detect faces.
          You can take multiple screenshots to collect up to {maxFaces} faces.
        </div>
      )}
    </div>
  );
}