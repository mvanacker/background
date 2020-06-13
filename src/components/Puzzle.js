import React from 'react';
import Navigation from './common/Navigation';

export default function Puzzle() {
  return (
    <Navigation
      className="w3-theme-l1"
      level={2}
      items={[
        {
          title: 'Volatility',
          path: '/volatility',
        },
        {
          title: 'MAs',
          path: '/moving-averages',
        },
        {
          title: 'Stochs',
          path: '/stochs',
        },
        {
          title: 'Confluence',
          path: '/confluence',
        },
      ]}
    />
  );
}
