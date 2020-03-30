import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import * as serviceWorker from './serviceWorker';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { CookiesProvider } from "react-cookie";

// Components
import App from './components/App';
import IV from './components/IV';
import GIV from './components/GIV';
import Probs from './components/Probs';
import Trade from './components/Trade';
import TradeJournal from './components/TradeJournal';
import Analyzer from './components/Analyzer';
import Temp from './components/Temp';

// Rendering
ReactDOM.render(
  <CookiesProvider>
    <Router>
      <div>
        <Route exact path='/' component={App}/>
        <Route path='/iv' component={IV}/>
        <Route path='/giv' component={GIV}/>
        <Route path='/probs' component={Probs}/>
        <Route exact path='/trade' component={Trade}/>
        <Route path='/trade/journal' component={TradeJournal}/>
        <Route path='/analyzer' component={Analyzer}/>
        <Route path='/temp' component={Temp}/>
      </div>
    </Router>
  </CookiesProvider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
