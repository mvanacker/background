import React from 'react';

import CanvasJS from '../../canvasjs.min';
import CanvasJSReact from '../../canvasjs.react';

import Indicator from './Indicator.js';

export default function Rsi(props) {
  return <Indicator
    title='RSI'
    file='rsi'
    selectors={{ rsi: row => row.rsi }}
    handler={RsiChart}
    relevantSlice={14}
  />;
}

function RsiChart(props) {
  const { rsi, title, format } = props;
  if (!rsi) { return null; }
  console.log(rsi);
  const options = {
    animationEnabled: true,
    theme:            "dark2",
    backgroundColor:  "transparent",
    height:           115,
    toolTip:          {
      enabled: false,
    },
    axisX:            {
      lineThickness:     0.5,
      crosshair:         {
        enabled:         true,
        snapToDataPoint: true,
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
        snapToDataPoint: true,
        labelMaxWidth:   40,
        labelFormatter:  e => CanvasJS.formatNumber(e.value, ".##"),
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
      lineColor:     "white",
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    rsi,
      markerType:    "none",
      lineThickness: 1.3,
    }]
  };
  return <div className="w3-cell my-fourth" style={{'padding': '0 4px'}}>
    {title} <CanvasJSReact.CanvasJSChart options={options}/>
  </div>;
}