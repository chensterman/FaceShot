import React from 'react';
import './RegionSelector.css';

/**
 * Component for selecting which region of the screen to capture
 * @param {Object} props - Component props
 * @param {string} props.selectedRegion - Currently selected region
 * @param {Function} props.onRegionChange - Callback when region changes
 */
const RegionSelector = ({ selectedRegion, onRegionChange }) => {
  // Available region options
  const regions = [
    { id: 'full', name: 'Full Screen', description: 'Capture the entire screen' },
    { id: 'leftHalf', name: 'Left Half', description: 'Capture only the left half of the screen' },
    { id: 'topLeftCorner', name: 'Top Left Corner', description: 'Capture only the top left corner' }
  ];

  return (
    <div className="region-selector">
      <h3>Screenshot Region</h3>
      <div className="region-options">
        {regions.map(region => (
          <div 
            key={region.id}
            className={`region-option ${selectedRegion === region.id ? 'selected' : ''}`}
            onClick={() => onRegionChange(region.id)}
          >
            <div className="region-preview">
              <div className={`preview-box ${region.id}`}></div>
            </div>
            <div className="region-info">
              <div className="region-name">{region.name}</div>
              <div className="region-description">{region.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RegionSelector;
