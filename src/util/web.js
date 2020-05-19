export function dump_params(params) {
  return Object.entries(params).map(([key, val]) => `${key}=${val}`).join('&');
}
