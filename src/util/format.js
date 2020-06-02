export const percent = (number, { decimals = 3 } = {}) =>
  `${toTruncString(number * 100, decimals)}%`;

export const toTruncString = (float, decimals) => {
  const [int, dec] = float.toString().split('.');
  return !dec ? int : parseFloat([int, dec.slice(0, decimals)].join('.'));
};
