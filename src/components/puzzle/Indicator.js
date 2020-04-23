import React, { Component } from 'react';

import { DATA_SERVER_URL } from '../config';
import { isoStringToUnix } from '../util.date';

import Panel from '../common/Panel';

const REFRESH_RATE = 10000;

export default class Indicator extends Component {
  constructor(props) {
    super(props);
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
    const { relevantSlice } = this.props;
    this.formats = [[
      { interval: relevantSlice / 2, ...hourlyFormat },
      { interval: relevantSlice, ...hourlyFormat },
      { interval: 3 * relevantSlice / 2, ...hourlyFormat },
      { interval: 2 * relevantSlice, ...hourlyFormat },
    ], [
      { interval: relevantSlice / 7, ...dailyFormat },
      { interval: 2 * relevantSlice / 7, ...dailyFormat },
      { interval: 4 * relevantSlice / 7, ...dailyFormat },
      { interval: 8 * relevantSlice / 7, ...dailyFormat },
    ], [
      { interval: 12 * relevantSlice / 7, ...dailyFormat },
      { interval: 24 * relevantSlice / 7, ...dailyFormat },
      { interval: relevantSlice * 15, ...dailyFormat },
      { interval: relevantSlice * 45, ...dailyFormat },
    ]];
    this.termsTitles = ["Short Term", "Medium Term", "Long Term"];
    const initState = {};
    this.timeframes.forEach(tf => initState[tf] = {});
    this.state = initState;
  }

  componentDidMount() {
    const { title, file, selectors, relevantSlice } = this.props;
    document.title = title;

    // To be set on an interval
    const update = () => {
      Promise.all(this.timeframes.map(tf => {
        return {
          link: `${DATA_SERVER_URL}/data/ohlc-${tf}-${file}.json`,
          onsuccess: response => response.json(),
          onfailure: () => null,
        };
      })
      .concat(this.timeframes.map(tf => {
        return {
          link: `${DATA_SERVER_URL}/data/ohlc-${tf}-${file}-partial.json`,
          onsuccess: response => response.json(),
          onfailure: () => null,
        };
      }))
      .map(item => fetch(item.link).then(item.onsuccess).catch(item.onfailure)))
      .then(responses => {
    
        // Build state
        const newState = {};
        const m = this.timeframes.length;
        for (let tf = 0; tf < m; tf++) {

          // Cancel if any this timeframes' HTTP requests failed
          if (responses[tf] !== null || responses[tf + m] !== null) {

            // Transform data
            const dataPoints = {};
            const processKD = (tf, row) => {
              const timestamp = isoStringToUnix(responses[tf][row].timestamp);
              for (const name in selectors) {
                dataPoints[name].push({
                  x: timestamp,
                  y: selectors[name](responses[tf][row]),
                });
              }
            };
            for (const name in selectors) { dataPoints[name] = []; }
            processKD(tf + m, 0);
            const n = responses[tf].length;
            const first_row = Math.max(n - relevantSlice, 0);
            for (let row = n - 1; row > first_row; row--) {
              processKD(tf, row);
            }
  
            // Construct state
            newState[this.timeframes[tf]] = {};
            for (const name in selectors) {
              newState[this.timeframes[tf]][name] = dataPoints[name];
            }
          }
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
                <this.props.handler key={j}
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