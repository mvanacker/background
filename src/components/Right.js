import React from 'react';
import { Route } from 'react-router-dom';

import Trade from './trade/Trade';
import About from './About';

// Puzzle pieces
import Confluence from './puzzle/Confluence';
import MovingAverages from './puzzle/MovingAverages';
import Stochs from './puzzle/Stochs';
import Rsi from './puzzle/Rsi';
import Hvp from './puzzle/Hvp';

// Easter eggs
import Probs from './easter-eggs/Probs';
import Futures from './easter-eggs/Futures';

// Deprecated components
import IV from './deprecated/IV';
import GIV from './deprecated/GIV';
import TradeJournal from './deprecated/TradeJournal';

// UI components
import Menu from './Menu';

// Test component(s)
import Test from '../sandbox/Test.js';

export default ({ width }) => {
  const withDimensions = (Component) => (props) => (
    <Component width={width / 4 - 32} height={154} {...props} />
  );
  return (
    <div className="my-right">
      <div className="my-nav-container">
        <Menu />
      </div>

      {/* Custom-positioned content. */}
      <Route path="/trade" component={Trade} />

      {/* Centered content. */}
      <div className="my-flex my-right-outer-container">
        <div className="my-right-inner-container">
          <Route exact path="/" component={withDimensions(MovingAverages)} />
          <Route path="/about" component={About} />

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
