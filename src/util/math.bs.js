import { stdNormalCDF, stdNormalInverseCDF, stdNormalPDF } from './math';

export function compute_d1(price, strike, volatility, time) {
  return (Math.log(price / strike) + volatility ** 2 / 2 * time)
         / (volatility * Math.sqrt(time));
}

export function compute_d2(d1, volatility, time) {
  return d1 - (volatility * Math.sqrt(time));
}

export function compute_prob_itm(price, strike, volatility, time) {
  const d1 = compute_d1(price, strike, volatility, time);
  const d2 = compute_d2(d1, volatility, time);
  return stdNormalCDF(Math.sign(strike - price) * d2);
}

export function compute_probs(price, strike, volatility, time) {
  const d1 = compute_d1(price, strike, volatility, time);
  const d2 = compute_d2(d1, volatility, time);
  const prob_itm = stdNormalCDF(Math.sign(strike - price) * d2);
  const prob_touch = 2 * prob_itm;
  const call = price * stdNormalCDF(d1) - strike * stdNormalCDF(d2);
  const prob_profit_call = 1 - compute_prob_itm(price, strike + call, volatility, time);
  const put = strike * stdNormalCDF(-d2) - price * stdNormalCDF(-d1);
  const prob_profit_put = 1 - compute_prob_itm(price, strike - put, volatility, time);
  return { prob_itm, prob_touch, prob_profit_put, prob_profit_call };
}

export function compute_reverse(prob, strike, volatility, time) {
  const vt = volatility ** 2 / 2 * time;
  const svt = Math.sqrt(2 * vt);
  const d = stdNormalInverseCDF(prob) + svt;
  const p1 = strike * Math.exp(d * svt - vt);
  const p2 = strike * Math.exp(-(d * svt - vt));
  return [p1, p2];
}

export function compute_call(price, strike, volatility, time) {
  const d1 = compute_d1(price, strike, volatility, time);
  const d2 = compute_d2(d1, volatility, time);
  return price * stdNormalCDF(d1) - strike * stdNormalCDF(d2);
}

export function compute_put(price, strike, volatility, time) {
  const d1 = compute_d1(price, strike, volatility, time);
  const d2 = compute_d2(d1, volatility, time);
  return strike * stdNormalCDF(-d2) - price * stdNormalCDF(-d1);
}

export function compute_vega(price, strike, volatility, time) {
  const d1 = compute_d1(price, strike, volatility, time);
  return price * Math.sqrt(time) * stdNormalPDF(d1);
}

export function compute_iv_call(price, strike, time, premium) {
  return compute_iv(price, strike, time, premium, compute_call)
}

export function compute_iv_put(price, strike, time, premium) {
  return compute_iv(price, strike, time, premium, compute_put)
}

export function compute_iv(price, strike, time, premium, compute_premium) {
  let iv = 1;
  while (true) {
    const premium_i = compute_premium(price, strike, iv, time);
    const vega_i = compute_vega(price, strike, iv, time);
    const iv_i = iv - (premium_i - premium) / vega_i;
    if (Math.abs(iv_i - iv) < 0.00001 || isNaN(iv_i)) { 
      iv = iv_i;
      break;
    }
    iv = iv_i;
  }
  return iv;
}
