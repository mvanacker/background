export function sum(array) {
  return array.reduce((a, b) => a + b, 0);
}

export function mean(array) {
  return sum(array) / array.length;
}

export function floats(array) {
  return array.map(parseFloat).filter((n) => !isNaN(n));
}

export function zip(array1, array2) {
  if (array1.length > array2.length) {
    return array2.map((e, i) => [array1[i], e]);
  } else {
    return array1.map((e, i) => [e, array2[i]]);
  }
}

export function subsequentPairs(array) {
  return zip(array.slice(0, -1), array.slice(1));
}

export function head(array, n) {
  return array.slice(0, n);
}

export function tail(array, n) {
  return array.slice(array.length - n, array.length);
}

export function argmax(array) {
  return [].reduce.call(array, (m, c, i, arr) => (c > arr[m] ? i : m), 0);
}

export function argmin(array) {
  return [].reduce.call(array, (m, c, i, arr) => (c < arr[m] ? i : m), 0);
}
