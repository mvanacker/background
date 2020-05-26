import React from 'react';
import useChart from './useChart';

export default ({ width, height, title, draw }) =>
<div className="w3-cell w3-cell-middle my-fourth">
  {title()}
  {useChart({ width, height }, draw)}
</div>;