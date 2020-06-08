import React, { useRef, useEffect } from 'react';
import { select } from 'd3-selection';

export default ({ width, height, title, draw }) => {
  // Reference the SVG-element
  const d3svg = useRef(null);

  // Draw after render
  useEffect(() => {
    // Grab the SVG-element, clear it and (re)draw
    const svg = select(d3svg.current);
    svg.selectAll('*').remove();
    draw(svg);
  }, [width, draw]);

  return (
    <>
      <h6>{title()}</h6>
      <svg ref={d3svg} role="img" width={width} height={height} />
    </>
  );
};
