import React, { Component } from 'react';

import { element, func, instanceOf, object } from "prop-types";
import { Cookies, withCookies } from "react-cookie";

import { lcm, mean as mean_, round_to } from '../util/math';
import { DATA_URI, REFRESH_RATE } from '../config';
import { dump_params } from '../util/web';
import setYearlyCookie from '../util/cookie';

import Bitcoin from './common/Bitcoin';
import Panel from './common/Panel';
import LabeledRow from './common/LabeledRow';
import Button from './common/Button';
import Row from './common/Row';
import Bar from './common/Bar';
import BarButton from './common/BarButton';

class Deribit extends Component {
  static propTypes = {
    cookies:  instanceOf(Cookies).isRequired,
    children: element,
  };

  constructor(props) {
    super(props);

    const { cookies } = this.props;
    this.state = {
      api: 'https://www.deribit.com/api/v2',
      // api: 'https://test.deribit.com/api/v2',

      // polled value
      equity: undefined, // todo entire account summary

      // authentication
      key:      cookies.get('deribit-key') || undefined,
      secret:   cookies.get('deribit-secret') || undefined,
      response: undefined,
    };

    this.bind();
  }

  bind() {
    this.apiCall = this.apiCall.bind(this);

    this.keyChanged = this.keyChanged.bind(this);
    this.secretChanged = this.secretChanged.bind(this);

    this.authenticate = this.authenticate.bind(this);
    this.logout = this.logout.bind(this);

    this.cancelAll = this.cancelAll.bind(this);
  }

  componentDidMount() {
    window.addEventListener('beforeunload', e => {
      e.preventDefault();
      this.stop_polling();
    });
    const { key, secret } = this.state;
    if (key && secret) {
      this.authenticate();
    }
  }

  componentWillUnmount() {
    this.stop_polling();
  }

  apiCall(method, params, auth = false) {
    params = dump_params(params);
    const uri = encodeURI(`${this.state.api}${method}?${params}`);
    let fetch_;
    if (!auth) {
      fetch_ = fetch(uri);
    } else {
      const make_auth_header = () => {
        const token = this.state.response['access_token'];
        return { headers: { 'Authorization': `Bearer ${token}` } };
      };
      fetch_ = fetch(uri, make_auth_header()).then(response => {

        // re-authenticate
        if (response.status === 401) {
          return this.authenticate().then(() => fetch(uri, make_auth_header()));
        } else {
          return response;
        }
      });
    }
    return fetch_.then(r => r.json()).then(o => o['result']);
  }

  setCookie(key, value) {
    setYearlyCookie(this.props.cookies, key, value, '/trade');
  }

  keyChanged(e) {
    this.setCookie('deribit-key', e.target.value);
    this.setState({ key: e.target.value });
  }

  secretChanged(e) {
    this.setCookie('deribit-secret', e.target.value);
    this.setState({ secret: e.target.value });
  }

  authenticate(e) {
    if (e) {
      e.preventDefault();
    }

    const { key, secret } = this.state;
    return this.apiCall('/public/auth', {
      client_id:     key,
      client_secret: secret,
      grant_type:    'client_credentials',
    })
    .then(result => {

      if (result) {

        // cancel current polling on subsequent passes
        if (this.updateInterval) {
          this.stop_polling();
        }

        // start polling
        this.start_polling();

        // update state
        this.setState({ response: result });
      } else {
        console.log('Warning: login failed.');
      }

      return result;
    });
  }

  start_polling() {
    this.updateInterval = setInterval(() => {
      Promise.all([
        this.apiCall(
          '/private/get_account_summary',
          { currency: 'BTC' },
          true
        ),
      ])
      .then(result => {
        const [account_summary] = result;
        this.setState({ account_summary });
      });
    }, REFRESH_RATE);
  }

  stop_polling() {
    clearInterval(this.updateInterval);
  }

  logout() {
    this.stop_polling();
    this.setState({ response: undefined });
  }

  cancelAll(e) {
    e.preventDefault();
    this.apiCall('/private/cancel_all', {}, true);
  }

