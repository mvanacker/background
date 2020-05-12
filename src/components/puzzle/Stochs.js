import React from 'react';

import CanvasJSReact from '../../canvasjs.react';
import { Up, Down } from '../common/Icons';

import Indicator from './Indicator.js';

const FORECAST = true; // transitionary constant

export default function Stochs(props) {
  return <Indicator
    title='Stochs'
    columns={['stoch_K', 'stoch_K_D']}
    chart={StochChart}
    limit={14}
    forecast={FORECAST}
  />;
}

function StochChart(props) {
  const { stoch_K, stoch_K_D, title, format, forecast } = props;
  if (!stoch_K) { return null; }

  // Crossedness
  const crossed_up = stoch_K[0].y > stoch_K_D[0].y;
  const crossed_down = stoch_K[0].y < stoch_K_D[0].y;

  console.log(forecast[0].stoch_K.length);
  console.log(forecast[0].stoch_K);
  
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
      stripLines:        [{
        startValue: forecast[0].stoch_K[0].x,
        endValue:   forecast[0].stoch_K[forecast[0].stoch_K.length - 1].x,
        color:      "white",
        opacity:    0.03,

      }],
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
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[1].stoch_K_D,
      markerType:        "none",
      lineThickness:     0,
      fillOpacity:       0.16,
    }, {
      lineColor:         "white",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[2].stoch_K_D,
      markerType:        "none",
      lineThickness:     0,
      fillOpacity:       0.16,
    }, {
      lineColor:         "white",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[3].stoch_K_D,
      markerType:        "none",
      lineThickness:     0,
      fillOpacity:       0.16,
    }, {
      lineColor:         "orange",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[3].stoch_K,
      markerType:        "none",
      lineThickness:     0,
      fillOpacity:       0.16,
    }, {
      lineColor:         "orange",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[2].stoch_K,
      markerType:        "none",
      lineThickness:     0,
      fillOpacity:       0.16,
    }, {
      lineColor:         "orange",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[1].stoch_K,
      markerType:        "none",
      lineThickness:     0,
      fillOpacity:       0.16,
    }, {
      lineColor:         "white",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[0].stoch_K_D,
      markerType:        "none",
      lineThickness:     1.3,
    }, {
      lineColor:         "orange",
      type:              "rangeArea",
      xValueType:        "dateTime",
      dataPoints:        forecast[0].stoch_K,
      markerType:        "none",
      lineThickness:     1.8,
    }, {
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