import React from 'react';

/**
 * Header component with logo and title
 */
const Header = () => {
  return (
    <div className="header">
      <img src="./icon.png" alt="FaceShot Logo" width={32} height={32} />
      <h1 className="title">FaceShot</h1>
    </div>
  );
};

export default Header;
