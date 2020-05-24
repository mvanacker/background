import React from 'react';
import { Link } from 'react-router-dom';

export default function Navigation(props) {
  const { items, level } = props;
  const navTheme = level ? `w3-theme-d${5 - level}` : 'w3-theme-d4';
  const navStyle = `w3-card my-nav w3-bar ${navTheme}`;
  const linkStyle = 'w3-bar-item w3-button w3-hover-theme';
  const offset = { top: `${40 * (level - 1)}px` };
  return <nav className={navStyle} style={offset}>
    {
      items.map(({ title, path }) => 
        <Link key={path} className={linkStyle} to={path}>{title}</Link>)
    }
  </nav>;
}