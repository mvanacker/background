// Steve Zelaznik https://stackoverflow.com/questions/5259421/cumulative-distribution-function-in-javascript
export function stdNormalCDF(z) {
  let k, m, values, total, item, z2, z4, a, b;

  // Power series is not stable at these extreme tail scenarios
  if (z < -6) {
    return 0;
  }
  if (z > 6) {
    return 1;
  }

  m = 1; // m(k) == (2**k)/factorial(k)
  b = z; // b(k) == z ** (2*k + 1)
  z2 = z * z; // cache of z squared
  z4 = z2 * z2; // cache of z to the 4th
  values = [];

  // Compute the power series in groups of two terms.
  // This reduces floating point errors because the series
  // alternates between positive and negative.
  for (k = 0; k < 100; k += 2) {
    a = 2 * k + 1;
    item = b / (a * m);
    item *= 1 - (a * z2) / ((a + 1) * (a + 2));
    values.push(item);
    m *= 4 * (k + 1) * (k + 2);
    b *= z4;
  }

  // Add the smallest terms to the total first that
  // way we minimize the floating point errors.
  total = 0;
  for (k = 49; k >= 0; k--) {
    total += values[k];
  }

  // Multiply total by 1/sqrt(2*PI)
  // Then add 0.5 so that stdNormal(0) === 0.5
  return 0.5 + 0.3989422804014327 * total;
}

// DeepSpace101 https://stackoverflow.com/questions/8816729/javascript-equivalent-for-inverse-normal-function-eg-excels-normsinv-or-nor
export function stdNormalInverseCDF(p) {
  const a1 = -39.6968302866538,
    a2 = 220.946098424521,
    a3 = -275.928510446969,
    a4 = 138.357751867269,
    a5 = -30.6647980661472,
    a6 = 2.50662827745924,
    b1 = -54.4760987982241,
    b2 = 161.585836858041,
    b3 = -155.698979859887,
    b4 = 66.8013118877197,
    b5 = -13.2806815528857,
    c1 = -7.78489400243029e-3,
    c2 = -0.322396458041136,
    c3 = -2.40075827716184,
    c4 = -2.54973253934373,
    c5 = 4.37466414146497,
    c6 = 2.93816398269878,
    d1 = 7.78469570904146e-3,
    d2 = 0.32246712907004,
    d3 = 2.445134137143,
    d4 = 3.75440866190742,
    p_low = 0.02425,
    p_high = 1 - p_low;
  let q, r;
  let retVal;

  if (p < 0 || p > 1) {
    retVal = 0;
  } else if (p < p_low) {
    q = Math.sqrt(-2 * Math.log(p));
    retVal =
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= p_high) {
    q = p - 0.5;
    r = q * q;
    retVal =
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    retVal =
      -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }

  return retVal;
}

export function stdNormalPDF(x) {
  return Math.exp(-0.5 * x ** 2) / Math.sqrt(2 * Math.PI);
}

export function round_to(n, to = 1, base = 10) {
  const foo = base ** to;
  return Math.round(n * foo) / foo;
}

// https://www.w3resource.com/javascript-exercises/javascript-math-exercise-10.php
export function lcm(x, y) {
  if (typeof x !== 'number' || typeof y !== 'number') return false;
  return !x || !y ? 0 : Math.abs((x * y) / gcd(x, y));
}

// https://www.w3resource.com/javascript-exercises/javascript-math-exercise-10.php
export function gcd(x, y) {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}
