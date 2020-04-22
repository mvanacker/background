import React from 'react';

export default function BarButtonRight(props) {
  const _class = 'w3-bar-item w3-button w3-hover-theme w3-right';
  return <button className={_class} {...props}>{props.children}</button>;
}