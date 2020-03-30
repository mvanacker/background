// RobG https://stackoverflow.com/questions/27012854/change-iso-date-string-to-date-object-javascript
export function parseISOString(s) {
  const b = s.split(/\D+/);
  return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
}

export function toYears(days, hours) {
  return (parseFloat(days) + parseFloat(hours) / 24) / 365;
}

export function toHours(years) {
  return parseFloat(years) * 24 * 365;
}
