import React, { useState } from 'react';

import { DATA_URI } from '../../config';

import { isoStringToUnix } from '../../util/date';
import { zip } from '../../util/general';

import { Loading256 } from '../common/Icons';
import Panel from '../common/Panel';

import useInterval from '../../hooks/useInterval';

// Local refresh rate; note that too short a duration will cause a crash
const REFRESH_RATE = 60000;// milliseconds

// Constants
const timeframes = [
  '1h', '2h', '3h', '4h', '6h', '12h', '1d', '2d', '3d', '1w', '1M', '3M'
];
const terms = [{
  title:      'Short Term',
  timeframes: {
    '1h': '1-hour',
    '2h': '2-hour',
    '3h': '3-hour',
    '4h': '4-hour',
  },
}, {
  title:      'Medium Term',
  timeframes: {
    '6h':  '6-hour',
    '12h': '12-hour',
    '1d':  '1-day',
    '2d':  '2-day',
  },
}, {
  title:      'Long Term',
  timeframes: {
    '3d': '3-day',
    '1w': '1-week',
    '1M': '1-month',
    '3M': '3-month',
  }
}];

// Update history and forecast
const update = async ({ columns, limit }) => {

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

  return Promise.all([
  
    // Fetch and parse historical data (as well as partial data)
    Promise.all(timeframes.map(tf => {
        const query = `timeframe=${tf}&limit=${limit}&columns=${_columns}`;
        return `${DATA_URI}/candles?${query}`;
      })
      .concat(timeframes.map(tf => {
        return `${DATA_URI}/partials?timeframe=${tf}`;
      }))
      .map(uri2fetch))
    .then(responses => {

      // Build state (historical part)
      const history = {};
      const m = timeframes.length;
      for (let i = 0; i < m; i++) {

        // Cancel if any this timeframes' HTTP requests failed
        if (responses[i] !== null && responses[i + m] !== null) {

          // Setup data structure
          const tf = timeframes[i];
          history[tf] = {};
          columns.forEach(column => history[tf][column] = []);

          // Transform data (this is tricky because the first half of the
          // responses are historical data and the latter half are partials)
          // Extract XY values row by row, starting with the partial
          extract(history[tf], responses[i + m]);
          const n = responses[i].length;
          const first_row = Math.max(n - limit, 0);
          for (let r = n - 1; r > first_row; r--) {
            extract(history[tf], responses[i][r]);
          }
        }
      }
      return history;
    }),

    // Fetch and parse forecast data
    Promise.all(timeframes.map(tf => {
      return `${DATA_URI}/forecast?timeframe=${tf}&columns=${_columns}`;
    }).map(uri2fetch))
    .then(responses => {

      if (responses.length === 0
          // Fallback in case of (synchronization or http) error
          || responses.every(r => r.length === 0 || r === null)
          || !responses.every(r => r.length === responses[0].length)) {
        return this.state.forecast;
      }

      // Build state (forecast part)
      const forecast = {};
      for (let i = 0; i < timeframes.length; i++) {
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
          const tf = timeframes[i];
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
        const zipped_tf = {};
        const len = Object.keys(forecast[tf]).length;
        const half_len = Math.floor(len / 2);
        for (let level = 0; level < half_len; level++) {
          const new_level = half_len - level;// lower level <=> lower index
          zipped_tf[new_level] = {};
          for (const column in forecast[tf][level]) {
            const lower = forecast[tf][level][column];
            const upper = forecast[tf][len - 1 - level][column];
            zipped_tf[new_level][column] = zip(lower, upper)
              .map(([l, u]) => ({
                x: l.x,
                y: [l.y, u.y],
              }));
          }
        }
        zipped_tf[0] = forecast[tf][half_len];
        forecast[tf] = zipped_tf;
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
            const { x, y } = history[tf][column][0];
            const head = level === '0' ? { x, y } : { x, y: [y, y] };
            forecast[tf][level][column].unshift(head);
          }
        }
      }
    }

    // Finally return the data
    return { history, forecast };
  });
};

// Data fetching hook
function useData(options) {
  const [data, setData] = useState({});
  const callback = () => update(options).then(setData);
  useInterval(callback, REFRESH_RATE);
  return data;
}

export default function Indicator({ Chart, options }) {
  const { history, forecast } = useData(options);
  
  // Render loading icon
  if (!history) {
    return <div className="w3-content" style={{
      // 80px menu, 2x16px margins, 2x16px padding
      height: 'calc(100vh - 112px)',
      display: 'table',
    }}>
      <div className="w3-cell w3-cell-middle">
        <Loading256/>
      </div>
    </div>;
  }

  // Render charts overview
  else {
    return terms.map(term => <Panel title={term.title} key={term.title}>
      <div className="w3-cell-row w3-center">
        {
          Object.entries(term.timeframes).map(([tf, title]) => <Chart
            key={title}
            title={title}
            history={history[tf]}
            forecast={forecast[tf]}
          />)
        }
      </div>
    </Panel>);
  }
};