// src/components/common/Card.tsx

import React, { ReactNode } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: ReactNode;
  actions?: ReactNode;
}

interface CardBodyProps {
  children: ReactNode;
}

interface CardFooterProps {
  children: ReactNode;
}

export const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({ children, className = '', ...props }) => {
  return <div className={`card ${className}`} {...props}>{children}</div>;
};

const CardHeader: React.FC<CardHeaderProps> = ({ children, actions }) => {
  return (
    <div className="card__header">
      <h2 className="card__title">{children}</h2>
      {actions && <div>{actions}</div>}
    </div>
  );
};

const CardBody: React.FC<CardBodyProps> = ({ children }) => {
  return <div className="card__body">{children}</div>;
};

const CardFooter: React.FC<CardFooterProps> = ({ children }) => {
  return <div className="card__footer">{children}</div>;
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;