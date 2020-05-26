import React, { useState } from 'react';

import { DATA_URI } from '../../config';

import { isoStringToUnix } from '../../util/date';
import { zip } from '../../util/array';
import { retry } from '../../util/promise';

import Loading from '../Loading';
import Panel from '../common/Panel';

import useInterval from '../../hooks/useInterval';
import ReactResizeDetector from 'react-resize-detector';

// Local refresh rate; note that too short a duration will cause a crash
const REFRESH_RATE = 60000;// milliseconds

// Delay between update attempts
const RETRY_DELAY = 5000;

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

// Custom error to signal failure whilst fetching data
class UpdateError extends Error {
  constructor(message, responses) {
    super(message);
    this.responses = responses;
    this.name      = 'UpdateError';
  }
}

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

  const attempt = () => Promise.all([
  
    // Fetch historical data
    Promise.all(timeframes.map(tf => {
        const query = `timeframe=${tf}&limit=${limit}&columns=${_columns}`;
        return `${DATA_URI}/candles?${query}`;
      })
      .concat(timeframes.map(tf => {
        return `${DATA_URI}/partials?timeframe=${tf}`;
      }))
      .map(uri2fetch))
    
    // Cancel if any requests failed
    .then(responses => {
      if (!responses.every(r => r !== null)) {
        throw new UpdateError('Failed to fetch history.', responses);
      }
      return responses;
    })

    // Parse historical data
    .then(responses => {
      const history = {};
      const m = timeframes.length;
      for (let i = 0; i < m; i++) {

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
      return history;
    }),

    // Fetch forecast data
    Promise.all(timeframes.map(tf => {
      return `${DATA_URI}/forecast?timeframe=${tf}&columns=${_columns}`;
    }).map(uri2fetch))

    // Cancel if response was incomplete
    .then(responses => {
      // some or all responses were empty or null: forecast was just reset
      if (!responses.every(r => r.length !== 0 && r !== null)
        // not all responses were of equal length: forecast was in progress
        || !responses.every(r => r.length === responses[0].length)) {
        throw new UpdateError('Failed to fetch forecast.', responses);
      }
      return responses;
    })

    // Parse forecast
    .then(responses => {
      const forecast = {};
      for (let i = 0; i < timeframes.length; i++) {

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

  // Bring history and forecast together
  .then(both => {
    const [history, forecast] = both;

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

  // Effectively retry forever
  const tries = Math.floor(REFRESH_RATE / RETRY_DELAY) - 1;
  return retry(tries, attempt, RETRY_DELAY, err => {
    console.error(err);
    console.error(err.responses);
    console.error(`Retry in ${RETRY_DELAY} ms...`);
  });
};

// Data fetching hook
export function useData(options) {
  const [data, setData] = useState({});
  const callback = () => update(options).then(setData);
  useInterval(callback, REFRESH_RATE);
  return data;
}

export function Overview({ Chart, data: { history, forecast} }) {
  return terms.map(term => <Panel title={term.title} key={term.title}>
    <div className="w3-cell-row w3-center">
      {
        Object.entries(term.timeframes).map(([tf, title]) => 
        <ReactResizeDetector key={title} handleWidth>
          {
            ({ width }) => <Chart
              title={title}
              history={history[tf]}
              forecast={forecast[tf]}
              width={width / 4}
              height={175}
            />
          }
        </ReactResizeDetector>)
      }
    </div>
  </Panel>);
}

export default function Indicator({ options, ...props }) {
  const data = useData(options);
  return !data.history ? <Loading/> : <Overview {...props} data={data}/>;
};