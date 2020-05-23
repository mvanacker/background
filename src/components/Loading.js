import React from 'react';
import { Loading256 } from './common/Icons';

// 80px menu, 2x16px margins, 2x16px padding
const defaultOffset = 112;

export default ({ offset }) => <div
  className="w3-content"
  style={{
    display: 'table',
    height: `calc(100vh - ${offset ? offset : defaultOffset}px)`,
  }}
>
  <div className="w3-cell w3-cell-middle">
    <Loading256/>
  </div>
</div>;