import React, { Component } from 'react';

import { DATA_URI } from '../config';
import { isoStringToUnix } from '../util.date';
import { zip } from '../util.general';
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
    this.termsTitles = ["Short Term", "Medium Term", "Long Term"];

    const initState = {
      history:  {},
      forecast: this.initialForecast(),
    };
    this.timeframes.forEach(tf => initState.history[tf] = {});
    this.state = initState;
  }

  initialForecast() {
    const forecast = {'0': {}};
    this.timeframes.forEach(tf => {
      forecast[tf] = {'0': {}};
      this.props.columns.forEach(col => forecast[tf][0][col] = []);
    });
    return forecast;
  }

  componentDidMount() {
    const { title, columns, forecast } = this.props;
    const { limit, windowLimit } = this.props;
    document.title = title;

    // Adjust limit to window width
    const rel_limit = Math.min(limit, window.innerWidth / windowLimit);

    // Unparse the columns we need to fetch
    const _columns = ['timestamp', ...columns].join(',');

    // Generalized conversion of URI to promise
    const failure = err => { console.error(err); return null; };
    const uri2fetch = uri => fetch(uri).then(r => r.json()).catch(failure);

    // Generally parse (response) row to dataPoints
    const extract = (receiver, row) => {
      const timestamp = isoStringToUnix(row.timestamp);
      columns.forEach(column => {
        receiver[column].push({ x: timestamp, y: row[column] });
      });
    };

    // TODO/note: a more fitting way to update history would be to fetch URI by
    //            (history, partial)-pairs. However, this would require a bit of
    //            a rewrite and I'm not sure about the resulting convolutedness.

    // Update history and forecast
    const loop = () => {
      Promise.all([
        
        // Fetch and parse historical data (as well as partial data)
        Promise.all(this.timeframes.map(tf => {
            const query = `timeframe=${tf}&limit=${rel_limit}&columns=${_columns}`;
            return `${DATA_URI}/candles?${query}`;
          })
          .concat(this.timeframes.map(tf => {
            return `${DATA_URI}/partials?timeframe=${tf}`;
          }))
          .map(uri2fetch))
        .then(responses => {
      
          // Build state (historical part)
          const history = {};
          const m = this.timeframes.length;
          for (let i = 0; i < m; i++) {

            // Cancel if any this timeframes' HTTP requests failed
            if (responses[i] !== null && responses[i + m] !== null) {

              // Setup data structure
              const tf = this.timeframes[i];
              history[tf] = {};
              columns.forEach(column => history[tf][column] = []);

              // Transform data (this is tricky because the first half of the
              // responses are historical data and the latter half are partials)
              // Extract XY values row by row, starting with the partial
              extract(history[tf], responses[i + m]);
              const n = responses[i].length;
              const first_row = Math.max(n - rel_limit, 0);
              for (let r = n - 1; r > first_row; r--) {
                extract(history[tf], responses[i][r]);
              }
            }
          }
          return history;
        }),

        // Fetch and parse forecast data
        Promise.all(!forecast ? [] : this.timeframes.map(tf => {
          return `${DATA_URI}/forecast?timeframe=${tf}&columns=${_columns}`;
        }).map(uri2fetch))
        .then(responses => {

          if (responses.length === 0
              // Fallback in case of (synchronization or http) error
              || (responses.every(r => r.length === 0 || r === null)
              && !responses.every(r => r.length === responses[0].length))) {
            return this.state.forecast;
          }

          console.log(responses);

          // Build state (forecast part)
          const forecast = {};
          for (let i = 0; i < this.timeframes.length; i++) {
            if (responses[i] !== null) {

              // Separate by level
              const rows = responses[i];
              const levels = {};
              rows.forEach(row => {
                if (!(row.level in levels)) {
                  levels[row.level] = [];
                }
                levels[row.level].push(row);
              });

              // Analogous to how we extract historical data above, except there
              // are multiple levels (and no partials to deal with, also there
              // are always a constant amount of forecast candles)
              const tf = this.timeframes[i];
              forecast[tf] = {};
              for (const level in levels) {
                forecast[tf][level] = {};
                columns.forEach(column => forecast[tf][level][column] = []);
                levels[level].forEach(row => extract(forecast[tf][level], row));
              }
            }
          }

          // Zip the standard deviation levels together (0, n-1), (1, n-2), ...
          for (const tf in forecast) {
            const zipt_tf = {};
            const len = Object.keys(forecast[tf]).length;
            const half_len = Math.floor(len / 2);
            for (let level = 0; level < half_len; level++) {
              const new_level = half_len - level;// lower level <=> lower index
              zipt_tf[new_level] = {};
              for (const column in forecast[tf][level]) {
                const lower = forecast[tf][level][column];
                const upper = forecast[tf][len - 1 - level][column];
                zipt_tf[new_level][column] = zip(lower, upper).map(([l, u]) => {
                  return { x: l.x, y: [l.y, u.y] };
                });
              }
            }
            zipt_tf[0] = {};
            for (const column in forecast[tf][half_len]) {
              zipt_tf[0][column] = forecast[tf][half_len][column].map(d => {
                return { x: d.x, y: [d.y, d.y] };
              });
            }
            forecast[tf] = zipt_tf;
          }

          return forecast;
        })
      ])
      
      // Bring everything together
      .then(states => {
        const [history, forecast] = states;

        // Prepend the partial values to the forecast
        for (const tf in forecast) {
          if (tf in history) {
            for (const level in forecast[tf]) {
              for (const column in forecast[tf][level]) {
                const part = history[tf][column][0];
                const prep = { x: part.x, y: [part.y, part.y] };
                forecast[tf][level][column].unshift(prep);
              }
            }
          }
        }

        // Finally set the state to render the page
        this.setState({ history, forecast });
      });
    };

    // Start looping
    loop();
    this.priceInterval = setInterval(loop, REFRESH_RATE);
  }

  componentWillUnmount() {
    clearInterval(this.priceInterval);
  }

  render() {
    const { history, forecast } = this.state;
    const { forecast: hasForecast } = this.props;
    return <div className="w3-container w3-section">
      {
        this.terms.map((term, i) => <Panel title={this.termsTitles[i]} key={i}>
          <div className="w3-cell-row w3-center">
            {
              term.map((tf, j) =>
                <this.props.chart key={j}
                  {...history[tf]}
                  forecast={forecast[tf]}
                  title={this.titles[i][j]}
                />)
            }
          </div>
        </Panel>)
      }
      {
        !hasForecast ? '' : <div className="w3-center w3-small">
          Highlighted areas contain forecast values.
        </div>
      }
    </div>;
  }
}