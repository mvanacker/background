import React, { useState } from 'react';
import { DoubleLeft, DoubleRight } from './common/Icons';

export default ({ left, right}) => {
  const [visible, setVisible] = useState(true);
  const leftWidth = '500px';
  return <>
    <div
      className="w3-card w3-theme-l1 toggle-handle my-round-right"
      onClick={() => setVisible(!visible)}
    >
      {visible ? <DoubleLeft title="Hide"/> : <DoubleRight title="Show"/>}
    </div>
    <div className="w3-cell-row">
      {
        !visible ? '' : <div style={{
          minWidth: leftWidth,
          width:    leftWidth,
          display:  'table-cell',
        }}>
          {left}
        </div>
      }
      <div className="w3-cell">
        {right}
      </div>
    </div>
  </>;
};