  render() {
    if (!this.state.response) {
      const { key, secret } = this.state;
      return <div style={{maxWidth: '600px', margin: 'auto'}}>
        <div
          className="w3-section w3-container w3-center w3-padding-large
                     w3-theme-l1 w3-padding my-round">
          Warning: do not use this tool yet. It will work, but it is unsafe.
          Your credentials would be sent over the internet unencrypted.
        </div>
        <Panel padding={true}>
          <form onSubmit={this.authenticate}>
            <ul className="w3-ul w3-block w3-padding-16">
              <li>
                <LabeledRow label="Key">
                  <input
                    id="deribit-key" className="w3-input" value={key ? key : ''}
                    onChange={this.keyChanged}  autoComplete="username"
                  />
                </LabeledRow>
              </li>
              <li>
                <LabeledRow label="Secret">
                  <input
                    id="deribit-secret" type="password" className="w3-input"
                    value={secret ? secret : ''} onChange={this.secretChanged}
                    autoComplete="current-password"
                  />
                </LabeledRow>
              </li>
              <Row>
                <div className="w3-center">
                  <Button type="submit">Authenticate</Button>
                </div>
              </Row>
            </ul>
          </form>
        </Panel>
      </div>;
    } else {
      const { account_summary } = this.state;
      if (!account_summary) {
        return <Panel title="Loading..."/>;
      } else {
        return <div>
          <Bar>
            <BarButton type="button" onClick={this.logout}>
              Log out
            </BarButton>
            <BarButton type="button" onClick={this.cancelAll}>
              Cancel all
            </BarButton>
          </Bar>
          {
            React.cloneElement(
              React.Children.toArray(this.props.children)[0], {
                account_summary,
                apiCall:    this.apiCall,
                exchange:   'Deribit',
                instruments: ['BTC-PERPETUAL', 'BTC-26JUN20', 'BTC-25SEP20'],
                instrument: 'BTC-PERPETUAL',
                contract:   'inverse',
              }
            )
          }
        </div>;
      }
    }
  }
}

const Placement = {
  MANUAL:   0,
  DISTANCE: 1,
};

