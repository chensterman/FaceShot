import React from 'react';
import FaceGrid from './FaceGrid';

/**
 * Component to display all unique faces
 * @param {Object} props - Component props
 * @param {Array} props.uniqueFaces - Array of all unique faces
 * @param {Function} props.onClearFaces - Function to clear all faces
 */
const FaceDisplay = ({ uniqueFaces, onClearFaces }) => {
  // Highlight currently present faces
  const faceCount = uniqueFaces.length;
  
  return (
    <div>
      {/* Header with title and clear button */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '16px',
        marginBottom: '8px'
      }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold',
        }}>
          All Unique Faces ({faceCount})
        </div>
        
        <button 
          onClick={onClearFaces}
          style={{
            padding: '4px 8px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Clear All
        </button>
      </div>
      
      {/* Grid of faces */}
      <FaceGrid 
        faces={uniqueFaces} 
        compact={true}
        emptyMessage="No unique faces detected yet" 
      />
      
      {/* Hidden image element to load the current frame */}
      <img 
        id="preview-img"
        style={{ display: 'none' }} 
        alt="Hidden preview" 
      />
    </div>
  );
};

export default FaceDisplay;
