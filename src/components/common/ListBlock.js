import React from 'react';

export default function ListBlock(props) {
  return <ul className="w3-ul w3-block">{props.children}</ul>;
}