class Prices extends Component {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired,
    apiCall: func,
  };

  constructor(props) {
    super(props);

    this.placementChange = this.placementChange.bind(this);

    this.priceChange = this.priceChange.bind(this);
    this.addPrice = this.addPrice.bind(this);
    this.removePrice = this.removePrice.bind(this);

    this.centerChange = this.centerChange.bind(this);
    this.spacingChange = this.spacingChange.bind(this);
    this.amountChange = this.amountChange.bind(this);
  }

  placementChange(e) {
    this.doCallback({
      placement: parseInt(e.target.value),
    });
  }

  doCallback(newState) {
    const { cookies, prefix } = this.props;
    for (const key in newState) {
      setYearlyCookie(cookies, `${prefix}-${key}`, newState[key], '/trade');
    }
    this.props.callback({
      ...this.props.state,
      ...newState,
    });
  }

  // Placement.MANUAL methods

  manualCalc(prices) {
    const mean = mean_(prices.map(parseFloat)),
      min = Math.min(...prices),
      max = Math.max(...prices);
    return { prices, mean, min, max };
  }

  priceChange(e, i) {
    const { prices } = this.props.state;
    prices[i] = e.target.value;
    this.doCallback(this.manualCalc(prices));
  }

  addPrice() {
    const { prices } = this.props.state;
    prices.push(0);
    this.doCallback(this.manualCalc(prices));
  }

  removePrice() {
    const { prices } = this.props.state;
    if (prices.length > 1) {
      prices.pop();
      this.doCallback(this.manualCalc(prices));
    }
  }

  // Placement.DISTANCE methods

  distanceCalc(center, spacing, amount) {
    const half_dist = (amount - 1) * spacing / 2,
      mean = center,
      min = mean - half_dist,
      max = mean + half_dist,
      prices = [];
    for (let i = 0; i < amount; i++) {
      prices[i] = min + i * spacing;
    }
    return { prices, mean, min, max, center, spacing, amount };
  }

  centerChange(e) {
    const center = parseFloat(e.target.value),
      { spacing, amount } = this.props.state;
    this.doCallback(this.distanceCalc(center, spacing, amount));
  }

  spacingChange(e) {
    const spacing = parseFloat(e.target.value),
      { center, amount } = this.props.state;
    this.doCallback(this.distanceCalc(center, spacing, amount));
  }

  amountChange(e) {
    const amount = parseFloat(e.target.value),
      { center, spacing } = this.props.state;
    this.doCallback(this.distanceCalc(center, spacing, amount));
  }

  render() {
    const { placement, prices } = this.props.state;

    let input;
    switch (placement) {
      case Placement.MANUAL:
        input = <div>
          <button className="w3-button w3-theme-d3 w3-hover-theme" onClick={this.addPrice}>+</button>
          {' '}
          <button className="w3-button w3-theme-d3 w3-hover-theme" onClick={this.removePrice}>-</button>
          {' '}
          {
            prices.map((price, i) =>
              <input size="4" value={price} key={i} className="w3-input"
                     onChange={e => this.priceChange(e, i)}/>)
          }
        </div>;
        break;
      case Placement.DISTANCE:
        const { center, spacing, amount } = this.props.state;
        input = <div>
          <LabeledRow label="Center">
            <input
              className="w3-input" size="4" value={center}
              onChange={this.centerChange}
            />
          </LabeledRow>
          <LabeledRow label="Spacing">
            <input
              className="w3-input" size="4" value={spacing}
              onChange={this.spacingChange}
            />
          </LabeledRow>
          <LabeledRow label="Amount">
            <input
              className="w3-input" size="4" value={amount}
              onChange={this.amountChange}
            />
          </LabeledRow>
        </div>;
        break;
      default:
        input = <span>Something went wrong.</span>;
        break;
    }

    return <div>
      <select
        className="w3-select" onChange={this.placementChange}
        value={placement}
      >
        {
          Object.entries(Placement).map(([key, val]) =>
            <option key={key} value={val}>{key}</option>)
        }
      </select>
      {input}
    </div>;
  }
}

class Trade extends Component {
  static propTypes = {
    cookies:         instanceOf(Cookies).isRequired,
    account_summary: object,
    apiCall:         func,
  };

  constructor(props) {
    super(props);

    const { cookies, instrument } = this.props;
    this.state = {
      stop:   {
        placement: parseInt(cookies.get('stop-placement')) || Placement.MANUAL,
        prices:    cookies.get('stop-prices') || [0],
        center:    parseFloat(cookies.get('stop-center')) || 0,
        spacing:   parseFloat(cookies.get('stop-spacing')) || 5,
        amount:    parseFloat(cookies.get('stop-amount')) || 5,
        mean:      parseFloat(cookies.get('stop-mean')) || 0,
        min:       parseFloat(cookies.get('stop-min')) || 0,
        max:       parseFloat(cookies.get('stop-max')) || 0,
        enabled:   true,
      },
      entry:  {
        placement: parseInt(cookies.get('entry-placement')) || Placement.DISTANCE,
        prices:    cookies.get('entry-prices') || [0],
        center:    parseFloat(cookies.get('entry-center')) || 0,
        spacing:   parseFloat(cookies.get('entry-spacing')) || 5,
        amount:    parseFloat(cookies.get('entry-amount')) || 5,
        mean:      parseFloat(cookies.get('entry-mean')) || 0,
        min:       parseFloat(cookies.get('entry-min')) || 0,
        max:       parseFloat(cookies.get('entry-max')) || 0,
        enabled:   true,
      },
      profit: {
        placement: parseInt(cookies.get('profit-placement')) || Placement.DISTANCE,
        prices:    cookies.get('profit-prices') || [0],
        center:    parseFloat(cookies.get('profit-center')) || 0,
        spacing:   parseFloat(cookies.get('profit-spacing')) || 5,
        amount:    parseFloat(cookies.get('profit-amount')) || 5,
        mean:      parseFloat(cookies.get('profit-mean')) || 0,
        min:       parseFloat(cookies.get('profit-min')) || 0,
        max:       parseFloat(cookies.get('profit-max')) || 0,
        enabled:   (cookies.get('profit-enabled') === 'true') !== false,
      },
      risk:       parseFloat(cookies.get('risk')) || 0.01,
      instrument: cookies.get('instrument') || instrument,
    };

    const { stop, entry, profit } = this.state;
    stop.prices = stop.prices.map(parseFloat);
    entry.prices = entry.prices.map(parseFloat);
    profit.prices = profit.prices.map(parseFloat);

    this.bind();
  }

