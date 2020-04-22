import React, { Component } from 'react';

import CanvasJS from '../../canvasjs.min';
import CanvasJSReact from '../../canvasjs.react';

import up from '../../assets/up.png';
import down from '../../assets/down.png'
import { DATA_SERVER_URL } from '../config';

import { isoStringToUnix } from '../util.date';

import Panel from '../common/Panel';

const REFRESH_RATE = 10000;
const REL_SLICE = 14;

export default class Stochs extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.timeframes = [
      '1h', '2h', '3h', '4h', '6h', '12h', '1d', '2d', '3d', '1w', '1M', '3M'
    ];
    this.titles = [
      ['1-hour', '2-hour', '3-hour', '4-hour'],
      ['6-hour', '12-hour', '1-day', '2-day'],
      ['3-day', '1-week', '1-month', '3-month'],
    ];
    this.terms = [
      ['1h', '2h', '3h', '4h'],
      ['6h', '12h', '1d', '2d'],
      ['3d', '1w', '1M', '3M'],
    ];
    const hourlyFormat = { valueFormatString: 'HH tt', intervalType: 'hour' };
    const dailyFormat = { valueFormatString: 'DD MMM', intervalType: 'day' };
    this.formats = [[
      { interval: REL_SLICE / 2, ...hourlyFormat },
      { interval: REL_SLICE, ...hourlyFormat },
      { interval: 3 * REL_SLICE / 2, ...hourlyFormat },
      { interval: 2 * REL_SLICE, ...hourlyFormat },
    ], [
      { interval: REL_SLICE / 7, ...dailyFormat },
      { interval: 2 * REL_SLICE / 7, ...dailyFormat },
      { interval: 4 * REL_SLICE / 7, ...dailyFormat },
      { interval: 8 * REL_SLICE / 7, ...dailyFormat },
    ], [
      { interval: 12 * REL_SLICE / 7, ...dailyFormat },
      { interval: 24 * REL_SLICE / 7, ...dailyFormat },
      { interval: REL_SLICE * 15, ...dailyFormat },
      { interval: REL_SLICE * 45, ...dailyFormat },
    ]];
    this.termsTitles = ["Short Term", "Medium Term", "Long Term"];
    this.timeframes.forEach(tf => this.state[tf] = {});
  }

  componentDidMount() {
    document.title = 'Stochs';
    const update = () => {
      Promise.all(this.timeframes.map(tf => {
        return {
          link: `${DATA_SERVER_URL}/data/ohlc-${tf}-stoch.json`,
          onsuccess: response => response.json(),
          onfailure: () => this.state[tf],
        };
      })
      .concat(this.timeframes.map(tf => {
        return {
          link: `${DATA_SERVER_URL}/data/ohlc-${tf}-stoch-partial.json`,
          onsuccess: response => response.json(),
          onfailure: () => {
            return { K: this.state[tf].K[0], D: this.state[tf].D[0] };
          },
        };
      }))
      .map(item => fetch(item.link).then(item.onsuccess).catch(item.onfailure)))
      .then(stochs => {
        const newState = {};
        const m = this.timeframes.length;
        for (let i = 0; i < m; i++) {
          const dataPointsK = [], dataPointsD = [];
          const n = stochs[i].length;
          const oldest_index = Math.max(n - REL_SLICE, 0);
          const processKD = (i, j) => {
            if (!stochs[i][j]) { // TODO: this is a bug trap
              console.log(i, j, stochs, stochs[i], stochs[i][j]);
              // upon catching this bug I found the- AAAH! onfailure
            }
            const timestamp = isoStringToUnix(stochs[i][j].timestamp);
            dataPointsK.push({ x: timestamp, y: stochs[i][j].K });
            dataPointsD.push({ x: timestamp, y: stochs[i][j].D });
          };
          processKD(i + m, 0);
          for (let j = n - 1; j > oldest_index; j--) {
            processKD(i, j);
          }
          newState[this.timeframes[i]] = { K: dataPointsK, D: dataPointsD };
        }
        this.setState(newState);
      });
    };
    update();
    this.priceInterval = setInterval(update, REFRESH_RATE);
  }

  componentWillUnmount() {
    clearInterval(this.priceInterval);
  }

  render() {
    return <div className="w3-container w3-section">
      {
        this.terms.map((term, i) => <Panel title={this.termsTitles[i]} key={i}>
          <div className="w3-cell-row w3-center">
            {
              term.map((tf, j) =>
                <StochChart key={j}
                  {...this.state[tf]}
                  title={this.titles[i][j]}
                  format={this.formats[i][j]}
                />)
            }
          </div>
        </Panel>)
      }
    </div>;
  }
}

function StochChart(props) {
  const { K, D, title, format } = props;
  if (!(K && D)) { return null; }
  const crossed_up = K[0].y - D[0].y > 0;
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
      maximum:           1,
      minimum:           0,
      interval:          0.2,
      crosshair:         {
        enabled:         true,
        snapToDataPoint: true,
        labelMaxWidth:   40,
        labelFormatter:  e => CanvasJS.formatNumber(e.value, ".##"),
      },
      stripLines:        [{
        startValue: .3,
        endValue:   .45,
        color:      'red',
        opacity:    .11,
      }, {
        startValue: .65,
        endValue:   .8,
        color:      'lime',
        opacity:    .08,
      }],
    }],
    data:             [{
      lineColor:     "white",
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    D,
      markerType:    "none",
      lineThickness: 1.3,
    }, {
      lineColor:     "orange",
      type:          "line",
      xValueType:    "dateTime",
      dataPoints:    K,
      markerType:    "none",
      lineThickness: 1.8,
    }]
  };
  return <div className="w3-cell my-fourth" style={{'padding': '0 4px'}}>
    {title} {D[0].y === null ? '' : crossed_up ? <Up/> : <Down/> }
    <CanvasJSReact.CanvasJSChart options={options}/>
  </div>;
}

// filters computation app: https://codepen.io/sosuke/pen/Pjoqqp

function Up() {
  return <img src={up} alt='UP' width='16px' style={{'filter': 'invert(89%) sepia(55%) saturate(1962%) hue-rotate(15deg) brightness(105%) contrast(104%)'}}/>;
}
function Down() {
  return <img src={down} alt='DOWN' width='16px' style={{'filter': 'invert(11%) sepia(81%) saturate(6805%) hue-rotate(2deg) brightness(117%) contrast(116%)'}}/>;
}