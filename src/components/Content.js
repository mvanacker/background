import React, { useState, useEffect } from 'react';
import { useSession } from '../hooks/useStorage';
import { DoubleLeft, DoubleRight } from './common/Icons';

const LAPTOP_WIDTH = 1366 * 0.9;
const LEFT_WIDTH = 500;
const SCROLLBAR_WIDTH = 15;
const LEFT_WIDTH_PX = `${LEFT_WIDTH}px`;

export default ({ left, right }) => {
  const [visible, setVisible] = useSession('sidebar-visible', {
    initialValue: true,
  });

  // Disable left sidebar on smaller screens
  const isWindowLarge = () => window.innerWidth >= LAPTOP_WIDTH;
  const [enabled, setEnabled] = useState(isWindowLarge());
  const rightWidth = () =>
    window.innerWidth - SCROLLBAR_WIDTH - (enabled && visible ? LEFT_WIDTH : 0);
  const [width, setWidth] = useState(rightWidth());
  useEffect(() => {
    const callback = () => {
      setEnabled(isWindowLarge());
      setWidth(rightWidth());
    };
    window.addEventListener('resize', callback);
    return () => window.removeEventListener('resize', callback);
  });

  useEffect(() => {
    setWidth(rightWidth());
  }, [visible, enabled]);

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
            style={{ minWidth: LEFT_WIDTH_PX, width: LEFT_WIDTH_PX }}
          >
            {left}
          </div>
        )}
        <div className="w3-cell">{right({ width })}</div>
      </div>
    </>
  );
}; //
