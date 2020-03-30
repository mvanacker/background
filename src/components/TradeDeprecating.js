import React, { Component } from 'react';
import { DATA_SERVER_URL, REFRESH_RATE } from './config';
import { instanceOf } from "prop-types";
import { withCookies, Cookies } from "react-cookie";
import { round_to, mean, lcm } from './util.math';
import { dump_params } from "./util.web";

const EntryPlacement = {
  MANUAL:   0,
  DISTANCE: 1,
};

class TradeDeprecating extends Component {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired
  };

  constructor(props) {
    super(props);

    const { cookies } = this.props;
    this.state = {
      // "temporarily" hard-coded variables
      exchange:   'Deribit',
      api:        'https://www.deribit.com/api/v2',
      // api:        'https://test.deribit.com/api/v2',
      instrument: 'BTC-PERPEsTUAL',

      // polled value
      available_funds: undefined,

      // authentication
      deribit_key:      cookies.get('deribit_key') || undefined,
      deribit_secret:   cookies.get('deribit_secret') || undefined,
      deribit_response: undefined,

      // input through form
      entry_placement: parseFloat(cookies.get('entry_placement')) || EntryPlacement.DISTANCE,
      entry:           cookies.get('entry') || [0, 0, 0],
      entry_mean:      parseFloat(cookies.get('entry_mean')) || 0,
      entry_distance:  parseFloat(cookies.get('entry_distance')) || 10,
      entry_amount:    parseInt(cookies.get('entry_amount')) || 11,
      include_stop:    cookies.get('include_stop') || false,
      stop:            parseFloat(cookies.get('stop')) || 0,
      include_profit:  cookies.get('include_profit') || false,
      profit:          cookies.get('profit') || [0],
      risk:            parseFloat(cookies.get('risk')) || 0.01,
      position:        cookies.get('position') || 'long',
      contract:        cookies.get('contract') || 'inverse',
    };

    this.state.entry = this.state.entry.map(parseFloat);
    this.state.profit = this.state.profit.map(parseFloat);

    const { entry_distance, entry_amount } = this.state;
    this.state.entry_half_distance = this.compute_half_total_distance(entry_distance, entry_amount);

    this.doBinds();
  }

  doBinds() {
    this.keyChangeHandler = this.keyChangeHandler.bind(this);
    this.secretChangeHandler = this.secretChangeHandler.bind(this);
    this.authenticate = this.authenticate.bind(this);

    this.entryPlacementChangeHandler = this.entryPlacementChangeHandler.bind(this);

    this.entryMeanChangeHandler = this.entryMeanChangeHandler.bind(this);
    this.entryDistanceChangeHandler = this.entryDistanceChangeHandler.bind(this);
    this.entryAmountChangeHandler = this.entryAmountChangeHandler.bind(this);

    this.entryChangeHandler = this.entryChangeHandler.bind(this);
    this.addEntryClickHandler = this.addEntryClickHandler.bind(this);
    this.removeEntryClickHandler = this.removeEntryClickHandler.bind(this);

    this.includeStopChangeHandler = this.includeStopChangeHandler.bind(this);
    this.stopChangeHandler = this.stopChangeHandler.bind(this);

    this.includeProfitChangeHandler = this.includeProfitChangeHandler.bind(this);
    this.profitChangeHandler = this.profitChangeHandler.bind(this);
    this.addProfitClickHandler = this.addProfitClickHandler.bind(this);
    this.removeProfitClickHandler = this.removeProfitClickHandler.bind(this);

    this.riskChangeHandler = this.riskChangeHandler.bind(this);

    this.positionChangeHandler = this.positionChangeHandler.bind(this);
    this.contractChangeHandler = this.contractChangeHandler.bind(this);

    this.logout = this.logout.bind(this);

    this.order = this.order.bind(this);
  }

  componentDidMount() {
    // set title
    document.title = 'Trade';

    // auto-authenticate
    if (this.state.deribit_key && this.state.deribit_secret) {
      this.authenticate();
    }
  }

  keyChangeHandler(e) {
    this.props.cookies.set('deribit_key', e.target.value, { path: '/' });
    this.setState({ deribit_key: e.target.value });
  }

  secretChangeHandler(e) {
    this.props.cookies.set('deribit_secret', e.target.value, { path: '/' });
    this.setState({ deribit_secret: e.target.value });
  }

  entryPlacementChangeHandler(e) {
    this.props.cookies.set('entry_placement', e.target.value, { path: '/' });
    this.setState({ entry_placement: parseFloat(e.target.value) });
  }

  entryMeanChangeHandler(e) {
    this.props.cookies.set('entry_mean', e.target.value, { path: '/' });
    this.setState({ entry_mean: parseFloat(e.target.value) });
  }

  compute_half_total_distance(entry_distance, entry_amount) {
    return entry_distance * (
      entry_amount % 2 === 1
        ? Math.trunc(entry_amount / 2)
        : (entry_amount + entry_distance) / 2
    );
  }

  entryDistanceChangeHandler(e) {
    this.props.cookies.set('entry_distance', e.target.value, { path: '/' });
    const entry_distance = parseFloat(e.target.value);
    const entry_half_distance = this.compute_half_total_distance(entry_distance, this.state.entry_amount);
    this.setState({ entry_distance, entry_half_distance });
  }

  entryAmountChangeHandler(e) {
    this.props.cookies.set('entry_amount', e.target.value, { path: '/' });
    const entry_amount = parseInt(e.target.value);
    const entry_half_distance = this.compute_half_total_distance(this.state.entry_distance, entry_amount);
    this.setState({ entry_amount, entry_half_distance });
  }

  saveEntry(entry) {
    this.props.cookies.set('entry', entry, { path: '/' });
    this.setState({ entry });
  }

  entryChangeHandler(e, i) {
    const { entry } = this.state;
    entry[i] = parseFloat(e.target.value);
    this.saveEntry(entry);
  }

  addEntryClickHandler(e) {
    const { entry } = this.state;
    entry.push(0);
    this.saveEntry(entry);
  }

  removeEntryClickHandler(e) {
    const { entry } = this.state;
    entry.pop();
    this.saveEntry(entry);
  }

  includeStopChangeHandler(e) {
    this.props.cookies.set('include_stop', e.target.checked, { path: '/' });
    this.setState({ include_stop: e.target.checked });
  }

  stopChangeHandler(e) {
    this.props.cookies.set('stop', e.target.value, { path: '/' });
    this.setState({ stop: parseFloat(e.target.value) });
  }

  saveProfit(profit) {
    this.props.cookies.set('profit', profit, { path: '/' });
    this.setState({ profit });
  }

  includeProfitChangeHandler(e) {
    this.props.cookies.set('include_profit', e.target.checked, { path: '/' });
    this.setState({ include_profit: e.target.checked });
  }

  profitChangeHandler(e, i) {
    const { profit } = this.state;
    profit[i] = parseFloat(e.target.value);
    this.saveProfit(profit);
  }

  addProfitClickHandler(e) {
    const { profit } = this.state;
    profit.push(0);
    this.saveProfit(profit);
  }

  removeProfitClickHandler(e) {
    const { profit } = this.state;
    profit.pop();
    this.saveProfit(profit);
  }

  riskChangeHandler(e) {
    this.props.cookies.set('risk', e.target.value, { path: '/' });
    this.setState({ risk: parseFloat(e.target.value) });
  }

  positionChangeHandler(e) {
    this.props.cookies.set('position', e.target.value, { path: '/' });
    this.setState({ position: e.target.value });
  }

  contractChangeHandler(e) {
    this.props.cookies.set('contract', e.target.value, { path: '/' });
    this.setState({ contract: e.target.value });
  }

  deribit_call(method, params, auth = false) {
    params = dump_params(params);
    const uri = encodeURI(`${this.state.api}${method}?${params}`);
    let fetch_;
    if (!auth) {
      fetch_ = fetch(uri);
    } else {
      const make_auth_header = () => {
        const token = this.state.deribit_response['access_token'];
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

  authenticate(e) {
    if (e) {
      e.preventDefault();
    }

    return this.deribit_call('/public/auth', {
      client_id:     this.state.deribit_key,
      client_secret: this.state.deribit_secret,
      grant_type:    'client_credentials',
    })
    .then(result => {

      if (result) {
        console.log(result);

        // cancel current polling on subsequent passes
        if (this.updateInterval) {
          this.stop_polling();
        }

        // start polling
        this.start_polling();

        // update state
        this.setState({ deribit_response: result });
      } else {
        console.log('Warning: automatic login failed.');
      }

      return result;
    });
  }

  start_polling() {
    this.updateInterval = setInterval(() => {
      Promise.all([
        this.deribit_call(
          '/private/get_account_summary',
          { currency: 'BTC' },
          true
        ),
      ])
      .then(result => {
        const [account_summary] = result;

        this.setState({
          available_funds: account_summary['available_funds'],
        })
      });
    }, REFRESH_RATE);
  }

  stop_polling() {
    clearInterval(this.updateInterval);
  }

  componentWillUnmount() {
    this.stop_polling();
  }

  is_input_valid() {
    const {
      entry_placement, entry_mean, entry_half_distance, entry, include_stop,
      stop, include_profit, profit, available_funds, risk, position, contract
    } = this.state;

    const min_profit = Math.min(...profit);
    const max_profit = Math.max(...profit);
    let min_entry, max_entry;
    switch (entry_placement) {
      case EntryPlacement.MANUAL:
        min_entry = Math.min(...entry);
        max_entry = Math.max(...entry);
        break;
      case EntryPlacement.DISTANCE:
        min_entry = entry_mean - entry_half_distance;
        max_entry = entry_mean + entry_half_distance;
        break;
      default:
        return false;
    }

    return entry.length && available_funds && risk && position && contract
           && (!include_stop || stop)
           && (!include_profit || profit.length)
           && ((position === 'long'
                && (!include_profit || min_profit >= max_entry)
                && (!include_stop || min_entry >= stop))
               || (position === 'short'
                   && (!include_profit || min_entry >= max_profit)
                   && (!include_stop || stop >= max_entry)));
  }

  compute() {
    if (this.is_input_valid()) {
      let { entry_placement, entry_mean, entry_amount, entry, stop, profit, available_funds, risk, contract } = this.state;
      if (entry_placement === EntryPlacement.MANUAL) {
        entry_mean = mean(this.state.entry);
        entry_amount = entry.length;
      }
      const profit_mean = mean(this.state.profit);
      const ds = Math.abs(contract === 'linear' ? stop - entry_mean : 1 / entry_mean - 1 / stop);
      const dp = Math.abs(contract === 'linear' ? profit_mean - entry_mean : 1 / entry_mean - 1 / profit_mean);
      const quantity = round_to(available_funds * risk / ds, -1, 10 * lcm(entry_amount, profit.length));
      const max_loss = round_to(quantity * ds, 8);
      const rel_max_loss = max_loss / available_funds;
      const max_profit = round_to(quantity * dp, 8);
      const rel_max_profit = max_profit / available_funds;
      const risk_reward = `1 : ${round_to(max_profit / max_loss, 2)}`;
      return { entry_mean, profit_mean, quantity, max_loss, rel_max_loss, max_profit, rel_max_profit, risk_reward };
    }
  }

  order(e) {
    e.preventDefault();

    // log trade to local database
    const {
        exchange, instrument, entry_placement, entry_mean, entry_distance,
        entry_amount, entry, entry_half_distance, profit, risk, position, contract
      } = this.state,
      stop = [this.state.stop],
      quantity = this.compute().quantity;

    // todo ugly workaround here
    if (entry_placement === EntryPlacement.DISTANCE) {
      entry.length = 0;
      for (let i = 0; i < entry_amount; i++) {
        entry.push(entry_mean - entry_half_distance + i * entry_distance);
      }
    }

    fetch(`${DATA_SERVER_URL}/trades/add`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        exchange, instrument, entry, stop,
        profit, risk, quantity, position, contract
      }),
    })
    .then(r => r.json())

    // place orders on exchange
    .then(result => {
      console.log('Added trade to DB.');
      const label = result['_id'];

      const {
        instrument, position, entry_placement, entry_mean, entry_half_distance,
        entry_distance, entry_amount, entry, include_stop, stop, include_profit,
        profit
      } = this.state;

      const entry_method = position === 'long' ? '/private/buy' : '/private/sell';
      const exit_method = position === 'long' ? '/private/sell' : '/private/buy';
      const profit_quantity = Math.round(quantity / profit.length);

      // entries
      const entry_calls = [];
      switch (entry_placement) {
        case EntryPlacement.MANUAL: {
          const entry_quantity = Math.round(quantity / entry.length);
          for (let i = 0; i < entry.length; i++) {
            entry_calls.push(this.deribit_call(entry_method, {
              amount:          entry_quantity,
              instrument_name: instrument,
              price:           entry[i],
              post_only:       true,
              label:           `${label}-entry-${i}`
            }, true));
          }
        }
          break;
        case EntryPlacement.DISTANCE: {
          const entry_quantity = Math.round(quantity / entry_amount);
          for (let i = 0; i < entry_amount; i++) {
            const price = entry_mean - entry_half_distance + i * entry_distance;
            entry_calls.push(this.deribit_call(entry_method, {
              amount:          entry_quantity,
              instrument_name: instrument,
              price:           price,
              post_only:       true,
              label:           `${label}-entry-${i}`
            }, true));
          }
        }
          break;
        default:
          return;
      }

      const stop_calls = [];
      if (include_stop) {
        stop_calls.push(this.deribit_call(exit_method, {
          amount:          quantity,
          instrument_name: instrument,
          stop_price:      stop,
          type:            'stop_market',
          trigger:         'last_price',
          reduce_only:     true,
          label:           `${label}-stop-0`
        }, true));
      }

      // profits
      const profit_calls = [];
      if (include_profit) {
        for (let i = 0; i < profit.length; i++) {
          profit_calls.push(this.deribit_call(exit_method, {
            amount:          profit_quantity,
            instrument_name: instrument,
            price:           profit[i],
            post_only:       true,
            label:           `${label}-profit-${i}`
          }, true));
        }
      }

      Promise.all([...entry_calls, ...stop_calls, ...profit_calls])
      .then(results => results.forEach(console.table));
    });
  }

  logout() {
    this.stop_polling();
    this.setState({ deribit_response: undefined });
  }

  render() {
    if (!this.state.deribit_response) {
      const { deribit_key, deribit_secret } = this.state;
      return (
        <div>
          <form onSubmit={this.authenticate}>
            <p>
              <label htmlFor="deribit-key">Key</label>{' '}
              <input id="deribit-key"
                     value={deribit_key ? deribit_key : ''}
                     onChange={this.keyChangeHandler}/>
            </p>
            <p>
              <label htmlFor="deribit-secret">Secret</label>{' '}
              <input id="deribit-secret" type="password"
                     value={deribit_secret ? deribit_secret : ''}
                     onChange={this.secretChangeHandler}/>
            </p>
            <input type="submit" value="Authenticate"/>
          </form>
        </div>
      );
    } else {
      if (!this.state.available_funds) {
        return (<span>Loading...</span>);
      } else {
        const {
          entry_placement, entry_mean, entry_distance, entry_amount,
          entry, include_stop, stop, include_profit, profit, risk, position
        } = this.state;
        const results = this.compute();
        return (
          <div>
            <button id="logout" type="button" onClick={this.logout}>
              Log out
            </button>
            <form onSubmit={this.order}>
              <table id="order">
                <tbody>
                <tr>
                  <td colSpan={2}>
                    <h1>Inputs</h1>
                  </td>
                </tr>
                {/*<tr>*/}
                {/*  <td>Instrument</td>*/}
                {/*  <td>{this.state.instrument}</td>*/}
                {/*</tr>*/}
                <tr>
                  <td>Available</td>
                  <td>{this.state.available_funds}</td>
                </tr>
                <tr>
                  <td>
                    <input type="checkbox" id="include-stop" checked={include_stop}
                           onChange={this.includeStopChangeHandler}/>{' '}
                    <label htmlFor="stop">Stop</label>
                  </td>
                  <td>
                    <input id="stop" size="4"
                           onChange={this.stopChangeHandler}
                           value={stop >= 0 ? stop : ''}/>
                  </td>
                </tr>
                <tr>
                  <td rowSpan={2}>
                    <label htmlFor="entry">Entry</label>
                    {
                      entry_placement !== EntryPlacement.MANUAL ? '' : (
                        <small style={{ 'fontFamily': 'consolas', 'fontSize': '0.6em', 'marginLeft': '7px' }}>
                          <a className="proxy-button" onClick={this.addEntryClickHandler}
                             href="javascript:">(+)</a>{' '}
                          <a className="proxy-button" onClick={this.removeEntryClickHandler} href="javascript:">(-)</a>
                        </small>
                      )
                    }
                  </td>
                  <td>
                    <select onChange={this.entryPlacementChangeHandler} value={entry_placement}>
                      {
                        Object.entries(EntryPlacement).map(([key, val]) =>
                          <option key={key} value={val}>{key}</option>
                        )
                      }
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>
                    {
                      entry_placement === EntryPlacement.MANUAL ?
                        entry.map((foo, i) =>
                          <input key={i} id={`entry${i > 0 ? i : ''}`} size="4"
                                 onChange={e => this.entryChangeHandler(e, i)}
                                 value={foo}/>
                        )
                        : entry_placement === EntryPlacement.DISTANCE ? (
                          <table>
                            <tbody>
                            <tr>
                              <td>Mean</td>
                              <td>
                                <input size="4" value={entry_mean}
                                       onChange={this.entryMeanChangeHandler}/>
                              </td>
                            </tr>
                            <tr>
                              <td>Distance</td>
                              <td>
                                <input size="4" value={entry_distance}
                                       onChange={this.entryDistanceChangeHandler}/>
                              </td>
                            </tr>
                            <tr>
                              <td>Amount</td>
                              <td>
                                <input size="4" value={entry_amount}
                                       onChange={this.entryAmountChangeHandler}/>
                              </td>
                            </tr>
                            </tbody>
                          </table>
                        )
                        : 'Something went wrong.'
                    }
                  </td>
                </tr>
                <tr>
                  <td>
                    <input type="checkbox" id="include-profit" checked={include_profit}
                           onChange={this.includeProfitChangeHandler}/>{' '}
                    <label htmlFor="profit">Profit</label>
                    <small style={{ 'fontFamily': 'consolas', 'fontSize': '0.6em', 'marginLeft': '7px' }}>
                      <a className="proxy-button" onClick={this.addProfitClickHandler} href="javascript:;">(+)</a>{' '}
                      <a className="proxy-button" onClick={this.removeProfitClickHandler} href="javascript:;">(-)</a>
                    </small>
                  </td>
                  <td>
                    {
                      profit.map((foo, i) =>
                        <input key={i} id={`profit${i > 0 ? i : ''}`} size="4"
                               onChange={e => this.profitChangeHandler(e, i)}
                               value={foo}/>
                      )
                    }
                  </td>
                </tr>
                <tr>
                  <td><label htmlFor="risk">Risk</label></td>
                  <td>
                    <input id="risk" type="number" step="0.001"
                           style={{ width: '55px' }}
                           onChange={this.riskChangeHandler}
                           value={risk ? risk : ''}/>
                  </td>
                </tr>
                <tr>
                  <td rowSpan={2}><label htmlFor="position">Position</label></td>
                  <td>
                    <input type="radio" name="position" id="long" value="long"
                           onChange={this.positionChangeHandler}
                           checked={position === 'long'}/>{' '}
                    <label htmlFor="long">Long</label>
                  </td>
                </tr>
                <tr>
                  <td>
                    <input type="radio" name="position" id="short" value="short"
                           onChange={this.positionChangeHandler}
                           checked={position === 'short'}/>{' '}
                    <label htmlFor="short">Short</label>
                  </td>
                </tr>
                {/*<tr>*/}
                {/*  <td rowSpan={2}><label htmlFor="contract">Contract</label></td>*/}
                {/*  <td>*/}
                {/*    <input type="radio" name="contract" id="linear" value="linear"*/}
                {/*           onChange={this.contractChangeHandler}*/}
                {/*           checked={this.state.contract === 'linear'}/>{' '}*/}
                {/*    <label htmlFor="linear">Linear</label>*/}
                {/*  </td>*/}
                {/*</tr>*/}
                {/*<tr>*/}
                {/*  <td>*/}
                {/*    <input type="radio" name="contract" id="inverse" value="inverse"*/}
                {/*           onChange={this.contractChangeHandler}*/}
                {/*           checked={this.state.contract === 'inverse'}/>{' '}*/}
                {/*    <label htmlFor="inverse">Inverse</label>*/}
                {/*  </td>*/}
                {/*</tr>*/}
                </tbody>
              </table>
              {
                !results ? <p><i>Enter valid inputs to obtain results.</i></p> : (
                  <div>
                    <table id="results">
                      <tbody>
                      <tr>
                        <td colSpan={2}>
                          <h1>Results</h1>
                        </td>
                      </tr>
                      <tr>
                        <td>Quantity</td>
                        <td>{results.quantity}</td>
                      </tr>
                      <tr>
                        <td>Max loss</td>
                        <td>{results.max_loss} ({round_to(results.rel_max_loss * 100, 1)}%)</td>
                      </tr>
                      <tr>
                        <td>Max profit</td>
                        <td>{results.max_profit} ({round_to(results.rel_max_profit * 100, 1)}%)</td>
                      </tr>
                      <tr>
                        <td>Risk-reward</td>
                        <td>{results.risk_reward}</td>
                      </tr>
                      {/*<tr>*/}
                      {/*  <td>Volatility</td>*/}
                      {/*  <td>&lt;todo&gt;</td>*/}
                      {/*</tr>*/}
                      {/*<tr>*/}
                      {/*  <td>Timeframe</td>*/}
                      {/*  <td>&lt;input here&gt;</td>*/}
                      {/*</tr>*/}
                      <tr>
                        <td>Mean entry</td>
                        <td>{results.entry_mean}</td>
                      </tr>
                      {/*<tr>*/}
                      {/*  <td>Entry hit rate</td>*/}
                      {/*  <td>&lt;coming soon&gt;</td>*/}
                      {/*</tr>*/}
                      <tr>
                        <td>Mean profit</td>
                        <td>{results.profit_mean}</td>
                      </tr>
                      {/*<tr>*/}
                      {/*  <td>Profit hit rate</td>*/}
                      {/*  <td>&lt;coming soon&gt;</td>*/}
                      {/*</tr>*/}
                      {/*<tr>*/}
                      {/*  <td>Success rate</td>*/}
                      {/*  <td>&lt;entry hit rate * profit hit rate?&gt;</td>*/}
                      {/*</tr>*/}
                      </tbody>
                    </table>
                    <p>{include_profit ? '' : <small> Warning: you are not placing a profit order.</small>}</p>
                    <p>{include_stop ? '' : <small> Warning: you are not placing a stop order.</small>}</p>
                    <p><input type="submit" value="Place orders"/></p>
                  </div>
                )
              }
            </form>
          </div>
        );
      }
    }
  }
}

export default withCookies(TradeDeprecating);
