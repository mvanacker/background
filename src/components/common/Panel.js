import React from 'react';

export default ({
  title = false,
  theme = 'w3-theme-d3',
  padding = '',
  margin = 'w3-margin',
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={`
      w3-card
      ${margin ? margin : ''}
      w3-padding-large
      ${theme}
      my-round
      ${className ? className : ''}`}
      {...props}
    >
      {title && <h4 className="w3-center my-panel-title">{title}</h4>}
      <div className={padding ? padding : ''}>{children}</div>
    </div>
  );
};
