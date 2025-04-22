import { useState, useEffect } from 'react';
import { captureScreenshot, processScreenshotForFaces } from '../utils/screenshotUtil';

const useScreenshotCapture = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [screenshotData, setScreenshotData] = useState(null);
  const [error, setError] = useState(null);
  
  // Load saved screenshot data when the hook initializes
  useEffect(() => {
    const loadSavedScreenshotData = async () => {
      try {
        chrome.storage.local.get(['savedScreenshotData'], (result) => {
          if (result.savedScreenshotData) {
            console.log('Restoring saved screenshot data');
            setScreenshotData(result.savedScreenshotData);
          }
        });
      } catch (error) {
        console.error('Error loading saved screenshot data:', error);
      }
    };
    
    loadSavedScreenshotData();
  }, []);

  const captureAndProcessScreenshot = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Clear previous screenshot data but preserve researched faces
      chrome.storage.local.remove(['savedFaceImages', 'savedResearchResults']);
      console.log('Cleared previous screenshot data for new capture');

      // Capture screenshot
      const screenshotDataUrl = await captureScreenshot();
      
      // Process screenshot for face detection (left half only)
      const processedData = await processScreenshotForFaces(screenshotDataUrl, true);
      
      // Update state with processed data
      setScreenshotData(processedData);
      
      // We don't save screenshot data or face images to storage anymore
      // Only research results will be persisted
      console.log('Screenshot processed - faces detected but not saved to storage');
      
      // Clear any saved screenshot data but keep researched faces
      try {
        chrome.storage.local.remove(['savedScreenshotData', 'savedFaceImages']);
        // Note: We intentionally don't remove 'savedResearchedFaces' to preserve researched faces
      } catch (storageError) {
        console.error('Error clearing saved screenshot data:', storageError);
      }
      
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
