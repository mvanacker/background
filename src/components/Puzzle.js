import React from 'react';

import Navigation from './common/Navigation';

const Piece = {
  // OVERVIEW:        0,
  MOVING_AVERAGES: 1,
  STOCHS:          2,
  RSI:             8,
  VOLATILITY:      3,
  // PATTERN:         4,
  // VOLUME:          5,
  // PROBABILITIES:   6,
  // OTHER_SYMBOLS:   7,
};
const Titles = {
  // OVERVIEW:        'Overview',
  MOVING_AVERAGES: 'MAs',
  STOCHS:          'Stochs',
  RSI:             'RSI',
  VOLATILITY:      'Volatility',
  // PATTERN:         'Pattern',
  // VOLUME:          'Volume',
  // PROBABILITIES:   'Probabilities',
  // OTHER_SYMBOLS:   'Other Symbols',
};
const Paths = {
  // OVERVIEW:        '/overview',
  MOVING_AVERAGES: '/moving-averages',
  STOCHS:          '/stochs',
  RSI:             '/rsi',
  VOLATILITY:      '/volatility',
  // PATTERN:         '/pattern',
  // VOLUME:          '/volume',
  // PROBABILITIES:   '/probabilities',
  // OTHER_SYMBOLS:   '/other-symbols',
};

export default function Puzzle() {
  return <Navigation level={2} items={Piece} titles={Titles} paths={Paths}/>;
}