import React from 'react';

import CanvasJSReact from '../../canvasjs.react';
import Indicator from './Indicator.js';

export default function Rsi() {
  const options = {
    limit:   40,
    columns: ['rsi'],
  };
  return <Indicator Chart={RsiChart} options={options}/>;
}

function RsiChart({ title, history }) {
  if (!history) { return null; }

  const { rsi } = history;

  const options = {
    animationEnabled: true,
    theme:            "dark2",
    backgroundColor:  "transparent",
    height:           180,
    axisX:            {
      lineThickness:     0.5,
      crosshair:         {
        enabled:         true,
        snapToDataPoint: true,
        color:           "white",
      },
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
      lineColor:         "orange",
      type:              "line",
      xValueType:        "dateTime",
      dataPoints:        rsi,
      markerType:        "none",
      lineThickness:     1.8,
    }]
  };

  return <div className="w3-cell my-fourth">
    {title}
    <CanvasJSReact.CanvasJSChart options={options}/>
  </div>;
}