import React from 'react';
import { Loading256 } from './common/Icons';

// 80px menu, 2x16px margins, 2x16px padding
const defaultOffset = 112;

export default ({ offset }) => (
  <div
    style={{
      display: 'flex',
      height: `calc(100vh - ${offset ? offset : defaultOffset}px)`,
    }}
  >
    <div style={{ margin: 'auto' }}>
      <Loading256 />
    </div>
  </div>
);
