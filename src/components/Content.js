import React, { useState } from 'react';
import ReactResizeDetector from 'react-resize-detector'
import { DoubleLeft, DoubleRight } from './common/Icons';

const LAPTOP_WIDTH = 1366 * 0.9;
const LEFT_WIDTH   = '500px';

export default ({ left, right}) => {
  const [visible, setVisible] = useState(true);
  const [enabled, setEnabled] = useState(window.innerWidth >= LAPTOP_WIDTH);
  return <ReactResizeDetector handleWidth>
    {
      ({ width }) => {
        setEnabled(width >= LAPTOP_WIDTH);

        return <>
          <div
            className="w3-card w3-theme-l1 toggle-handle my-round-right"
            onClick={() => setVisible(!visible)}
          >
            {
              enabled && visible
                ? <DoubleLeft title="Hide"/>
                : <DoubleRight title="Show"/>
            }
          </div>
          <div className="w3-cell-row">
            {
              enabled && visible && <div
                className="w3-cell"
                style={{
                  minWidth: LEFT_WIDTH,
                  width:    LEFT_WIDTH,
                }}
              >
                {left}
              </div>
            }
            <div className="w3-cell">
              {right}
            </div>
          </div>
        </>
      }
    }
  </ReactResizeDetector>;
};