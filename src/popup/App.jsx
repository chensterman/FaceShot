import './index.css';
import React from 'react';
import Header from './components/Header';
import CaptureButton from './components/CaptureButton';
import FaceGallery from './components/FaceGallery';
import useScreenshotCapture from './hooks/useScreenshotCapture';

export default function App() {
  const { isProcessing, screenshotData, error, captureAndProcessScreenshot } = useScreenshotCapture();

  return (
    <div className="window">
      <Header />
      <CaptureButton 
        isProcessing={isProcessing} 
        onClick={captureAndProcessScreenshot} 
      />
      {screenshotData && (
        <FaceGallery 
          faceImages={screenshotData?.faceImages || []} 
          isLoading={isProcessing} 
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