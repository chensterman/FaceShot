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
      
      // Clear saved research results when capturing a new screenshot
      try {
        chrome.storage.local.remove(['savedResearchResults', 'savedFaceImages']);
        console.log('Cleared saved research results');
      } catch (storageError) {
        console.error('Error clearing saved research results:', storageError);
      }

      // Capture screenshot
      const screenshotDataUrl = await captureScreenshot();
      
      // Process screenshot for face detection (left half only)
      const processedData = await processScreenshotForFaces(screenshotDataUrl, true);
      
      // Update state with processed data
      setScreenshotData(processedData);
      
      // Save screenshot data to Chrome storage
      try {
        chrome.storage.local.set({
          savedScreenshotData: processedData
        });
        console.log('Saved screenshot data to storage');
      } catch (storageError) {
        console.error('Error saving screenshot data:', storageError);
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
