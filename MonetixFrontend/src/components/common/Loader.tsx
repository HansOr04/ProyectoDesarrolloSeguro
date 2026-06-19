// src/components/common/Loader.tsx

import React from 'react';

interface LoaderProps {
  fullscreen?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ fullscreen = false }) => {
  if (fullscreen) {
    return (
      <div className="loader-fullscreen">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="loader-container">
      <div className="loader"></div>
    </div>
  );
};

export default Loader;