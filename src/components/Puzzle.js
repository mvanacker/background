import React from 'react';
import Navigation from './common/Navigation';

export default function Puzzle() {
  return <Navigation level={2} items={[{
      title: 'Volatility',
      path:  '/volatility',
    }, {
      title: 'MAs',
      path:  '/moving-averages',
    }, {
      title: 'Confluence',
      path:  '/confluence',
    }, {
      title: 'Stochs',
      path:  '/stochs',
    // }, {
    //   title: 'RSI',
    //   path:  '/rsi',
    // }, {
    //   title: 'Pattern/Volume/Other symbols',
    //   path:  '/to-do',
    }]}
  />;
}