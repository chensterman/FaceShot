import React from 'react';
import './buttonGroup.css';

const ButtonGroup = ({ 
  hasScreenshot, 
  isProcessing, 
  isResearching,
  isFaceCollectionFull,
  faceCount,
  onCaptureClick,
  onRetakeClick,
  onAddMoreClick,
  onResearchClick
}) => {
  // Define button icons
  const icons = {
    camera: (
      <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
    ),
    loading: (
      <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
    ),
    research: (
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
    ),
    addMore: (
      <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    )
  };

  // Helper function to render a button
  const renderButton = (type, label, onClick, isDisabled = false, customClass = null) => {
    const className = customClass || type;
    return (
      <button 
        className={`button ${className}`}
        onClick={onClick}
        disabled={isDisabled}
      >
        {type === 'processing' || type === 'researching' ? icons.loading : 
         type === 'research' ? icons.research : 
         type === 'addMore' ? icons.addMore : icons.camera}
        <span>{label}</span>
      </button>
    );
  };

  // Determine which buttons to show based on state
  const getButtons = () => {
    if (isProcessing) {
      return {
        topRow: [renderButton('processing', 'Processing...', null, true)],
        bottomRow: []
      };
    }
    
    if (isResearching) {
      return {
        topRow: [renderButton('retake', 'Start Over', onRetakeClick)],
        bottomRow: [renderButton('researching', 'Researching...', null, true)]
      };
    }
    
    if (hasScreenshot) {
      const topRow = [];
      const bottomRow = [];
      
      // Top row: Start Over and Add More Faces buttons
      topRow.push(renderButton('retake', 'Start Over', onRetakeClick));
      
      // Show Add More button if we haven't reached the maximum
      if (!isFaceCollectionFull) {
        topRow.push(renderButton('addMore', 'Add More Faces', onAddMoreClick, false, 'add-more'));
      }
      
      // Bottom row: Research button
      bottomRow.push(renderButton('research', `Research ${faceCount} Faces`, onResearchClick));
      
      return {
        topRow,
        bottomRow
      };
    }
    
    // Default: just the capture button
    return {
      topRow: [renderButton('capture', 'Capture', onCaptureClick)],
      bottomRow: []
    };
  };

  const buttons = getButtons();
  
  return (
    <div className="button-group-container">
      <div className="button-group">
        {buttons.topRow}
      </div>
      {buttons.bottomRow.length > 0 && (
        <div className="button-group">
          {buttons.bottomRow}
        </div>
      )}
    </div>
  );
};

export default ButtonGroup;
