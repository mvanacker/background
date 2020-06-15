import React from 'react';
import { Route } from 'react-router-dom';

import Trade from './trade/Trade';
import Options from './Options';

// Puzzle pieces
import Confluence from './puzzle/Confluence';
import MovingAverages from './puzzle/MovingAverages';
import Stochs from './puzzle/Stochs';
import Rsi from './puzzle/Rsi';
import Hvp from './puzzle/Hvp';

// Easter eggs
import Probs from './easter-eggs/Probs';
import Futures from './easter-eggs/Futures';
import Simulation from './easter-eggs/Simulation';

// Deprecated components
import IV from './deprecated/IV';
import GIV from './deprecated/GIV';
import TradeJournal from './deprecated/TradeJournal';

// UI components
import Navigation from './common/Navigation';

// Test component(s)
import Test from '../sandbox/Test.js';

export default ({ width }) => {
  const withDimensions = (Component) => (props) => (
    <Component width={width / 4 - 32} height={155} {...props} />
  );
  return (
    <div className="my-right">
      <Navigation className="w3-theme-l2" items={upperNavItems} />
      <Navigation className="w3-theme-l1" items={lowerNavItems} level={2} />

      <div className="my-right-content-outer-container">
        <div className="my-right-content-inner-container">
          <Route exact path="/" component={withDimensions(MovingAverages)} />
          <Route path="/trade" component={Trade} />
          <Route path="/options" component={Options} />

          {/* Puzzle pieces */}
          <Route path="/confluence" component={Confluence} />
          <Route
            path="/moving-averages"
            component={withDimensions(MovingAverages)}
          />
          <Route path="/stochs" component={withDimensions(Stochs)} />
          <Route path="/rsi" component={withDimensions(Rsi)} />
          <Route path="/volatility" component={withDimensions(Hvp)} />

          {/* Easter eggs */}
          <Route path="/probs" component={Probs} />
          <Route path="/futures" component={Futures} />
          <Route path="/simulation" component={Simulation} />

          {/* Deprecated features */}
          <Route path="/iv" component={IV} />
          <Route path="/giv" component={GIV} />
          <Route path="/journal" component={TradeJournal} />

          {/* Testing */}
          <Route path="/test" component={Test} />
        </div>
      </div>
    </div>
  );
};

const upperNavItems = [
  {
    title: 'Home',
    path: '/',
  },
  {
    title: 'Trade',
    path: '/trade',
  },
  {
    title: 'Options',
    path: '/options',
  },
];

const lowerNavItems = [
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
];
