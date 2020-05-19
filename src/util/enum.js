export function reverseEnum(_enum) {
  let result = {};
  for (const name in _enum) {
    result[_enum[name]] = name;
  }
  return result;
}
