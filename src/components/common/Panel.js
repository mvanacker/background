import React from 'react';

export default function Panel(props) {
  let { theme, title, children, padding } = props;
  theme = !theme ? 'w3-theme-d3' : theme;
  padding = padding ? 'w3-padding-16' : '';
  return <div className={`w3-margin w3-container w3-padding-16 ${theme}`}>
    <h4 className="w3-center">{title}</h4>
    <div className={padding}>{children}</div>
  </div>;
}