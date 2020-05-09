import React from 'react';

import CanvasJSReact from '../../canvasjs.react';
import { Up, Down } from '../common/Icons';

import Indicator from './Indicator.js';

export default function Stochs(props) {
  return <Indicator
    title='Stochs'
    columns={['stoch_K', 'stoch_K_D']}
    handler={StochChart}
    limit={14}
  />;
}

function StochChart(props) {
  const { stoch_K, stoch_K_D, title, format } = props;
  if (!stoch_K) { return null; }

  // Crossedness
  const crossed_up = stoch_K[0].y > stoch_K_D[0].y;
  const crossed_down = stoch_K[0].y < stoch_K_D[0].y;
  
  const options = {
    animationEnabled: true,
    theme:            "dark2",
    backgroundColor:  "transparent",
    height:           128,
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
      lineColor:         "white",
      type:              "line",
      xValueType:        "dateTime",
      dataPoints:        stoch_K_D,
      markerType:        "none",
      lineThickness:     1.3,
    }, {
      lineColor:         "orange",
      type:              "line",
      xValueType:        "dateTime",
      dataPoints:        stoch_K,
      markerType:        "none",
      lineThickness:     1.8,
    }]
  };
  return <div className="w3-cell my-fourth" style={{'padding': '0 4px'}}>
    {title} {
      crossed_up
        ? <Up title="Crossed up"/>
        : crossed_down
          ? <Down title="Crossed down"/>
          : ''
    }
    <CanvasJSReact.CanvasJSChart options={options}/>
  </div>;
}