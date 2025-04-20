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
      
      // Store previous research results before clearing them
      let previousResearchResults = [];
      let previousFaceImages = [];
      
      try {
        chrome.storage.local.get(['savedResearchResults', 'savedFaceImages'], (result) => {
          if (result.savedResearchResults && result.savedFaceImages) {
            previousResearchResults = result.savedResearchResults;
            previousFaceImages = result.savedFaceImages;
            console.log('Stored previous research results for potential reuse');
          }
          
          // Now we can safely clear the current research results
          chrome.storage.local.remove(['savedResearchResults', 'savedFaceImages']);
          console.log('Cleared current research results for new capture');
        });
      } catch (storageError) {
        console.error('Error handling research results:', storageError);
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
          savedScreenshotData: processedData,
          // Store the previous research results in a separate key
          previousResearchResults: previousResearchResults,
          previousFaceImages: previousFaceImages
        });
        console.log('Saved screenshot data and preserved previous research results');
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
