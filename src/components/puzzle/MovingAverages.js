import React from 'react';

import CanvasJSReact from '../../canvasjs.react';
import { Up, Down, Gold, Death, SplayUp, SplayDown } from '../common/Icons';

import Indicator from './Indicator.js';

export default function MovingAverages(props) {
  return <Indicator
    title='MAs'
    columns={['open', 'high', 'low', 'close', 'ema_21', 'ema_55', 'ema_89',
      'ema_200', 'ema_377', 'sma_10', 'sma_200']}
    chart={OhlcChart}
    limit={150}
    windowLimit={60}
    forecast={true}
  />;
}

function OhlcChart(props) {
  const { open, high, low, close, ema_21, ema_55, ema_89, ema_200, ema_377,
    sma_10, sma_200, title, format, forecast } = props;
  if (!open) { return null; }

  // Resample candles (a bit of overhead, but clean)
  const ohlc = [];
  let lowest = Infinity, highest = -Infinity;
  for (let i = 0; i < open.length; i++) {
    ohlc.push({ x: open[i].x, y: [
      open[i].y, high[i].y, low[i].y, close[i].y
    ]});
    lowest = Math.min(low[i].y, lowest);
    highest = Math.max(high[i].y, highest);
  }

  // Close crossed above or below the 21 ema
  const crossed_up = close[0].y > ema_21[0].y;
  const crossed_down = close[0].y < ema_21[0].y;

  // 55 ema crossed above or below the 200 ema
  const golden_cross = ema_55[0].y > ema_200[0].y;
  const death_cross = ema_55[0].y < ema_200[0].y;

  // Full splays
  const splay_bull = ema_21[0].y > ema_55[0].y
                  && ema_55[0].y > ema_89[0].y
                  && ema_89[0].y > ema_200[0].y;
  const splay_bear = ema_21[0].y < ema_55[0].y
                  && ema_55[0].y < ema_89[0].y
                  && ema_89[0].y < ema_200[0].y;

  console.log(forecast);

  const options = {
    animationEnabled: true,
    dataPointWidth:   3,
    theme:            "dark2",
    backgroundColor:  "transparent",
    height:           180,
    // toolTip:          { enabled: false },
    axisX:            {
      lineThickness:     0.5,
      crosshair:         {
        enabled:         true,
        snapToDataPoint: true,
      },
      stripLines:        [{
        value:        forecast[0].close[0].x,
        color:        "white",
        opacity:      0.5,
        lineDashType: "dash",
      }, {
        startValue:   forecast[0].close[0].x,
        endValue:     forecast[0].close[forecast[0].close.length - 1].x,
        color:        "white",
        opacity:      0.07,
      }],
      // ...format,
    },
    axisY:            [{
      minimum:           lowest,
      maximum:           highest,
      valueFormatString: "#.#",
      gridColor:         "transparent",
      lineThickness:     0.5,
      crosshair:         {
        enabled:         true,
        // snapToDataPoint: true,
        labelMaxWidth:   40,
      },
    }],
    data:             [

    // Expected data
    {
      type:          "rangeArea",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_21,
      markerType:    "none",
      lineColor:     "yellow",
      lineThickness: 2,
    }, {
      type:          "rangeArea",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_377,
      markerType:    "none",
      color:         "purple",
      lineThickness: 1,
    }, {
      type:          "rangeArea",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_200,
      markerType:    "none",
      color:         "navy",
      lineThickness: 3,
    }, {
      type:          "rangeArea",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].sma_200,
      markerType:    "none",
      color:         "white",
      lineThickness: 1,
    }, {
      type:          "rangeArea",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_89,
      markerType:    "none",
      color:         "blue",
      lineThickness: 1,
    }, {
      type:          "rangeArea",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_55,
      markerType:    "none",
      color:         "green",
      lineThickness: 3,
    }, {
      type:          "rangeArea",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_21,
      markerType:    "none",
      color:         "yellow",
      lineThickness: 2,
    }, {
      type:          "rangeArea",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].sma_10,
      markerType:    "none",
      color:         "red",
      lineThickness: 1,
    }, 
    
    // Historical data
    {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    ema_377,
      markerType:    "none",
      color:         "purple",
      lineThickness: 1,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    ema_200,
      markerType:    "none",
      color:         "navy",
      lineThickness: 3,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    sma_200,
      markerType:    "none",
      color:         "white",
      lineThickness: 1,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    ema_89,
      markerType:    "none",
      color:         "blue",
      lineThickness: 1,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    ema_55,
      markerType:    "none",
      color:         "green",
      lineThickness: 3,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    ema_21,
      markerType:    "none",
      color:         "yellow",
      lineThickness: 2,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    sma_10,
      markerType:    "none",
      color:         "red",
      lineThickness: 1,
    }, {
      type:         "candlestick",
      xValueType:   "dateTime",
      dataPoints:   ohlc,
      markerType:   "none",
      risingColor:  "white",
      fallingColor: "black",
      color:        "white",
      lineThickness: 0,
    }]
  };

  return <div className="w3-cell my-fourth" style={{'padding': '0 4px'}}>
    {title} {
      crossed_up
        ? <Up title="Above 21 EMA"/>
        : crossed_down
          ? <Down title="Below 21 EMA"/>
          : ''
    }{' '}
    {
      golden_cross
        ? <Gold title="Golden cross"/>
        : death_cross
          ? <Death title="Death cross"/>
          : ''
    }{' '}
    {/* {splay_bull ? '🐂' : splay_bear ? '🧸' : ''} */}
    {
      splay_bull
        ? <SplayUp title="Full bullish splay"/>
        : splay_bear
          ? <SplayDown title="Full bearish splay"/>
          : ''
    }
    <CanvasJSReact.CanvasJSChart options={options}/>
  </div>;

  // Other unicode icons: 🐻 🐄 🐮
}