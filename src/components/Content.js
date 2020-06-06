import React, { useState, useEffect } from 'react';
import { useSession } from '../hooks/useStorage';
import { DoubleLeft, DoubleRight } from './common/Icons';

const LAPTOP_WIDTH = 1366 * 0.9;
const LEFT_WIDTH = '500px';

export default ({ left, right }) => {
  const [visible, setVisible] = useSession('sidebar-visible', {
    initialValue: true,
  });
  
  // Disable left sidebar on smaller screens
  const isWindowLarge = () => window.innerWidth >= LAPTOP_WIDTH;
  const [enabled, setEnabled] = useState(isWindowLarge());
  useEffect(() => {
    const callback = () => setEnabled(isWindowLarge());
    window.addEventListener('resize', callback);
    return () => window.removeEventListener('resize', callback);
  });

  return (
    <>
      {enabled && (
        <div
          className="w3-card w3-theme-l1 toggle-handle my-round-right"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <DoubleLeft title="Hide" /> : <DoubleRight title="Show" />}
        </div>
      )}
      <div className="w3-cell-row">
        {enabled && visible && (
          <div
            className="w3-cell"
            style={{
              minWidth: LEFT_WIDTH,
              width: LEFT_WIDTH,
            }}
          >
            {left}
          </div>
        )}
        <div className="w3-cell">{right}</div>
      </div>
    </>
  );
};
