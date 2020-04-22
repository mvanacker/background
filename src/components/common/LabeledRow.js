import React from 'react';
import Row from './Row';

export default function LabeledRow(props) {
  const { label, verticalAlign, children } = props;
  const va = !verticalAlign ? 'w3-cell-middle' : verticalAlign;
  const hack = {};
  if (va === 'w3-cell-top') {
    hack.style = { 'paddingTop': '7px' };
  }
  return <Row>
    <div
      className={`w3-cell w3-container my-column w3-left-align ${va}`}
      {...hack}
    >
      {label}
    </div>
    <div className="w3-cell w3-cell-middle w3-left-align">{children}</div>
  </Row>;
}