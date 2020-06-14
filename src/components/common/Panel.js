import React from 'react';

export default ({ title = false, className = '', children, ...props }) => (
  <div
    className={`w3-card w3-margin w3-padding-large w3-theme-d3 my-round ${className}`}
    {...props}
  >
    {title && <PanelTitle>{title}</PanelTitle>}
    {children}
  </div>
);

export const PanelTitle = ({ children, className = '', ...props }) => (
  <h4 className={`w3-center my-panel-title ${className}`} {...props}>
    {children}
  </h4>
);
