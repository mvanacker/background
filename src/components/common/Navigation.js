import React from 'react';
import { Link } from 'react-router-dom';

export default function Navigation(props) {
  const { items, titles, paths, level } = props;
  const navTheme = level ? `w3-theme-d${5 - level}` : 'w3-theme-d4';
  const navStyle = `my-nav w3-bar ${navTheme}`;
  const linkStyle = 'w3-bar-item w3-button w3-hover-theme';
  const offset = { top: `${38 * (level - 1)}px` };
  return <nav className={navStyle} style={offset}>
    {
      Object.entries(items).map(([key, val]) => 
        <Link key={val} className={linkStyle} to={paths[key]}>
          {titles[key]}
        </Link>
      )
    }
  </nav>;
}