import './index.css';
import React, { useState, useEffect, useRef } from 'react';

// Import components
import Header from './components/Header';
import CaptureButton from './components/CaptureButton';
import FaceDisplay from './components/FaceDisplay';

// Import services
import { loadFaceDetectionModels, detectFacesInImage } from './services/faceDetectionService';
import { clearStoredFaces, storeUniqueFaces } from './services/storageService';
import { setupFrameListener, startCapture, stopCapture, getActiveTabId, getRecordingState, updateRecordingState } from './services/messagingService';
import { processFaces } from './services/faceManagementService';

export default function App() {
  // State variables
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [uniqueFaces, setUniqueFaces] = useState([]);
  const [faceModel, setFaceModel] = useState(null);
  const [activeTabId, setActiveTabId] = useState(null);
  const previewRef = useRef(null);
  
  // Load face detection models when component mounts
  useEffect(() => {
    async function initializeApp() {
      try {
        // Load face detection models
        const modelsLoaded = await loadFaceDetectionModels();
        setFaceModel(modelsLoaded);
        
        // Clear any previously stored faces when popup opens
        await clearStoredFaces();
        
        // Get active tab ID
        const tabId = await getActiveTabId();
        setActiveTabId(tabId);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    }
    
    initializeApp();
  }, []);
  
  // Set up message listener for incoming frames
  useEffect(() => {
    const removeListener = setupFrameListener((frameData) => {
      setCurrentFrame(frameData);
    });
    
    // Clean up listener when component unmounts
    return removeListener;
  }, []);
  
  // Process frames for face detection
  useEffect(() => {
    async function processFrame() {
      if (!currentFrame || !faceModel || !activeTabId) return;
      
      try {
        // Detect faces in the current frame
        const extractedFaces = await detectFacesInImage(currentFrame);
        
        // Process faces and update unique faces collection
        // Use a callback form of setState to ensure we always have the latest state
        setUniqueFaces(prevFaces => {
          const { updatedUniqueFaces } = processFaces(extractedFaces, prevFaces);
          return updatedUniqueFaces;
        });
        
        // Update preview image
        if (previewRef.current) {
          previewRef.current.src = currentFrame;
        }
      } catch (error) {
        console.error('Error processing frame:', error);
      }
    }
    
    processFrame();
  }, [currentFrame, faceModel, activeTabId]); // Remove uniqueFaces from dependencies
  
  // Fetch recording state when component mounts
  useEffect(() => {
    async function fetchRecordingState() {
      try {
        const recordingState = await getRecordingState();
        setIsRecording(recordingState);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching recording state:', error);
        setIsLoading(false);
      }
    }
    
    fetchRecordingState();
  }, []);
  
  // Toggle recording state
  const toggleRecording = async () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    // Update recording state in background script
    await updateRecordingState(newRecordingState);
    
    // Send message to content script
    if (newRecordingState) {
      await startCapture();
    } else {
      await stopCapture();
    }
  };
  
  // Clear all detected faces
  const clearAllFaces = async () => {
    // Clear faces from state
    setUniqueFaces([]);
    
    // Clear faces from storage
    await clearStoredFaces();
    
    console.log('All faces cleared');
  };
  
  return (
    <div className="window">
      <Header />
      
      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <CaptureButton 
            isRecording={isRecording} 
            onClick={toggleRecording} 
          />
          
          {isRecording && (
            <FaceDisplay 
              uniqueFaces={uniqueFaces}
              onClearFaces={clearAllFaces}
            />
          )}
          
          {/* Hidden preview image for processing */}
          <img 
            ref={previewRef} 
            style={{ display: 'none' }} 
            alt="Hidden preview" 
          />
        </>
      )}
    </div>
  );
}
