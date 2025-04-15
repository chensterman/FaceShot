import React from 'react';

/**
 * Component to display a single face card
 * @param {Object} props - Component props
 * @param {Object} props.face - Face data object
 * @param {boolean} props.compact - Whether to use compact layout
 */
const FaceCard = ({ face, compact = false }) => {
  const confidence = face.probability ? Math.round(face.probability * 100) : null;
  const isPresent = face.isPresent === true;
  const isNew = face.seenCount <= 3;
  
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: compact ? '100px' : '120px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: `0 2px 8px ${isPresent ? 'rgba(76, 175, 80, 0.3)' : 'rgba(0, 0, 0, 0.15)'}`,
        backgroundColor: '#ffffff',
        border: isPresent ? '2px solid #4caf50' : 'none',
        opacity: isPresent ? 1 : 0.6, // Dim faces that aren't present
      }}
    >
      <img 
        src={face.imageUrl} 
        alt={`Face ${face.faceId}`}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />
      <div style={{
        padding: '4px 8px',
        backgroundColor: isNew ? '#e8f5e9' : '#f8f9fa',
        width: '100%',
        textAlign: 'center',
        fontSize: compact ? '11px' : '12px',
        color: '#333',
      }}>
        <div>Face {face.faceId} {confidence !== null && `(${confidence}%)`}</div>
        
        {/* Show additional info based on face properties */}
        {isNew && (
          <div style={{ fontSize: '10px', color: '#4caf50', fontWeight: 'bold' }}>
            New Face!
          </div>
        )}
        
        <div style={{ fontSize: '9px', color: '#666' }}>
          Seen {face.seenCount || 1} times
          {isPresent && (
            <span style={{ color: '#4caf50', marginLeft: '4px', fontWeight: 'bold' }}>• Present</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceCard;
