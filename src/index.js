import React from 'react';
import ReactDOM from 'react-dom';

import './w3.css';
import './w3-theme-indigo.css';
import './w3-theme-indigo-extension.css';
import './index.css';

import * as serviceWorker from './serviceWorker';
import { BrowserRouter as Router } from 'react-router-dom';

// Redux
import { Provider } from 'react-redux';
import store from './store';

// Scroll restoration
import { ScrollToTopOnNav } from './components/common/ScrollToTop';

// Context(s)
import Deribit from './contexts/Deribit';

// Legal
import FinancialDisclaimer from './components/disclaimers/Financial';
import CookieDisclaimer from './components/disclaimers/Cookie';

// Components
import Content from './components/Content';
import Left from './components/Left';
import Right from './components/Right';

// Use JS to add themed background-color to <body>
document.body.classList.add('w3-theme-dark');

// Render application
ReactDOM.render(
  <Provider store={store}>
    <FinancialDisclaimer>
      <Router>
        <ScrollToTopOnNav />
        <Deribit>
          <Content left={<Left />} right={Right} />
        </Deribit>
      </Router>
      <CookieDisclaimer />
    </FinancialDisclaimer>
  </Provider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
