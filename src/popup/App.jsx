import './index.css';
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ButtonGroup from './components/ButtonGroup';
import FaceGallery from './components/FaceGallery';
import useScreenshotCapture from './hooks/useScreenshotCapture';

export default function App() {
  const { isProcessing, screenshotData, error, captureAndProcessScreenshot } = useScreenshotCapture();
  const [isResearching, setIsResearching] = useState(false);
  const [hasResearchedFaces, setHasResearchedFaces] = useState(false);
  
  // Reference to the FaceGallery component
  const faceGalleryRef = React.useRef();
  
  // Check if there are any researched faces in storage
  useEffect(() => {
    chrome.storage.local.get(['savedResearchedFaces'], (result) => {
      const savedResearchedFaces = result.savedResearchedFaces || [];
      setHasResearchedFaces(savedResearchedFaces.length > 0);
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

  return (
    <div className="window">
      <Header />
      <ButtonGroup 
        hasScreenshot={!!screenshotData}
        isProcessing={isProcessing}
        isResearching={isResearching}
        onCaptureClick={captureAndProcessScreenshot}
        onRetakeClick={captureAndProcessScreenshot}
        onResearchClick={handleResearchClick}
      />
      {/* Always show FaceGallery to display researched faces, even when no current screenshot */}
      <FaceGallery 
        ref={faceGalleryRef}
        faceImages={screenshotData?.faceImages || []} 
        isLoading={isProcessing}
        hideResearchButton={true}
      />
      
      {/* Show initial message only if there's no screenshot and no researched faces */}
      {!screenshotData && !isProcessing && !hasResearchedFaces && (
        <div className="initial-message">
          Click the Capture button to take a screenshot and detect faces
        </div>
      )}
    </div>
  );
}