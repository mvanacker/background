import React, { Component } from 'react';

import { DATA_SERVER_URL } from '../config';
import { isoStringToUnix } from '../util.date';
import Panel from '../common/Panel';

const REFRESH_RATE = 60000;// milliseconds

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
    const { limit } = this.props;
    this.formats = [[
      { interval: limit / 2, ...hourlyFormat },
      { interval: limit, ...hourlyFormat },
      { interval: 3 * limit / 2, ...hourlyFormat },
      { interval: 2 * limit, ...hourlyFormat },
    ], [
      { interval: 3 * limit, ...hourlyFormat },
      { interval: 6 * limit, ...hourlyFormat },
      { interval: 4 * limit / 7, ...dailyFormat },
      { interval: 8 * limit / 7, ...dailyFormat },
    ], [
      { interval: 12 * limit / 7, ...dailyFormat },
      { interval: 24 * limit / 7, ...dailyFormat },
      { interval: limit * 15, ...dailyFormat },
      { interval: limit * 45, ...dailyFormat },
    ]];
    this.termsTitles = ["Short Term", "Medium Term", "Long Term"];
    const initState = {};
    this.timeframes.forEach(tf => initState[tf] = {});
    this.state = initState;
  }

  componentDidMount() {
    const { title, columns, limit } = this.props;
    document.title = title;

    // Unparse the columns we need to fetch
    const _columns = ['timestamp', ...columns].join(',');

    // To be set on an interval
    const update = () => {
      Promise.all(this.timeframes.map(tf => {
          const query = `timeframe=${tf}&limit=${limit}&columns=${_columns}`;
          return `${DATA_SERVER_URL}/candles?${query}`;
        })
        .concat(this.timeframes.map(tf => {
          return `${DATA_SERVER_URL}/partials?timeframe=${tf}`;
        }))
        .map(uri => fetch(uri).then(r => r.json()).catch(err => {
          console.error(err);
          return null;
        })))
      .then(responses => {
     
        // Build state
        const newState = {};
        const m = this.timeframes.length;
        for (let i = 0; i < m; i++) {

          // Cancel if any this timeframes' HTTP requests failed
          if (responses[i] !== null && responses[i + m] !== null) {

            // Transform data, this is tricky because the first half of the
            // responses are historical data and the latter half are partials
            const tf = this.timeframes[i];
            newState[tf] = {};
            columns.forEach(column => newState[tf][column] = []);

            // Parse response into dataPoints
            const extractor = row => {
              const timestamp = isoStringToUnix(row.timestamp);
              columns.forEach(column => {
                newState[tf][column].push({ x: timestamp, y: row[column] });
              });
            };

            // Extract XY values row by row, starting with the partial
            extractor(responses[i + m]);
            const n = responses[i].length;
            const first_row = Math.max(n - limit, 0);
            for (let row_i = n - 1; row_i > first_row; row_i--) {
              extractor(responses[i][row_i]);
            }
          }
        }
        this.setState(newState);
        // this.setState(newState, () => console.log(this.state)); //TODO debug
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