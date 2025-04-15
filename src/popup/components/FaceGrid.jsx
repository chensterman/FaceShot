import React from 'react';
import FaceCard from './FaceCard';

/**
 * Component to display a grid of face cards
 * @param {Object} props - Component props
 * @param {Array} props.faces - Array of face objects to display
 * @param {boolean} props.compact - Whether to use compact layout
 * @param {string} props.emptyMessage - Message to show when no faces are present
 */
const FaceGrid = ({ faces, compact = false, emptyMessage = 'No faces detected' }) => {
  if (!faces || faces.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        color: '#666'
      }}>
        {emptyMessage}
      </div>
    );
  }
  
  // Sort faces to show present faces first, then by faceId
  const sortedFaces = [...faces].sort((a, b) => {
    // First sort by presence
    if (a.isPresent && !b.isPresent) return -1;
    if (!a.isPresent && b.isPresent) return 1;
    // Then sort by ID
    return a.faceId - b.faceId;
  });
  
  return (
    <div className="faces-container" style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '10px', 
      justifyContent: 'center',
      marginTop: '8px'
    }}>
      {sortedFaces.map((face, index) => (
        <FaceCard 
          key={index} 
          face={face} 
          compact={compact} 
        />
      ))}
    </div>
  );
};

export default FaceGrid;
