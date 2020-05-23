export function zip(array1, array2) {
  if (array1.length > array2.length) {
    return array2.map((e, i) => [array1[i], e]);
  } else {
    return array1.map((e, i) => [e, array2[i]]);
  }
}

export function head(array, n) {
  return array.slice(0, n);
}

export function tail(array, n) {
  return array.slice(array.length - n, array.length);
}