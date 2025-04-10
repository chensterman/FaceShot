import './index.css';
import { useState, useEffect } from 'react';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch the current recording state when popup opens
  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'getRecordingState' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting recording state:', chrome.runtime.lastError);
        setIsLoading(false);
      } else if (response && response.isRecording !== undefined) {
        console.log('Retrieved recording state:', response.isRecording);
        setIsRecording(response.isRecording);
        setIsLoading(false);
      } else {
        console.warn('Received invalid response for recording state');
        setIsLoading(false);
      }
    });
  }, []);

  const toggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    // Update recording state in background script
    chrome.runtime.sendMessage(
      { action: 'updateRecordingState', isRecording: newRecordingState },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error updating recording state:', chrome.runtime.lastError);
        } else {
          console.log('Recording state updated in background:', response);
        }
      }
    );
    
    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Make sure we have a valid tab
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];
        
        // Check if we can inject content scripts into this tab
        const url = activeTab.url || '';
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
          console.warn('Cannot inject content scripts into', url);
          return; // Exit early for chrome:// URLs
        }
        
        try {
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: newRecordingState ? 'startCapture' : 'stopCapture' },
            (response) => {
              if (chrome.runtime.lastError) {
                // Handle the error silently - content script might not be loaded
                console.log('Error sending message:', chrome.runtime.lastError.message);
              } else {
                console.log('Response from content script:', response);
              }
            }
          );
        } catch (error) {
          console.error('Failed to send message:', error);
        }
      }
    });
  };

  return (
    <div className="window">
      <div className="header">
        <img src="./icon.png" alt="FaceShot Logo" width={32} height={32} />
        <h1 className="title">FaceShot</h1>
      </div>
      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <button 
          className={`button ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
        >
          {isRecording ? (
            <>
              <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="14" height="14" rx="1" />
              </svg>
              <span>Stop</span>
            </>
          ) : (
            <>
              <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span>Capture</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}