import React from 'react';
import Navigation from './common/Navigation';

export default () => (
  <>
    <Navigation
      className="w3-theme-l2"
      items={[
        {
          title: 'Home',
          path: '/',
        },
        {
          title: 'Trade',
          path: '/trade',
        },
        {
          title: 'About',
          path: '/about',
        },
      ]}
    />
    <Navigation
      className="w3-theme-l1"
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
      level={2}
    />
  </>
);
