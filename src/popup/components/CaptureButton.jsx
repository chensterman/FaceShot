import React from 'react';

const CaptureButton = ({ onClick, isProcessing }) => {
  return (
    <button 
      className={`button ${isProcessing ? 'recording' : ''}`}
      onClick={onClick}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <>
          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <span>Processing...</span>
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
