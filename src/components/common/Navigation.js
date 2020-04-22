import React from 'react';
import { Link } from 'react-router-dom';

export default function Navigation(props) {
  const { items, titles, paths, level } = props;
  let navColor = level ? `w3-theme-d${5 - level}` : 'w3-theme-d4';
  const navStyle = `w3-bar ${navColor}`;
  const linkStyle = 'w3-bar-item w3-button w3-hover-theme';
  return <nav className={navStyle}>
    {
      Object.entries(items).map(([key, val]) => 
        <Link key={val} className={linkStyle} to={paths[key]}>
          {titles[key]}
        </Link>
      )
    }
  </nav>;
}