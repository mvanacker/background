import React from 'react';

export default function Panel(props) {
  const { theme, title, children, padding, margin } = props;
  const _theme = !theme ? 'w3-theme-d3' : theme;
  const _padding = padding ? 'w3-padding-16' : '';
  const _margin = margin === undefined || margin === true ? 'w3-margin' : '';
  return <div
    className={`w3-card ${_margin} w3-padding-large ${_theme} my-round`}
  >
    {
      title === false ? ''
        : <h4 className="w3-center my-panel-title">{title}</h4>
    }
    <div className={_padding}>{children}</div>
  </div>;
}