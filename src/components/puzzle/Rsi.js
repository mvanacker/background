import React from 'react';

import CanvasJSReact from '../../canvasjs.react';
import { Up, Down } from '../common/Icons';
import Indicator from './Indicator.js';

const FORECAST = true; // transitionary constant

export default function Rsi(props) {
  return <Indicator
    title='RSI'
    columns={['rsi']}
    chart={RsiChart}
    limit={14}
    forecast={FORECAST}
  />;
}

function RsiChart(props) {
  const { rsi, title, format, forecast } = props;
  // const rsi_ema = props['rsi-ema'];
  if (!rsi) { return null; }
  
  // const crossed_up = rsi[0].y > rsi_ema[0].y;

  const options = {
    animationEnabled: true,
    theme:            "dark2",
    backgroundColor:  "transparent",
    height:           180,
    toolTip:          {
      enabled: false,
    },
    axisX:            {
      lineThickness:     0.5,
      crosshair:         {
        enabled:         true,
        snapToDataPoint: true,
        color:           "white",
      },
      ...format,
    },
    axisY:            [{
      includeZero:       true,
      valueFormatString: "#.#",
      gridColor:         "transparent",
      maximum:           100,
      minimum:           0,
      interval:          20,
      crosshair:         {
        enabled:         true,
        // snapToDataPoint: true,
        labelMaxWidth:   40,
        color:           "white",
      },
      stripLines:        [{
        startValue: 30,
        endValue:   45,
        color:      'red',
        opacity:    .11,
      }, {
        startValue: 65,
        endValue:   80,
        color:      'lime',
        opacity:    .08,
      }],
    }],
    data:             [{
      //   lineColor:     "white",
      //   type:          "line",
      //   xValueType:    "dateTime",
      //   dataPoints:    rsi_ema,
      //   markerType:    "none",
      //   lineThickness: 1.3,
      // }, {
      lineColor:         "orange",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[3].rsi,
      markerType:        "none",
      lineThickness:     0,
      fillOpacity:       0.16,
    }, {
      lineColor:         "orange",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[2].rsi,
      markerType:        "none",
      lineThickness:     0,
      fillOpacity:       0.16,
    }, {
      lineColor:         "orange",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[1].rsi,
      markerType:        "none",
      lineThickness:     0,
      fillOpacity:       0.16,
    }, {
      lineColor:         "orange",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[0].rsi,
      markerType:        "none",
      lineThickness:     1.8,
    }, {
      lineColor:         "orange",
      type:              "line",
      xValueType:        "dateTime",
      dataPoints:        rsi,
      markerType:        "none",
      lineThickness:     1.8,
    }]
  };

  return <div className="w3-cell my-fourth" style={{'padding': '0 4px'}}>
    {title}
    {/* {rsi_ema[0].y === null ? '' : crossed_up ? <Up/> : <Down/> } */}
    <CanvasJSReact.CanvasJSChart options={options}/>
  </div>;
}