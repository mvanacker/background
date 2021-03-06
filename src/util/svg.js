import { line, area } from 'd3-shape';

export const appendLine = (svg) => (x1, x2, y1, y2) =>
  svg
    .append('line')
    .attr('x1', x1)
    .attr('x2', x2)
    .attr('y1', y1)
    .attr('y2', y2);

export const appendRect = (svg) => (x, y, w, h) =>
  svg
    .append('rect')
    .attr('x', x)
    .attr('y', y)
    .attr('width', w)
    .attr('height', h);

export const appendPathLine = (svg) => (data, x, y) =>
  svg
    .append('path')
    .attr('fill', 'none')
    .attr('stroke-width', 2)
    .attr(
      'd',
      line()
        .x((d) => x(d.x))
        .y((d) => y(d.y))(data)
    );

export const appendPathArea = (svg) => (data, x, y) =>
  svg.append('path').attr(
    'd',
    area()
      .x((d) => x(d.x))
      .y0((d) => y(d.y[0]))
      .y1((d) => y(d.y[1]))(data)
  );

export const appendForecastRect = (svg) => (x0, x1, y0, y1) => {
  // appendLine(svg)(x0, x0, y0, y1)
  //   .attr('stroke', 'white')
  //   .attr('stroke-dasharray', '10,3')
  //   .attr('opacity', 0.35);
  appendRect(svg)(x0, y0, x1 - x0, y1 - y0)
    .attr('fill', 'white')
    .attr('opacity', 0.04);
};