  bind() {
    this.toggleProfit = this.toggleProfit.bind(this);
    this.riskChanged = this.riskChanged.bind(this);
    this.instrumentChanged = this.instrumentChanged.bind(this);
    this.order = this.order.bind(this);
  }

  setCookie(key, value) {
    setYearlyCookie(this.props.cookies, key, value, '/trade');
  }

  toggleProfit(e) {
    const enabled = e.target.checked;
    this.setCookie('profit-enabled', enabled);
    this.setState({ profit: { ...this.state.profit, enabled } });
  }

  riskChanged(e) {
    const risk = parseFloat(e.target.value);
    this.setCookie('risk', risk);
    this.setState({ risk });
  }

  instrumentChanged(e) {
    const instrument = e.target.value;
    this.setCookie('instrument', instrument);
    this.setState({ instrument });
  }

  isLong() {
    const { entry, stop } = this.state;
    return entry.mean > stop.mean;
  }

  computeQuantity() {
    const { entry, stop, risk } = this.state;
    // const { profit } = this.state;
    const { equity } = this.props.account_summary;

    // todo assuming inverse contracts
    const ds = Math.abs(1 / entry.mean - 1 / stop.mean);
    // const dp = Math.abs(1 / entry.mean - 1 / profit.mean);

    // todo assuming Deribit's rules for rounding quantity
    // todo assuming no TP - if I do place a TP I better have a bit of time
    return round_to(equity * risk / ds, -1,
                    10 * lcm(entry.prices.length, stop.prices.length));
  }

