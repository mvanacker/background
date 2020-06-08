import React from 'react';

import { min, max } from 'd3-array';
import { scaleLinear, scaleUtc } from 'd3-scale';
import { axisRight, axisBottom } from 'd3-axis';

import { Up, Down, Gold, Death, SplayUp, SplayDown } from '../common/Icons';
import Indicator from './Indicator';
import TitledChart from './TitledChart';
import { appendPathLine, appendForecastRect } from '../../util/svg';

export default ({ width, height }) => (
  <Indicator
    options={{
      limit: 40,
      columns: [
        'open',
        'high',
        'low',
        'close',
        'ema_21',
        'ema_55',
        'ema_89',
        'ema_200',
        'ema_377',
        'sma_10',
        'sma_200',
      ],
    }}
    chart={chart({ width, height })}
  />
);

const chart = ({ width, height }) => ({
  title,
  history: {
    open,
    high,
    low,
    close,
    ema_21,
    ema_55,
    ema_89,
    ema_200,
    ema_377,
    sma_10,
    sma_200,
  },
  forecast: {
    '0': {
      ema_21: ema_21_expected,
      ema_55: ema_55_expected,
      ema_89: ema_89_expected,
      ema_200: ema_200_expected,
      ema_377: ema_377_expected,
      sma_10: sma_10_expected,
      sma_200: sma_200_expected,
    },
  },
  margin = { top: 4, right: 40, bottom: 18, left: 15 },
}) => {
  return (
    <TitledChart
      width={width}
      height={height}
      title={() => {
        // Close crossed above or below the 21 ema
        let triangle = null;
        if (close[0].y > ema_21[0].y) {
          triangle = <Up title="Above 21 EMA" />;
        } else if (close[0].y < ema_21[0].y) {
          triangle = <Down title="Below 21 EMA" />;
        }

        // 55 ema crossed above or below the 200 ema
        let cross = null;
        if (ema_55[0].y > ema_200[0].y) {
          cross = <Gold title="Golden cross" />;
        } else if (ema_55[0].y < ema_200[0].y) {
          cross = <Death title="Death cross" />;
        }

        // Full splays
        let splay = null;
        if (
          ema_21[0].y > ema_55[0].y &&
          ema_55[0].y > ema_89[0].y &&
          ema_89[0].y > ema_200[0].y
        ) {
          splay = <SplayUp title="Full bullish splay" />;
        } else if (
          ema_21[0].y < ema_55[0].y &&
          ema_55[0].y < ema_89[0].y &&
          ema_89[0].y < ema_200[0].y
        ) {
          splay = <SplayDown title="Full bearish splay" />;
        }

        return (
          <>
            {title} {triangle} {cross} {splay}
          </>
        );
      }}
      draw={(svg) => {
        // X-axis breakpoints
        const first = ema_21[ema_21.length - 1].x;
        const middle = ema_21_expected[0].x; // not really middle
        const last = ema_21_expected[ema_21_expected.length - 1].x;

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
          .domain([min(low, (d) => d.y), max(high, (d) => d.y)])
          .range([height - margin.bottom, margin.top]);
        const [lowest, highest] = y.domain();

        svg
          .append('g')
          .attr('transform', `translate(${width - margin.right},0)`)
          .call(axisRight(y).ticks(5).tickSizeOuter(0));

        // Mark forecast
        appendForecastRect(svg)(x(middle), x(last), y(highest), y(lowest));

        // Clip path
        const clipPathId = `rect-clip-${title}`;
        svg
          .append('clipPath')
          .attr('id', clipPathId)
          .append('rect')
          .attr('x', x(first))
          .attr('y', y(highest))
          .attr('width', x(last) - x(first))
          .attr('height', y(lowest) - y(highest));

        // MAs
        const valid = (d) => d.y && d.y !== null;
        const appendMA = (data) =>
          appendPathLine(svg)(data.filter(valid), x, y).attr(
            'clip-path',
            `url(#${clipPathId})`
          );

        appendMA(sma_10).attr('stroke', 'red');
        appendMA(ema_21).attr('stroke', 'yellow');
        appendMA(ema_55).attr('stroke', 'green');
        appendMA(ema_89).attr('stroke', 'cyan');
        appendMA(ema_200).attr('stroke', 'navy');
        appendMA(sma_200).attr('stroke', 'white');

        appendMA(sma_10_expected).attr('stroke', 'red');
        appendMA(ema_21_expected).attr('stroke', 'yellow');
        appendMA(ema_55_expected).attr('stroke', 'green');
        appendMA(ema_89_expected).attr('stroke', 'cyan');
        appendMA(ema_200_expected).attr('stroke', 'navy');
        appendMA(sma_200_expected).attr('stroke', 'white');

        // Candles
        const candles = open.map((open, i) => ({
          x: open.x,
          open: open.y,
          high: high[i].y,
          low: low[i].y,
          close: close[i].y,
        }));

        // Candle width
        const candleWidth = (x(middle) - x(first)) / candles.length - 2;

        const candleColor = (d) => (d.close < d.open ? 'black' : 'white');
        // const candleColor = d => d.close < d.open ? 'red' : 'green';
        const wickColor = 'white';
        // const wickColor = candleColor;
        const g = svg
          .append('g')
          .selectAll('g')
          .data(candles)
          .join('g')
          .attr('transform', (d) => `translate(${x(d.x)},0)`)
          .attr('stroke', wickColor);

        g.append('line')
          .attr('y1', (d) => y(d.low))
          .attr('y2', (d) => y(d.high));

        // g.append('line')
        //   .attr('y1', d => y(d.open))
        //   .attr('y2', d => y(d.close))
        //   .attr('stroke-width', candleWidth);

        // Alternative using rectangles: more customizable
        g.append('rect')
          .attr('transform', `translate(-${candleWidth / 2},0)`)
          .attr('y', (d) => y(Math.max(d.open, d.close)))
          .attr('width', candleWidth)
          .attr('height', (d) => Math.abs(y(d.open) - y(d.close)))
          .attr('fill', candleColor);
      }}
    />
  );
};
