import React from 'react';

import CanvasJSReact from '../../canvasjs.react';
import Indicator from './Indicator.js';
import { Alert, Alarm } from '../common/Icons';

const LIMIT = 50;

export default function Hvp(props) {
  return <Indicator
    title='Historical Volatility Percentile'
    columns={['hvp', 'hvp_ma']}
    handler={HvpChart}
    limit={LIMIT}
  />;
}

function HvpChart(props) {
  let { hvp } = props;
  const { hvp_ma, title, format } = props;
  if (!hvp) { return null; }

  // Add color to the histogram
  hvp = hvp.map(({x, y}) => {
    const color = y > 90 ? 'maroon' : y > 80 ? 'orange' : 'lightblue';
    return { x, y, color };
  });

  // Low volatility warnings, but only for timeframes with enough data
  const last = Math.min(LIMIT - 1, hvp.length - 1);
  const enough_data = hvp[last].y !== null;
  const low_vol = enough_data && hvp[0].y < 20;
  const very_low_vol = enough_data && hvp[0].y < 10;

  const options = {
    animationEnabled: true,
    dataPointWidth:   1,
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
      },
    }],
    data:             [{
      type:          "column",
      xValueType:    "dateTime",
      dataPoints:    hvp,
      markerType:    "none",
    }, {
      lineColor:     "white",
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    hvp_ma,
      markerType:    "none",
    }]
  };
  return <div className="w3-cell my-fourth" style={{'padding': '0 4px'}}>
    {title} {
      very_low_vol
        ? <Alarm title="Below 20"/>
        : low_vol
          ? <Alert title="Below 10"/>
          : ''
    }
    <CanvasJSReact.CanvasJSChart options={options}/>
  </div>;
}