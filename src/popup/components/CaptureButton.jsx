import React from 'react';

/**
 * Capture/Stop button component
 * @param {Object} props - Component props
 * @param {boolean} props.isRecording - Whether recording is active
 * @param {Function} props.onClick - Click handler function
 * @param {boolean} props.disabled - Whether button is disabled
 */
const CaptureButton = ({ isRecording, onClick, disabled = false }) => {
  return (
    <button 
      className={`button ${isRecording ? 'recording' : ''}`}
      onClick={onClick}
      disabled={disabled}
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
  );
};

export default CaptureButton;
