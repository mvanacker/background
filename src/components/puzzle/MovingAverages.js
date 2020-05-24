import React from 'react';

import CanvasJSReact from '../../canvasjs.react';

import { Up, Down, Gold, Death, SplayUp, SplayDown } from '../common/Icons';
import Panel from '../common/Panel';

import Loading from '../Loading';
import { useData, Overview } from './Indicator';
import ConfluenceDetector from './ConfluenceDetector';

export default function MovingAverages() {
  const options = {
    limit:       40,
    columns:     [
      'open', 'high', 'low', 'close',
      'ema_21', 'ema_55', 'ema_89', 'ema_200', 'ema_377',
      'sma_10', 'sma_200',
    ],
  };
  const data = useData(options);
  return !data.history ? <Loading/> : <>
    <Overview Chart={CandlestickChart} data={data}/>
    <Panel title="MA Confluence Detector">
      <div className="w3-center w3-padding-large"> 
        <ConfluenceDetector data={data}/>
      </div>
      <small>
        <h6>Note</h6>
        <p>This detector only considers the following</p>
        <ul>
          <li>timeframes: 2h, 4h, 12h, 1d, 2d, 1w, 1M;</li>
          <li>EMA periods: 21, 55, 89, 200, 377;</li>
          <li>SMA period: 200.</li>
        </ul>
      </small>
    </Panel>
  </>;
}

function CandlestickChart({ title, history, forecast }) {
  if (!history) { return null; }

  const {
    open, high, low, close,
    ema_21, ema_55, ema_89, ema_200, ema_377,
    sma_10, sma_200,
  } = history;

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

  const options = {
    animationEnabled: true,
    dataPointWidth:   3,
    theme:            "dark2",
    backgroundColor:  "transparent",
    height:           180,
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
    },
    axisY:            [{
      minimum:           lowest,
      maximum:           highest,
      valueFormatString: "#.#",
      gridColor:         "transparent",
      lineThickness:     0.5,
      crosshair:         {
        enabled:         true,
        labelMaxWidth:   40,
      },
    }],
    data:             [

    // Expected data
    {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_21,
      markerType:    "none",
      lineColor:     "yellow",
      lineThickness: 2,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_377,
      markerType:    "none",
      color:         "purple",
      lineThickness: 1,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_200,
      markerType:    "none",
      color:         "navy",
      lineThickness: 3,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].sma_200,
      markerType:    "none",
      color:         "white",
      lineThickness: 1,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_89,
      markerType:    "none",
      color:         "cyan",
      lineThickness: 1,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_55,
      markerType:    "none",
      color:         "green",
      lineThickness: 3,
    }, {
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    forecast[0].ema_21,
      markerType:    "none",
      color:         "yellow",
      lineThickness: 2,
    }, {
      type:          "line",
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
      color:         "cyan",
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

  return <div className="w3-cell my-fourth">
    {title} {
      crossed_up
        ? <Up title="Above 21 EMA"/>
        : crossed_down
          ? <Down title="Below 21 EMA"/>
          : ''
    } {
      golden_cross
        ? <Gold title="Golden cross"/>
        : death_cross
          ? <Death title="Death cross"/>
          : ''
    } {
      splay_bull
        ? <SplayUp title="Full bullish splay"/>
        : splay_bear
          ? <SplayDown title="Full bearish splay"/>
          : ''
    }
    <CanvasJSReact.CanvasJSChart options={options}/>
  </div>;
}