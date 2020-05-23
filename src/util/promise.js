// Jaromanda X https://stackoverflow.com/questions/42429590/retry-on-javascript-promise-reject-a-limited-number-of-times-or-until-success
export const wait = (time) => new Promise(resolve => setTimeout(resolve, time || 0));
export const retry = (cont, fn, delay, handler) => fn().catch(err => {
  if (!handler) {
    handler = console.error;
  }
  handler(err);
  return cont > 0
    ? wait(delay).then(() => retry(cont - 1, fn, delay, handler))
    : Promise.reject('Gave up.');
});