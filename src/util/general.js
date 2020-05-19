export function zip(list1, list2) {
  if (list1.length > list2.length) {
    return list2.map((e, i) => [list1[i], e]);
  } else {
    return list1.map((e, i) => [e, list2[i]]);
  }
}

export function head(list, n) {
  return list.slice(0, n);
}

export function tail(list, n) {
  return list.slice(list.length - n, list.length);
}