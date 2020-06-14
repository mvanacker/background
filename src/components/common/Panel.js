import React from 'react';

export default ({
  title = false,
  theme = 'w3-theme-d3',
  margin = 'w3-margin',
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={`w3-card ${
        margin ? margin : ''
      } w3-padding-large ${theme} my-round ${className ? className : ''}`}
      {...props}
    >
      {title && <PanelTitle>{title}</PanelTitle>}
      {children}
    </div>
  );
};

export const PanelTitle = ({ children, className = '', ...props }) => (
  <h4 className={`w3-center my-panel-title ${className}`} {...props}>
    {children}
  </h4>
);
