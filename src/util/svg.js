import { line, area } from 'd3-shape';

export const appendLine = svg => (x1, x2, y1, y2) => svg.append('line')
  .attr('x1', x1)
  .attr('x2', x2)
  .attr('y1', y1)
  .attr('y2', y2);

export const appendRect = svg => (x, y, w, h) => svg.append('rect')
  .attr('x', x)
  .attr('y', y)
  .attr('width', w)
  .attr('height', h);

export const appendPathLine = svg => (data, x, y) => svg.append('path')
  .attr('fill', 'none')
  .attr('stroke-width', 2)
  .attr('d', line()
    .x(d => x(d.x))
    .y(d => y(d.y))(data));

export const appendPathArea = svg => (data, x, y) => svg.append('path')
  .attr('opacity', .12)
  .attr('d', area()
    .x(d => x(d.x))
    .y0(d => y(d.y[0]))
    .y1(d => y(d.y[1]))(data));