  log() {
    const { risk, instrument } = this.state,
      entry = this.state.entry.prices,
      stop = this.state.stop.prices,
      profit = this.state.profit.prices,
      quantity = this.computeQuantity(),
      position = this.isLong() ? 'long' : 'short',
      { exchange, contract } = this.props;
    return fetch(`${DATA_URI}/trades/add`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        exchange, instrument, entry, stop, profit, risk,
        quantity, position, contract
      }),
    });
  }

  order(e) {
    e.preventDefault();

    this.log().then(r => r.json()).then(result => {
      console.log('Added trade to DB.');

      const label = result['_id'],
        { stop, entry, profit, instrument } = this.state,
        { apiCall } = this.props,
        common = {
          instrument_name: instrument,
        },
        buyMethod = '/private/buy',
        sellMethod = '/private/sell',
        isLong = this.isLong(),
        entryMethod = isLong ? buyMethod : sellMethod,
        exitMethod = isLong ? sellMethod : buyMethod,
        quantity = this.computeQuantity();

      const entryQuantity = quantity / entry.prices.length;
      for (let i = 0; i < entry.prices.length; i++) {
        apiCall(entryMethod, {
          ...common,
          amount:    entryQuantity,
          price:     entry.prices[i],
          post_only: true,
          label:     `${label}-entry-${i}`,
        }, true).then(console.log);
      }

      const stopQuantity = quantity / stop.prices.length;
      for (let i = 0; i < stop.prices.length; i++) {
        apiCall(exitMethod, {
          ...common,
          amount:      stopQuantity,
          stop_price:  stop.prices[i],
          type:        'stop_market',
          trigger:     'last_price',
          reduce_only: true,
          label:       `${label}-stop-${i}`,
        }, true).then(console.log);
      }

      if (profit.enabled) {
        const profitQuantity = quantity / profit.prices.length;
        for (let i = 0; i < profit.prices.length; i++) {
          apiCall(exitMethod, {
            ...common,
            amount:    profitQuantity,
            price:     profit.prices[i],
            post_only: true,
            label:     `${label}-profit-${i}`,
          }, true).then(console.log);
        }
      }
    });
  }

  componentDidMount() {
    document.title = 'Trade';
  }

  render() {
    const { entry, stop, profit, risk, instrument } = this.state;
    const { cookies, account_summary, instruments } = this.props;
    return <div className="w3-container">
      <div
        className="w3-card w3-center w3-theme-l1 w3-padding w3-section my-round"
      >
        You are kindly advised to <b>log out</b> after usage.
      </div>
      <div className="w3-cell-row">
        <div className="w3-cell">
          <form className="w3-content w3-theme-dark">
            <LabeledRow label="Equity">
              <div className="my-cell w3-cell-middle">
                {
                  account_summary
                    ? <span><Bitcoin/> {account_summary['equity']}</span>
                    : 'Warning: account summary undefined.'
                }
              </div>
            </LabeledRow>
            <LabeledRow label="Instrument">
              <select
                className="w3-select" onChange={this.instrumentChanged}
                value={instrument}
              >
                {
                  instruments.map((instrument, i) => 
                    <option value={instrument} key={i}>{instrument}</option>
                  )
                }
              </select>
            </LabeledRow>
            <LabeledRow label="Stop" verticalAlign="w3-cell-top">
              <Prices state={stop} cookies={cookies} prefix="stop"
                      callback={stop => this.setState({ stop })}/>
            </LabeledRow>
            <LabeledRow label="Entry" verticalAlign="w3-cell-top">
              <Prices state={entry} cookies={cookies} prefix="entry"
                      callback={entry => this.setState({ entry })}/>
            </LabeledRow>
            <LabeledRow label="Profit" verticalAlign="w3-cell-top">
              <div className="my-cell w3-cell-middle">
                <input type="checkbox" checked={profit.enabled}
                        onChange={this.toggleProfit} id="enable-profit"/> Enabled
              </div>
              <Prices state={profit} cookies={cookies} prefix="profit"
                      callback={profit => this.setState({ profit })}/>
            </LabeledRow>
            <LabeledRow label="Risk">
              <input type="number" step="0.001" id="risk" className="w3-input"
                      value={risk} onChange={this.riskChanged}/>
            </LabeledRow>
            <Row>
              <div className="w3-section">
                <OrderButton isLong={this.isLong()} onClick={this.order}/>
              </div>
            </Row>
          </form>
        </div>
        <div className="w3-cell">
          <Panel padding={true}>
            <LabeledRow label="Quantity">
              {this.computeQuantity().toString()}
            </LabeledRow>
          </Panel>
          <Panel title="Overview" padding={true}>
            <div className="row">
              <div className="left-column"></div>
              <div className="left-column">Stop</div>
              <div className="left-column">Entry</div>
              <div className="left-column">Profit</div>
            </div>
            <div className="row">
              <div className="left-column">Lowest</div>
              <div className="left-column">{stop.min}</div>
              <div className="left-column">{entry.min}</div>
              <div className="left-column">{profit.min}</div>
            </div>
            <div className="row">
              <div className="left-column">Average</div>
              <div className="left-column">{stop.mean}</div>
              <div className="left-column">{entry.mean}</div>
              <div className="left-column">{profit.mean}</div>
            </div>
            <div className="row">
              <div className="left-column">Highest</div>
              <div className="left-column">{stop.max}</div>
              <div className="left-column">{entry.max}</div>
              <div className="left-column">{profit.max}</div>
            </div>
          </Panel>
        </div>
      </div>
    </div>;
  }
}

function OrderButton(props) {
  const { isLong, onClick } = props;
  const color = isLong ? 'w3-green' : 'w3-red';
  const text = isLong ? 'Long' : 'Short';
  const _class = `w3-card w3-button w3-block w3-xlarge`
               + ` w3-section ${color} my-round`;
  return <button className={_class} onClick={onClick}>
    {text}
  </button>;
}

export default withCookies(function DeribitTrade(props) {
  return <Deribit cookies={props.cookies}>
    <Trade cookies={props.cookies}/>
  </Deribit>;
});
