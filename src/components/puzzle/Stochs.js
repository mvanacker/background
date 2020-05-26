import React, { useRef, useEffect } from 'react';

import { select } from 'd3-selection';
import { scaleLinear, scaleUtc } from 'd3-scale';
import { axisRight, axisBottom } from 'd3-axis';
import { line, area } from 'd3-shape';

import { Up, Down, Loading64 } from '../common/Icons';
import Indicator from './Indicator.js';

export default function Stochs() {
  const options = {
    limit:   40,
    columns: ['stoch_K', 'stoch_K_D'],
  };
  return <Indicator Chart={StochChart} options={options}/>;
}

const Title = ({ title, up, down }) => {
  let icon = null;
  if (up) {
    icon = <Up title="Crossed up"/>;
  } else if (down) {
    icon = <Down title="Crossed down"/>;
  }
  return <>{title} {icon}</>;
};

const StochChart = ({
  title,
  history: { stoch_K, stoch_K_D },
  forecast,
  width,
  height = 175,
  margin = { top: 4, right: 26, bottom: 18, left: 14 },
}) => {
  const d3svg = useRef(null);

  // Draw chart using D3
  useEffect(() => {
    if (isNaN(width)) { return; }

    // Rename
    const expected = forecast[0];

    // Prepare for drawing
    const svg = select(d3svg.current);
    svg.selectAll('*').remove();
    
    // X-axis breakpoints
    const first = stoch_K[stoch_K.length - 1].x;
    const middle = expected.stoch_K[0].x // not really middle
    const last = expected.stoch_K[expected.stoch_K.length - 1].x

    // X-axis
    const x = scaleUtc()
      .domain([first, last])
      .range([margin.left, width - margin.right]);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(axisBottom(x)
        .ticks(5)
        .tickSizeOuter(0));

    // Y-axis
    const y = scaleLinear()
      .domain([0, 100])
      .range([height - margin.bottom, margin.top]);

    svg.append('g')
      .attr('transform', `translate(${width - margin.right},0)`)
      .call(axisRight(y)
        .tickValues([0, 30, 45, 55, 65, 80, 100])
        .tickSizeOuter(0));

    // Line
    const appendLine = (x1, x2, y1, y2) => svg.append('line')
      .attr('x1', x1)
      .attr('x2', x2)
      .attr('y1', y1)
      .attr('y2', y2);

    // Rect
    const appendRect = (x, y, w, h) => svg.append('rect')
      .attr('x', x)
      .attr('y', y)
      .attr('width', w)
      .attr('height', h);

    // Line
    const appendPathLine = data => svg.append('path')
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('d', line()
        .x(d => x(d.x))
        .y(d => y(d.y))(data));

    // Area
    const appendPathArea = (data, fill) => svg.append('path')
      .attr('fill', fill)
      .attr('opacity', .12)
      .attr('d', area()
        .x(d => x(d.x))
        .y0(d => y(d.y[0]))
        .y1(d => y(d.y[1]))(data));

    // Control zones
    appendRect(x(first), y(80), x(last) - x(first), y(65) - y(80))
      .attr('fill', 'lime')
      .attr('opacity', .11);
    appendRect(x(first), y(45), x(last) - x(first), y(30) - y(45))
      .attr('fill', 'red')
      .attr('opacity', .15);

    // Show error level 1
    appendPathArea(forecast[1].stoch_K, 'white');

    // Mark forecast
    appendLine(x(middle), x(middle), y(100), y(0))
      .attr('stroke', 'white')
      .attr('stroke-dasharray', '10,3')
      .attr('opacity', .3);
    appendRect(x(middle), y(100), x(last) - x(middle), y(0) - y(100))
      .attr('fill', 'white')
      .attr('opacity', .025);

    // Lines
    const valid = d => d.y && d.y !== null;
    appendPathLine(stoch_K_D.filter(valid))
      .attr('stroke', 'white');
    appendPathLine(stoch_K.filter(valid))
      .attr('stroke', 'yellow');
    appendPathLine(expected.stoch_K_D.filter(valid))
      .attr('stroke', 'white');
    appendPathLine(expected.stoch_K)
      .attr('stroke', 'yellow');

  }, [stoch_K, stoch_K_D, forecast, width, height, margin]);
  
  return <div className="w3-cell w3-cell-middle my-fourth">
    <Title
      title={title}
      up={stoch_K[0].y > stoch_K_D[0].y}
      down={stoch_K[0].y < stoch_K_D[0].y}
    />
    {
      isNaN(width)
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
        />
    }
  </div>;
};