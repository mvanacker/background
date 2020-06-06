import React from 'react';
import ReactDOM from 'react-dom';

import './w3.css';
import './w3-theme-indigo.css';
import './w3-theme-indigo-extension.css';
import './components/App.css';
import './index.css';

import * as serviceWorker from './serviceWorker';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { CookiesProvider } from 'react-cookie';

// Redux
import { Provider } from 'react-redux';
import store from './store';

// Legal
import FinancialDisclaimer from './components/disclaimers/Financial';
import CookieDisclaimer from './components/disclaimers/Cookie';

// Components
import Content from './components/Content';
import App from './components/App';
import Trade from './components/trade/Trade';
import Options from './components/Options';

// Puzzle pieces
import Puzzle from './components/Puzzle';
import Confluence from './components/puzzle/Confluence';
import MovingAverages from './components/puzzle/MovingAverages';
import Stochs from './components/puzzle/Stochs';
import Rsi from './components/puzzle/Rsi';
import Hvp from './components/puzzle/Hvp';

// Easter eggs
import Probs from './components/easter-eggs/Probs';
import Futures from './components/easter-eggs/Futures';
import Simulation from './components/easter-eggs/Simulation';

// Deprecated components
import IV from './components/deprecated/IV';
import GIV from './components/deprecated/GIV';
import TradeJournal from './components/deprecated/TradeJournal';

// UI components
import Navigation from './components/common/Navigation';

// Test component(s)
import Test from './sandbox/Test.js';

// When a page has a vertical scrollbar, a white band appears at its bottom.
// To counter this, I place the background color directly on the <html> tag,
// which does stretch all the way to the bottom, unlike the <body> element or
// the <div id="root"> element, even when the page has a vertical scrollbar.
document.body.classList.add('w3-theme-dark');

// Right-hand side of the application
const Right = () => (
  <>
    <Navigation
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
          title: 'Options',
          path: '/options',
        },
      ]}
    />

    {/* Top-level pages */}
    <Route path="/" component={Puzzle} />
    <Route exact path="/" component={MovingAverages} />
    <Route path="/trade" component={Trade} />
    <Route path="/options" component={Options} />

    {/* Puzzle pieces */}
    <Route path="/confluence" component={Confluence} />
    <Route path="/moving-averages" component={MovingAverages} />
    <Route path="/stochs" component={Stochs} />
    <Route path="/rsi" component={Rsi} />
    <Route path="/volatility" component={Hvp} />

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
  </>
);

// Render application
ReactDOM.render(
  <CookiesProvider>
    <Provider store={store}>
      <div className="w3-theme-dark w3-text-white">
        <FinancialDisclaimer>
          <Router>
            <Content left={<App />} right={<Right />} />
          </Router>
          <CookieDisclaimer />
        </FinancialDisclaimer>
      </div>
    </Provider>
  </CookiesProvider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
