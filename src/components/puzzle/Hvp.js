import React from 'react';

import { scaleLinear, scaleUtc } from 'd3-scale';
import { axisRight, axisBottom } from 'd3-axis';

import { Alert, Alarm } from '../common/Icons';
import Indicator from './Indicator.js';
import TitledChart from './TitledChart';
import { appendPathLine, appendForecastRect } from '../../util/svg';

export default ({ width, height }) => (
  <Indicator
    options={{
      limit: 45,
      columns: ['hvp', 'hvp_ma'],
    }}
    chart={chart({ width, height })}
  />
);

const chart = ({ width, height }) => ({
  title,
  history: { hvp, hvp_ma },
  forecast: {
    '0': { hvp: hvp_expected, hvp_ma: hvp_ma_expected },
  },
  margin = { top: 4, right: 26, bottom: 18, left: 15 },
}) => (
  <TitledChart
    width={width}
    height={height}
    title={() => {
      const enough_data = hvp[hvp.length - 1].y !== null;
      let icon = null;
      if (enough_data && hvp[0].y < 10) {
        icon = <Alarm title="Below 10" />;
      } else if (enough_data && hvp[0].y < 20) {
        icon = <Alert title="Below 20" />;
      }
      return (
        <>
          {title} {icon}
        </>
      );
    }}
    draw={(svg) => {
      // X-axis breakpoints
      const first = hvp[hvp.length - 1].x;
      const middle = hvp_expected[0].x; // not really middle
      const last = hvp_expected[hvp_expected.length - 1].x;

      // X-axis
      const x = scaleUtc()
        .domain([first, last])
        .range([margin.left, width - margin.right]);

      svg
        .append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(axisBottom(x).ticks(5).tickSizeOuter(0));

      // Y-axis
      const y = scaleLinear()
        .domain([0, 100])
        .range([height - margin.bottom, margin.top]);

      svg
        .append('g')
        .attr('transform', `translate(${width - margin.right},0)`)
        .call(
          axisRight(y)
            .ticks(6)
            // .tickValues([0, 20, 40, 60, 80, 100])
            .tickSizeOuter(0)
        );

      // Bar width
      const xWidth = x(last) - x(first);
      const hvpLength = hvp.length + hvp_expected.length;
      const barWidth = Math.floor(xWidth / hvpLength);

      // Mark forecast
      appendForecastRect(svg)(x(middle) - barWidth / 2, x(last), y(100), y(0));

      // Bars
      const color = (y) =>
        y > 90 ? 'maroon' : y > 80 ? 'orange' : 'lightblue';
      const drawBars = (selector, data) =>
        svg
          .selectAll(selector)
          .data(data)
          .join('rect')
          .attr('fill', (d) => color(d.y))
          .attr('x', (d) => x(d.x) - barWidth)
          .attr('y', (d) => y(d.y))
          .attr('width', barWidth)
          .attr('height', (d) => height - y(d.y) - margin.bottom);

      const valid = (d) => d.y && d.y !== null;
      drawBars('rect.expected', hvp_expected.filter(valid)).attr(
        'fill',
        'lightgreen'
      );
      drawBars('rect.historical', hvp.slice(0, -1).filter(valid));

      // Lines
      appendPathLine(svg)(hvp_ma.filter(valid), x, y).attr('stroke', 'white');
      appendPathLine(svg)(hvp_ma_expected.filter(valid), x, y).attr(
        'stroke',
        'white'
      );
    }}
  />
);
