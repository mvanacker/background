import React from 'react';
import { Loading256 } from './common/Icons';

// 80px menu, 2x16px margins, 2x16px padding
const defaultOffset = 112;

export default ({ offset }) => (
  <div
    className="my-display-flex"
    style={{
      height: `calc(100vh - ${offset ? offset : defaultOffset}px)`,
    }}
  >
    <div className="my-margin-auto">
      <Loading256 />
    </div>
  </div>
);
