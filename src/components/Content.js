import React, { useState, useEffect, useCallback } from 'react';
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
  const rightWidth = useCallback(
    () =>
      window.innerWidth -
      SCROLLBAR_WIDTH -
      (enabled && visible ? LEFT_WIDTH : 0),
    [enabled, visible]
  );
  const [width, setWidth] = useState(rightWidth());
  useEffect(() => {
    const callback = () => {
      setEnabled(isWindowLarge());
      setWidth(rightWidth());
    };
    window.addEventListener('resize', callback);
    return () => window.removeEventListener('resize', callback);
  }, [rightWidth]);

  useEffect(() => {
    setWidth(rightWidth());
  }, [visible, enabled, rightWidth]);

  return (
    <>
      {enabled && (
        <div
          className="w3-theme-l1 my-left-toggle my-white-glow my-round-right"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <DoubleLeft title="Hide" /> : <DoubleRight title="Show" />}
        </div>
      )}
      <div className="my-content">
        {enabled && visible && (
          <div style={{ minWidth: LEFT_WIDTH_PX, width: LEFT_WIDTH_PX }}>
            {left}
          </div>
        )}
        <div className="my-right">{right({ width })}</div>
      </div>
    </>
  );
};
