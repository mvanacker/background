import React, { Component } from 'react';
import { DATA_URI, REFRESH_RATE } from "../config";
import { instanceOf } from "prop-types";
import { Cookies, withCookies } from "react-cookie";
import { round_to } from '../../util/math';
import { compute_probs, compute_reverse } from "../../util/math.bs";

class Probs extends Component {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired
  };

  constructor(props) {
    super(props);

    const { cookies } = this.props;
    const bool_from_cookie = name => {
      const value = cookies.get(name);
      return value === undefined ? true : value.toLowerCase() === 'true';
    };
    this.state = {
      price:           parseFloat(cookies.get('price')) || 0,
      auto_price:      bool_from_cookie('auto_price'),
      volatility:      parseFloat(cookies.get('volatility')) || 1,
      auto_volatility: bool_from_cookie('auto_volatility'),
      target:          parseFloat(cookies.get('target')) || 10000,
      days:            parseFloat(cookies.get('days')) || 0,
      hours:           parseFloat(cookies.get('hours')) || 12,
    };

    this.autoPriceChangeHandler = this.autoPriceChangeHandler.bind(this);
    this.autoVolatilityChangeHandler = this.autoVolatilityChangeHandler.bind(this);
    this.priceChangeHandler = this.priceChangeHandler.bind(this);
    this.volatilityChangeHandler = this.volatilityChangeHandler.bind(this);
    this.targetChangeHandler = this.targetChangeHandler.bind(this);
    this.daysChangeHandler = this.daysChangeHandler.bind(this);
    this.hoursChangeHandler = this.hoursChangeHandler.bind(this);
  }

  componentDidMount() {
    // set title
    document.title = 'Probs';

    // fetch price and volatility every second
    // todo not actually fetch if autofetch is turned off
    this.updateInterval = setInterval(() => {
      Promise.all([
        fetch(`${DATA_URI}/data/price.txt`)
        .then(response => response.text()),
        fetch(`${DATA_URI}/data/historical-volatility.txt`)
        .then(response => response.text()),
      ])
      .then(result => {
        let [price, volatility] = result;
        price = parseInt(price);
        volatility = round_to(parseFloat(volatility) / 100, 4);
        if (this.state.auto_price && this.state.auto_volatility) {
          this.setState({ price: price, volatility: volatility });
        } else if (this.state.auto_price) {
          this.setState({ price: price });
        } else if (this.state.auto_volatility) {
          this.setState({ volatility: volatility });
        }
      });
    }, REFRESH_RATE);
  }

  componentWillUnmount() {
    clearInterval(this.updateInterval);
  }

  autoPriceChangeHandler(e) {
    this.props.cookies.set('auto_price', e.target.checked, { path: '/' });
    this.setState({ auto_price: e.target.checked });
  }

  autoVolatilityChangeHandler(e) {
    this.props.cookies.set('auto_volatility', e.target.checked, { path: '/' });
    this.setState({ auto_volatility: e.target.checked });
  }

  priceChangeHandler(e) {
    this.props.cookies.set('price', e.target.value, { path: '/' });
    this.setState({ price: parseFloat(e.target.value) });
  }

  volatilityChangeHandler(e) {
    this.props.cookies.set('volatility', e.target.value, { path: '/' });
    this.setState({ volatility: parseFloat(e.target.value) });
  }

  targetChangeHandler(e) {
    this.props.cookies.set('target', e.target.value, { path: '/' });
    this.setState({ target: parseFloat(e.target.value) });
  }

  daysChangeHandler(e) {
    this.props.cookies.set('days', e.target.value, { path: '/' });
    this.setState({ days: parseFloat(e.target.value) });
  }

  hoursChangeHandler(e) {
    this.props.cookies.set('hours', e.target.value, { path: '/' });
    this.setState({ hours: parseFloat(e.target.value) });
  }

  render() {
    const { price } = this.state;
    if (false) {//(!price) { // todo unhack
      return (<span>Loading...</span>);
    } else {

      const {
        days, hours, target, volatility, auto_price, auto_volatility
      } = this.state;

      // Convert days and hours to years
      let time = (days ? days : 0) / 365 + (hours ? hours : 0) / (24 * 365);

      // technical computations
      let probs, rev_itm, rev_touch, direction;
      if (time > 0 && target && volatility) {
        probs = compute_probs(price, target, volatility, time);
        rev_itm = compute_reverse(probs.prob_itm / 2, target, volatility, time);
        rev_touch = compute_reverse(probs.prob_touch, target, volatility, time);
        direction = target > price ? 'above' : target < price ? 'below' : 'at';
      }

      // rendering
      return (
        <div className="w3-container">
          <h1>Settings</h1>
          <p>
            <input id="auto-price" type="checkbox"
                   onChange={this.autoPriceChangeHandler}
                   checked={auto_price}/>{' '}
            <label htmlFor="auto-price">automatically fetch price</label>
          </p>
          <p>
            <input id="auto-volatility" type="checkbox"
                   onChange={this.autoVolatilityChangeHandler}
                   checked={auto_volatility}/>{' '}
            <label htmlFor="auto-volatility">
              automatically fetch volatility
            </label>
          </p>
          <h1>Inputs</h1>
          {
            auto_price
              ? <p>Initial price {price.toLocaleString()} (BitMEX)</p>
              : <p>
                <label htmlFor="price">Initial price</label>{' '}
                <input id="price" size="2" onChange={this.priceChangeHandler}
                       value={price ? price : ''}/>
              </p>
          }
          {
            auto_volatility
              ? <p>Volatility {volatility} (Deribit, 15-day annualized)</p>
              : <p>
                <label htmlFor="volatility">Volatility</label>{' '}
                <input id="volatility" size="4"
                       onChange={this.volatilityChangeHandler}
                       value={volatility ? volatility : ''}/>
              </p>
          }
          <p>
            <label htmlFor="target">Target price</label>{' '}
            <input id="target" onChange={this.targetChangeHandler} size="3"
                   value={target ? target : ''}/>
          </p>
          <p>
            Within{' '}
            <input id="days" onChange={this.daysChangeHandler} size="1"
                   value={days ? days : 0}/>{' '}
            days and{' '}
            <input id="hours" size="1" onChange={this.hoursChangeHandler}
                   value={hours ? hours : 0}/>{' '}
            hours
          </p>
          {
            !probs ? '' : (
              <div>
                <h1>Results</h1>
                <p><b>{round_to(100 * probs.prob_itm)}% chance to
                  close {direction} {target.toLocaleString()}</b></p>
                <p>{round_to(100 * probs.prob_itm)}% chance to
                  touch ({
                    rev_itm
                    .map(price => Math.round(price).toLocaleString())
                    .join(', ')
                  })</p>
                <p>
                  <b>
                    {round_to(100 * probs.prob_touch)}
                    % chance to touch {target.toLocaleString()}
                  </b>
                </p>
                <p>{round_to(100 * probs.prob_touch)}% chance of
                  closing {direction} ({
                    rev_touch
                    .map(price => Math.round(price))
                    .join(', ')
                  }).</p>
              </div>
            )
          }
        </div>
      );
    }
  }
}

export default withCookies(Probs);
