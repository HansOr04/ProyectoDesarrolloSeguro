// src/components/layout/MainLayout.tsx

import React, { ReactNode } from 'react';
import Header from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <>
      <Header />
      <main className="main-content">
        <div className="main-content__container">
          {children}
        </div>
      </main>
    </>
  );
};

export default MainLayout;