import './index.css';
import React, { useState } from 'react';
import Header from './components/Header';
import ButtonGroup from './components/ButtonGroup';
import FaceGallery from './components/FaceGallery';
import useScreenshotCapture from './hooks/useScreenshotCapture';

export default function App() {
  const { isProcessing, screenshotData, error, captureAndProcessScreenshot } = useScreenshotCapture();
  const [isResearching, setIsResearching] = useState(false);
  
  // Reference to the FaceGallery component
  const faceGalleryRef = React.useRef();
  
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
      {screenshotData && (
        <FaceGallery 
          ref={faceGalleryRef}
          faceImages={screenshotData?.faceImages || []} 
          isLoading={isProcessing}
          hideResearchButton={true}
        />
      )}
      {!screenshotData && !isProcessing && (
        <div className="initial-message">
          Click the Capture button to take a screenshot and detect faces
        </div>
      )}
    </div>
  );
}