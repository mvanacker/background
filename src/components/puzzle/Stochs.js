import React from 'react';

import { scaleLinear, scaleUtc } from 'd3-scale';
import { axisRight, axisBottom } from 'd3-axis';

import { Up, Down } from '../common/Icons';
import Indicator from './Indicator';
import TitledChart from './TitledChart';
import {
  appendLine,
  appendRect,
  appendPathArea,
  appendPathLine,
} from '../../util/svg';

export default () => <Indicator
  options={{
    limit:   40,
    columns: ['stoch_K', 'stoch_K_D'],
  }}
  chart={({
    title,
    history: {
      stoch_K: K,
      stoch_K_D: D,
    },
    forecast: {
      '0': {
        stoch_K: K_expected,
        stoch_K_D: D_expected,
      },
      '1': {
        stoch_K: K_sigma_1
      },
    },
    width,
    height,
    margin = { top: 4, right: 26, bottom: 18, left: 15 },
  }) => <TitledChart
    width={width}
    height={height}
    title={() => {
      let icon = null;
      if (K[0].y > D[0].y) {
        icon = <Up title="Crossed up"/>;
      } else if (K[0].y < D[0].y) {
        icon = <Down title="Crossed down"/>;
      }
      return <>{title} {icon}</>;
    }}
    draw={svg => {
    
      // X-axis breakpoints
      const first = K[K.length - 1].x;
      const middle = K_expected[0].x // not really middle
      const last = K_expected[K_expected.length - 1].x
  
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
  
      // Control zones
      appendRect(svg)(x(first), y(80), x(last) - x(first), y(65) - y(80))
        .attr('fill', 'lime')
        .attr('opacity', .11);
      appendRect(svg)(x(first), y(45), x(last) - x(first), y(30) - y(45))
        .attr('fill', 'red')
        .attr('opacity', .15);
  
      // Show K at first standard deviation
      appendPathArea(svg)(K_sigma_1, x, y)
        .attr('fill', 'white');
  
      // Mark forecast
      appendLine(svg)(x(middle), x(middle), y(100), y(0))
        .attr('stroke', 'white')
        .attr('stroke-dasharray', '10,3')
        .attr('opacity', .35);
      appendRect(svg)(x(middle), y(100), x(last) - x(middle), y(0) - y(100))
        .attr('fill', 'white')
        .attr('opacity', .04);
  
      // Lines
      const valid = d => d.y && d.y !== null;
      appendPathLine(svg)(D.filter(valid), x, y)
        .attr('stroke', 'white');
      appendPathLine(svg)(K.filter(valid), x, y)
        .attr('stroke', 'yellow');
      appendPathLine(svg)(D_expected.filter(valid), x, y)
        .attr('stroke', 'white');
      appendPathLine(svg)(K_expected, x, y)
        .attr('stroke', 'yellow');
    }}
  />}
/>;