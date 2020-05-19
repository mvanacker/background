import React from "react";
import CanvasJSReact from '../../canvasjs.react';

const { CanvasJSChart } = CanvasJSReact;

function SimpleChart(props) {
  return (
    <CanvasJSChart options={{
      culture:          "be",
      animationEnabled: true,
      theme:            "dark2",
      backgroundColor:  "black",
      height:           260,
      axisX:            {
        // valueFormatString: "HH:mm:ss"
      },
      axisY:            [{
        title:             props.title,
        logarithmic:       false,
        includeZero:       false,
        valueFormatString: "#,###",
        gridColor:         "#444444",
        // minimum:           1000,
      }],
      data:             [{
        lineColor:  "lime",
        type:       "line",
        // xValueType: "dateTime",
        dataPoints: props.points,
        markerType: "none",
      }]
    }}/>
  );
}

export default SimpleChart;
