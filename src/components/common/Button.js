import React from 'react';

export default function Button(props) {
  const _class = 'w3-btn w3-theme w3-margin';
  return <button className={_class} {...props}>{props.children}</button>;
}