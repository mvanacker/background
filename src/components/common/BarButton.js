import React from 'react';

export default function BarButton(props) {
  return <button className="w3-bar-item w3-button w3-hover-theme" {...props}>
    {props.children}
  </button>;
}