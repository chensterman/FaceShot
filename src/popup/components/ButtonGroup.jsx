import React from 'react';
import './buttonGroup.css';

const ButtonGroup = ({ 
  hasScreenshot, 
  isProcessing, 
  isResearching,
  onCaptureClick,
  onRetakeClick,
  onResearchClick
}) => {
  // If we're processing or researching, show the appropriate loading state
  if (isProcessing) {
    return (
      <div className="button-group">
        <button 
          className="button processing"
          disabled={true}
        >
          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <span>Processing...</span>
        </button>
      </div>
    );
  }
  
  if (isResearching) {
    return (
      <div className="button-group">
        <button 
          className="button retake"
          onClick={onRetakeClick}
          disabled={false}
        >
          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <span>Retake</span>
        </button>
        <button 
          className="button researching"
          disabled={true}
        >
          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <span>Researching...</span>
        </button>
      </div>
    );
  }
  
  // If we have a screenshot, show the Retake and Research buttons
  if (hasScreenshot) {
    return (
      <div className="button-group">
        <button 
          className="button retake"
          onClick={onRetakeClick}
          disabled={false}
        >
          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <span>Retake</span>
        </button>
        <button 
          className="button research"
          onClick={onResearchClick}
          disabled={false}
        >
          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <span>Research</span>
        </button>
      </div>
    );
  }
  
  // Default state: just the Capture button
  return (
    <div className="button-group">
      <button 
        className="button capture"
        onClick={onCaptureClick}
        disabled={false}
      >
        <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
        <span>Capture</span>
      </button>
    </div>
  );
};

export default ButtonGroup;
