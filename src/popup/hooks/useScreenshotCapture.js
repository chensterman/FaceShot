import { useState, useEffect } from 'react';
import { captureScreenshot, processScreenshotForFaces } from '../utils/screenshotUtil';

const useScreenshotCapture = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [screenshotData, setScreenshotData] = useState(null);
  const [error, setError] = useState(null);
  const [accumulatedFaces, setAccumulatedFaces] = useState([]);
  const [faceCount, setFaceCount] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState('leftHalf'); // Default to left half
  
  // Maximum number of faces to collect before researching
  const MAX_FACES = 25;
  
  // Reset accumulated faces and start fresh
  const resetFaces = () => {
    setAccumulatedFaces([]);
    setFaceCount(0);
    setScreenshotData(null);
  };

  // Load saved screenshot data when the hook initializes
  useEffect(() => {
    const loadSavedScreenshotData = async () => {
      try {
        // Always reset when extension is opened
        console.log('Resetting state on extension load');
        setAccumulatedFaces([]);
        setFaceCount(0);
        setScreenshotData(null);
        
        // Load saved region and visibility state if available
        chrome.storage.local.get(['savedRegion', 'showRegionSelector'], (result) => {
          if (result.savedRegion) {
            console.log('Loaded saved region:', result.savedRegion);
            setSelectedRegion(result.savedRegion);
          }
        });
        
        // Clear any saved screenshot data
        chrome.storage.local.remove(['savedScreenshotData', 'savedFaceImages']);
      } catch (error) {
        console.error('Error handling extension initialization:', error);
      }
    };
    
    loadSavedScreenshotData();
  }, []);

  // This function is now defined above the useEffect

  // Capture a screenshot and add detected faces to the accumulated collection
  const captureAndProcessScreenshot = async (shouldReset = false) => {
    try {
      // If reset is requested or we're at the maximum, start fresh
      if (shouldReset) {
        resetFaces();
      }
      
      setIsProcessing(true);
      setError(null);
      
      // Preserve researched faces
      chrome.storage.local.remove(['savedFaceImages', 'savedResearchResults']);
      console.log('Cleared previous screenshot data for new capture');

      // Capture screenshot
      const screenshotDataUrl = await captureScreenshot();
      
      console.log('Using region:', selectedRegion);
      
      // Process screenshot based on selected region
      let leftHalfOnly = false;
      let topLeftCornerOnly = false;
      
      if (selectedRegion === 'leftHalf') {
        leftHalfOnly = true;
      } else if (selectedRegion === 'topLeftCorner') {
        topLeftCornerOnly = true;
      }
      // 'full' region uses both flags as false
      
      // Process screenshot for face detection with the selected region
      const processedData = await processScreenshotForFaces(screenshotDataUrl, leftHalfOnly, topLeftCornerOnly);
      
      // Add newly detected faces to our accumulated collection
      const newFaces = processedData.faceImages || [];
      console.log(`Detected ${newFaces.length} new faces`);
      
      // Create a combined set of faces (existing + new)
      let updatedFaces = [...accumulatedFaces];
      
      // Add new faces, but respect the maximum limit
      const remainingSlots = MAX_FACES - updatedFaces.length;
      const facesToAdd = newFaces.slice(0, remainingSlots);
      updatedFaces = [...updatedFaces, ...facesToAdd];
      
      // Update the accumulated faces
      setAccumulatedFaces(updatedFaces);
      setFaceCount(updatedFaces.length);
      
      // Create an updated screenshot data object with all accumulated faces
      const updatedScreenshotData = {
        ...processedData,
        faceImages: updatedFaces,
        totalFaces: updatedFaces.length
      };
      
      // Update state with the combined data
      setScreenshotData(updatedScreenshotData);
      
      console.log(`Now have ${updatedFaces.length}/${MAX_FACES} faces collected`);
      
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

  // Remove a face from the collection by its index or imageUrl
  const removeFace = (faceIdentifier) => {
    console.log('Removing face:', faceIdentifier);
    
    // Check if we have any faces to remove
    if (!screenshotData) {
      console.log('No screenshot data, cannot remove face');
      return;
    }
    
    // Get the current faces from the screenshot data
    const currentFaces = screenshotData.faceImages || [];
    if (currentFaces.length === 0) {
      console.log('No faces to remove');
      return;
    }
    
    let updatedFaces;
    
    // If faceIdentifier is a number, it's an index
    if (typeof faceIdentifier === 'number') {
      console.log(`Removing face at index ${faceIdentifier}`);
      updatedFaces = [...currentFaces];
      // Remove face at the specified index if valid
      if (faceIdentifier >= 0 && faceIdentifier < updatedFaces.length) {
        updatedFaces.splice(faceIdentifier, 1);
      }
    } 
    // If it's a string, it's an imageUrl
    else if (typeof faceIdentifier === 'string') {
      console.log(`Removing face with imageUrl ${faceIdentifier}`);
      updatedFaces = currentFaces.filter(face => face.imageUrl !== faceIdentifier);
    }
    // If it's an object, it's a face object
    else if (typeof faceIdentifier === 'object' && faceIdentifier !== null) {
      console.log(`Removing face object with imageUrl ${faceIdentifier.imageUrl}`);
      updatedFaces = currentFaces.filter(face => face.imageUrl !== faceIdentifier.imageUrl);
    }
    else {
      // Invalid identifier type
      console.log('Invalid face identifier type:', typeof faceIdentifier);
      return;
    }
    
    // Update the accumulated faces
    setAccumulatedFaces(updatedFaces);
    setFaceCount(updatedFaces.length);
    
    // Create an updated screenshot data object with the remaining faces
    const updatedScreenshotData = {
      ...screenshotData,
      faceImages: updatedFaces,
      totalFaces: updatedFaces.length
    };
    
    // Update state with the updated data
    setScreenshotData(updatedScreenshotData);
    
    // Save the updated screenshot data to storage
    try {
      chrome.storage.local.set({
        savedScreenshotData: updatedScreenshotData
      }, () => {
        console.log(`Face removed. Now have ${updatedFaces.length}/${MAX_FACES} faces collected`);
      });
    } catch (error) {
      console.error('Error saving updated screenshot data:', error);
    }
  };

  // Set the region to capture
  const setRegion = (regionId) => {
    console.log('Setting screenshot region:', regionId);
    setSelectedRegion(regionId);
    
    // Save the region to Chrome storage
    chrome.storage.local.set({
      savedRegion: regionId
    }, () => {
      console.log('Region saved to storage');
    });
  };

  return {
    captureAndProcessScreenshot,
    resetFaces,
    removeFace,
    setRegion,
    isProcessing,
    screenshotData,
    error,
    faceCount,
    maxFaces: MAX_FACES,
    isFaceCollectionFull: faceCount >= MAX_FACES,
    selectedRegion
  };
};

export default useScreenshotCapture;
