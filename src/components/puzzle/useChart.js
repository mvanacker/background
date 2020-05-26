import React, { useRef, useEffect } from 'react';

import { select } from 'd3-selection';

import { Loading64 } from '../common/Icons';

export default function useChart({ width, height }, draw) {
  
  // Reference the SVG-element
  const d3svg = useRef(null);

  // Draw after render
  useEffect(() => {
    if (isNaN(width)) { return; }

    // Grab the SVG-element, clear it and (re)draw
    const svg = select(d3svg.current);
    svg.selectAll('*').remove();
    draw(svg);
  }, [width, draw]);

  return isNaN(width)
    ? <div style={{
        height,
        width: isNaN(width) ? 0 : width,
        display: 'table-cell',
        verticalAlign: 'middle',
      }}>
        <Loading64/>
      </div>
    : <svg
      ref={d3svg}
      role="img"
      width={width}
      height={height}
    />;
}