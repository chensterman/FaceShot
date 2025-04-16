import { useState } from 'react';
import { captureScreenshot, processScreenshotForFaces } from '../utils/screenshotUtil';

const useScreenshotCapture = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [screenshotData, setScreenshotData] = useState(null);
  const [error, setError] = useState(null);

  const captureAndProcessScreenshot = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Capture screenshot
      const screenshotDataUrl = await captureScreenshot();
      
      // Process screenshot for face detection (left half only)
      const processedData = await processScreenshotForFaces(screenshotDataUrl, true);
      
      // Update state with processed data
      setScreenshotData(processedData);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error capturing and processing screenshot:', error);
      setError(error);
      setIsProcessing(false);
    }
  };

  return {
    captureAndProcessScreenshot,
    isProcessing,
    screenshotData,
    error
  };
};

export default useScreenshotCapture;
