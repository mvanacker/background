import React from 'react';
import { Link } from 'react-router-dom';

export default ({ items, level = 1, className = '', style, ...props }) => (
  <nav
    className={`w3-card my-nav w3-bar my-round-bottom-left ${className}`}
    style={{
      top: `${39 * (level - 1)}px`,
      marginLeft: `${12 * level}px`,
      zIndex: 10 - level,
      ...style,
    }}
    {...props}
  >
    {items.map(({ title, path }) => (
      <Link
        key={path}
        to={path}
        className="w3-bar-item w3-button w3-hover-theme"
      >
        {title}
      </Link>
    ))}
  </nav>
);
