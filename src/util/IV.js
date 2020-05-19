import { isoStringToDate } from './date';

const monthMap = {
  'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5, 'JUL': 6,
  'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11,
};

function parseDate(date) {
  const offset = date.length === 6 ? 0 : 1;
  const day = parseInt(date.substring(0, 1 + offset));
  const month = monthMap[date.substring(1 + offset, 4 + offset)];
  const year = 2000 + parseInt(date.substring(4 + offset, 6 + offset));
  // Deribit handles expiration at 8 am UTC https://www.deribit.com/pages/docs/options
  return new Date(Date.UTC(year, month, day, 8));
}

export function parseFilename(filename) {
  const [symbol, date, strike, type] = filename.split('.')[0].split('-');
  const result = {
    symbol: symbol,
    date:   parseDate(date),
    strike: parseInt(strike),
    type:   type,
  };
  return result;
}

function isNotEmpty(s) {
  return s.trim() !== '';
}

function parsePoint(line, parse = parseInt) {
  const [timestamp, value] = line.split(',').map(s => s.trim());
  return { x: isoStringToDate(timestamp), y: parse(value) };
}

export function parsePoints(content, parse = parseInt) {
  let points = content.split('\n').filter(isNotEmpty)
  .map(line => parsePoint(line, parse));

  // remove leading zeros
  let leading_zeros = 0;
  while (points[leading_zeros++].y === 0 && leading_zeros < points.length) {
  }
  points = points.slice(leading_zeros);

  // specified correction
  for (let i = 1; i < points.length; i++) {
    if (points[i].y === 0) {
      points[i].y = points[i - 1].y;
    }
  }

  return points
}
