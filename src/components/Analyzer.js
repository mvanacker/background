import React, { Component } from 'react';
import { compute_call, compute_put, compute_probs } from './util.math.bs';
import { round_to, sum } from './util.math';
import { toYears, toHours } from './util.date';
import { instanceOf } from "prop-types";
import { Cookies, withCookies } from "react-cookie";
import CanvasJSReact from '../canvasjs.react';

const { CanvasJSChart } = CanvasJSReact;

function PnlChart(props) {
  return (
    <CanvasJSChart options={{
      culture:          "be",
      animationEnabled: true,
      theme:            "dark2",
      backgroundColor:  "black",
      height:           260,
      axisX:            {
        // valueFormatString: "HH:mm:ss"
      },
      axisY:            [{
        title:             props.title,
        logarithmic:       false,
        includeZero:       false,
        valueFormatString: "#,###",
        gridColor:         "#444444",
      }],
      data:             [{
        lineColor:  "cyan",
        type:       "line",
        dataPoints: props.expiration,
      }, {
        lineColor:  "white",
        type:       "line",
        dataPoints: props.entry,
      }, {
        lineColor:  "lime",
        type:       "line",
        dataPoints: props.arbitrary,
      }]
    }}/>
  );
}

function compute_total_pnl(positions, start, end, pnl_func, interval = 1) {
  const vector = [];
  for (let price = start; price < end; price += interval) {
    const pnl = sum(positions.map(pnl_func(price)));
    vector.push({ x: price, y: pnl });
  }
  return vector;
}

class Spot {
  constructor({ quantity, entry }) {
    this.quantity = quantity;
    this.entry = entry;
  }

  pnl_inverse(price) {
    return ((this.quantity < 0 && price < this.entry)
      || (this.quantity > 0 && price > this.entry))
      ? this.quantity * (price / this.entry - 1)
      : 0;
  }
}

function compute_pnl_inverse(spot, start, end, interval = 1) {
  const pnl_func = price => pos => pos.pnl_inverse(price);
  return compute_total_pnl(spot, start, end, pnl_func, interval);
}

class Option {
  constructor({ type, quantity, premium, strike, volatility, time }) {
    this.type = type;
    this.quantity = quantity;
    this.premium = premium;
    this.strike = strike;
    this.volatility = volatility;
    this.time = time;
  }

  pnl_at_expiration(price) {
    return this.pnl_arbitrarily(price, this.volatility, this.time * 24 * 365);
  }

  pnl_at_entry(price) {
    return this.pnl_arbitrarily(price, this.volatility, this.time);
  }

  pnl_arbitrarily(price, volatility, hoursPassed) {
    const time = Math.max(this.time - toYears(0, hoursPassed), 0);
    const compute = this.type === 'call' ? compute_call : compute_put;
    const option_price = compute(price, this.strike, volatility, time);
    return this.quantity * (option_price - this.premium);
  }
}

function compute_pnl_at_expiration(options, start, end, interval = 1) {
  const pnl_func = price => option => option.pnl_at_expiration(price);
  return compute_total_pnl(options, start, end, pnl_func, interval);
}

function compute_pnl_at_entry(options, start, end, interval = 1) {
  const pnl_func = price => option => option.pnl_at_entry(price);
  return compute_total_pnl(options, start, end, pnl_func, interval);
}

function compute_pnl_arbitrarily(options, start, end, volatility, hoursPassed, interval = 1) {
  const pnl_func = price => option => option.pnl_arbitrarily(price, volatility, hoursPassed);
  return compute_total_pnl(options, start, end, pnl_func, interval);
}

function add_pnl(pnl1, pnl2) {
  pnl1.forEach((entry, i) => entry.y += pnl2[i].y);
}

class Analyzer extends Component {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired,
  };

  constructor(props) {
    super(props);

    const { cookies } = this.props;
    this.state = {
      spotQuantity:     cookies.get('spotQuantity')     || 0,
      spotPrice:        cookies.get('spotPrice')        || 6969,
      spot:             cookies.get('spot')             || [],
      
      quantity:         cookies.get('quantity')         || 0.1,
      price:            cookies.get('price')            || 6350,
      strike:           cookies.get('strike')           || 6500,
      volatility:       cookies.get('volatility')       || 1.2,
      days:             cookies.get('days')             || 0,
      hours:            cookies.get('hours')            || 11,
      type:             cookies.get('type')             || 'call',
      options:          cookies.get('options')          || [],

      customVolatility: cookies.get('customVolatility') || 1.2,
      hoursPassed:      cookies.get('hoursPassed')      || 0,
      width:            cookies.get('width')            || 500,
      centerPrice:      cookies.get('centerPrice')      || 6350,
    };

    // parse spot positions from cookies
    const { spot } = this.state;
    for (let i = 0; i < spot.length; i++) {
      spot[i] = new Spot(JSON.parse(spot[i]));
    }

    // parse options positions from cookies
    const { options } = this.state;
    for (let i = 0; i < options.length; i++) {
      options[i] = new Option(JSON.parse(options[i]));
    }
    
    this.state = { ...this.state, ...this.compute(this.state) };
    this.bind();
  }

  bind() {
    this.spotQuantityChanged = this.spotQuantityChanged.bind(this);
    this.spotPriceChanged = this.spotPriceChanged.bind(this);
    this.buySpot = this.buySpot.bind(this);
    this.sellSpot = this.sellSpot.bind(this);

    this.quantityChanged = this.quantityChanged.bind(this);
    this.priceChanged = this.priceChanged.bind(this);
    this.strikeChanged = this.strikeChanged.bind(this);
    this.volatilityChanged = this.volatilityChanged.bind(this);
    this.daysChanged = this.daysChanged.bind(this);
    this.hoursChanged = this.hoursChanged.bind(this);
    this.typeChanged = this.typeChanged.bind(this);
    this.buyOption = this.buyOption.bind(this);
    this.sellOption = this.sellOption.bind(this);
    this.reset = this.reset.bind(this);

    this.customVolatilityChanged = this.customVolatilityChanged.bind(this);
    this.hoursPassedChanged = this.hoursPassedChanged.bind(this);
    this.widthChanged = this.widthChanged.bind(this);
    this.centerPriceChanged = this.centerPriceChanged.bind(this);
  }

  spotQuantityChanged(e) {
    const spotQuantity = e.target.value;
    this.props.cookies.set('spotQuantity', spotQuantity, { path: '/analyzer' });
    this.setState({ spotQuantity });
  }

  spotPriceChanged(e) {
    const spotPrice = e.target.value;
    this.props.cookies.set('spotPrice', spotPrice, { path: '/analyzer' });
    this.setState({ spotPrice });
  }

  saveSpot(spot) {
    this.props.cookies.set('spot', spot.map(JSON.stringify), {
      path: '/analyzer',
    });
  }
  
  addSpot(side) {
    const { spotQuantity, spotPrice, spot } = this.state;
    const quantity = spotQuantity * side;
    const spotPosition = new Spot({ quantity, entry: spotPrice });
    spot.push(spotPosition);
    this.saveSpot(spot);
    this.setState({ spot });
  }

  buySpot() { this.addSpot(1); }

  sellSpot() { this.addSpot(-1); }

  removeSpot(i) {
    const { spot } = this.state;
    spot.splice(i, 1);
    this.saveSpot(spot);
    this.setState({ spot });
  }

  quantityChanged(e) {
    const quantity = e.target.value;
    this.props.cookies.set('quantity', quantity, { path: '/analyzer' });
    this.setState({ quantity });
  }

  priceChanged(e) {
    const price = parseFloat(e.target.value);
    this.props.cookies.set('price', price, { path: '/analyzer' });
    this.setState({ price, ...this.compute({ ...this.state, price }) });
  }

  strikeChanged(e) {
    const strike = parseFloat(e.target.value);
    this.props.cookies.set('strike', strike, { path: '/analyzer' });
    this.setState({ strike, ...this.compute({ ...this.state, strike }) });
  }

  volatilityChanged(e) {
    const volatility = e.target.value;
    this.props.cookies.set('volatility', volatility, { path: '/analyzer' });
    this.setState({ volatility, ...this.compute({ ...this.state, volatility }) });
  }

  daysChanged(e) {
    const days = e.target.value;
    this.props.cookies.set('days', days, { path: '/analyzer' });
    this.setState({ days, ...this.compute({ ...this.state, days }) });
  }

  hoursChanged(e) {
    const hours = e.target.value;
    this.props.cookies.set('hours', hours, { path: '/analyzer' });
    this.setState({ hours, ...this.compute({ ...this.state, hours }) });
  }

  typeChanged(e) {
    const type = e.target.value;
    this.props.cookies.set('type', type, { path: '/analyzer' });
    this.setState({ type });
  }

  customVolatilityChanged(e) {
    const customVolatility = e.target.value;
    this.props.cookies.set('customVolatility', customVolatility, { path: '/analyzer' });
    this.setState({ customVolatility });
  }

  hoursPassedChanged(e) {
    const hoursPassed = e.target.value;
    this.props.cookies.set('hoursPassed', hoursPassed, { path: '/analyzer' });
    this.setState({ hoursPassed });
  }

  widthChanged(e) {
    const width = e.target.value;
    this.props.cookies.set('width', width, { path: '/analyzer' });
    this.setState({ width });
  }

  centerPriceChanged(e) {
    const centerPrice = e.target.value;
    this.props.cookies.set('centerPrice', centerPrice, { path: '/analyzer' });
    this.setState({ centerPrice });
  }

  compute({ price, strike, volatility, days, hours }) {
    price = parseFloat(price);
    strike = parseFloat(strike);
    volatility = parseFloat(volatility);
    const time = toYears(days, hours);
    const call = compute_call(price, strike, volatility, time);
    const put = compute_put(price, strike, volatility, time);
    const probs = compute_probs(price, strike, volatility, time);
    return { call, put, probs };
  }

  componentDidMount() {
    document.title = 'Analyzer';
  }

  saveOptions(options) {
    this.props.cookies.set('options', options.map(JSON.stringify), {
      path: '/analyzer',
    });
  }

  addOption(side) {
    const {
      call, put, strike, volatility, days, hours, type, options,
    } = this.state;
    const quantity = this.state.quantity * side;
    const premium = type === 'call' ? call : put;
    const time = toYears(days, hours);
    const option = new Option({
      type, quantity, premium, strike, volatility, time
    });
    options.push(option);
    this.saveOptions(options);
    this.setState({ options });
  }

  buyOption() { this.addOption(1); }

  sellOption() { this.addOption(-1); }

  removeOption(i) {
    const { options } = this.state;
    options.splice(i, 1);
    this.saveOptions(options);
    this.setState({ options });
  }

  reset() { this.setState({ options: [] }); }

  hoursUntilExpiration() {
    const { options } = this.state;
    return 365 * 24 * Math.max(...options.map(pos => pos.time));
  }

  render() {
    const {
      spotPrice, spotQuantity, spot,
      price, strike, volatility, days, hours, type, quantity, call, put, probs,
      options,
      customVolatility, hoursPassed, width, centerPrice,
    } = this.state;

    const parsedWidth = parseFloat(width);
    const parsedCenterPrice = parseFloat(centerPrice);
    const start = parsedCenterPrice - parsedWidth;
    const end = parsedCenterPrice + parsedWidth;

    const expiration = compute_pnl_at_expiration(options, start, end);
    const entry = compute_pnl_at_entry(options, start, end);
    const arbitrary = compute_pnl_arbitrarily(options, start, end,
      parseFloat(customVolatility), parseFloat(hoursPassed));

    const spot_pnl = compute_pnl_inverse(spot, start, end);
    add_pnl(expiration, spot_pnl);
    add_pnl(entry, spot_pnl);
    add_pnl(arbitrary, spot_pnl);

    return (
      <form>
        <h2>Spot</h2>
        <div className="row">
          <div className="left-column">Quantity</div>
          <div className="right-column">
            <input id="spot-quantity" onChange={this.spotQuantityChanged}
                   value={spotQuantity ? spotQuantity : 0}/>
          </div>
        </div>
        <div className="row">
          <div className="left-column">Price</div>
          <div className="right-column">
            <input id="spot-price" onChange={this.spotPriceChanged}
                   value={spotPrice ? spotPrice : 0}/>
          </div>
        </div>
        <div className="row">
          <p>
            <button onClick={this.buySpot} type="button">Buy</button>{' '}
            <button onClick={this.sellSpot} type="button">Sell</button>
          </p>
        </div>
        <h2>Option</h2>
        <div className="row">
          <div className="left-column">Quantity</div>
          <div className="right-column">
            <input id="quantity" onChange={this.quantityChanged} type="number"
                  step="0.1" value={quantity ? quantity : 0} min="0"/>
          </div>
        </div>
        <div className="row">
          <div className="left-column">Price</div>
          <div className="right-column">
            <input id="price" onChange={this.priceChanged}
                   value={price ? price : 0} size={4}/>
          </div>
        </div>
        <div className="row">
          <div className="left-column">Strike</div>
          <div className="right-column">
            <input id="strike" onChange={this.strikeChanged}
                   value={strike ? strike : 0} size={4}/>
          </div>
        </div>
        <div className="row">
          <div className="left-column">Volatility</div>
          <div className="right-column">
            <input id="volatility" onChange={this.volatilityChanged}
                   value={volatility ? volatility : 1} size={4}/>
          </div>
        </div>
        <div className="row">
          <div className="left-column">Time</div>
          <div className="right-column">
            <input id="days" onChange={this.daysChanged}
                   value={days ? days : 0} size={1}/>{' '}
            days{' '}
            <input id="hours" onChange={this.hoursChanged}
                   value={hours ? hours : 0} size={1}/>{' '}
            hours
          </div>
        </div>
        <div className="row">
          <div className="left-column">
            <input type="radio" name="type" id="call" checked={type === 'call'}
                   value="call" onChange={this.typeChanged}/>
            <label htmlFor="call">Call</label>
          </div>
          <div className="right-column">
            ${round_to(call, 2)} ({round_to(call / price, 4)} BTC)
          </div>
        </div>
        <div className="row">
          <div className="left-column">
            <input type="radio" name="type" id="put" checked={type === 'put'}
                   value="put" onChange={this.typeChanged}/>
            <label htmlFor="put" name="type">Put</label>
          </div>
          <div className="right-column">
            ${round_to(put, 2)} ({round_to(put / price, 4)} BTC)
          </div>
        </div>
        <div className="row">
          <div className="left-column">Prob. ITM</div>
          <div className="right-column">
            {round_to(100 * (type === 'call' ? probs.prob_itm
              : 1 - probs.prob_itm), 2)}%
          </div>
        </div>
        <div className="row">
          <div className="left-column">Prob. Touch</div>
          <div className="right-column">
            {round_to(100 * probs.prob_touch, 2)}%
          </div>
        </div>
        <div className="row">
          <div className="left-column">Prob. Profit</div>
          <div className="right-column">
            {round_to(100 * (type === 'call' ? probs.prob_profit_call
              : probs.prob_profit_put), 2)}% (short)
          </div>
        </div>
        <div className="row">
          <p>
            <button onClick={this.buyOption} type="button">Buy</button>{' '}
            <button onClick={this.sellOption} type="button">Sell</button>
          </p>
        </div>
        <h2>Analysis</h2>
        <div className="row">
          <ul>
            {
              options.map((pos, i) => <li key={i}>
                <button onClick={() => this.removeOption(i)} type="button">
                  X
                </button>{' '}
                {pos.quantity}x {pos.type} {pos.strike},{' '}
                ${round_to(pos.premium, 2)}{' '}
                ({round_to(pos.premium / price, 4)} BTC),{' '}
                {Math.round(toHours(pos.time))} hours
              </li>)
            }
          </ul>
          <ul>
            {
              spot.map((pos, i) => <li key={i}>
                <button onClick={() => this.removeSpot(i)} type="button">
                  X
                </button>{' '}
                {pos.quantity}x spot at {pos.entry}
              </li>)
            }
          </ul>
        </div>
        {/* <div className="row">
          <p>
            <button onClick={this.reset} type="button">Remove all</button>
          </p>
        </div> */}
        <div className="row">
          <PnlChart expiration={expiration} entry={entry}
                    arbitrary={arbitrary}/>
        </div>
        <div className="row">
          <div className="left-column">Volatility</div>
          <div className="right-column">
            <input type="range" min="0.01" max="5" id="custom-volatility"
                   step="0.01" onChange={this.customVolatilityChanged}
                   value={customVolatility ? customVolatility
                          : volatility ? volatility : 1}/>{' '}
            <input id="custom-volatility-text" size={1}
                   onChange={this.customVolatilityChanged}
                   value={customVolatility ? customVolatility
                          : volatility ? volatility : 1}/>
          </div>
        </div>
        <div className="row">
          <div className="left-column">Hours passed</div>
          <div className="right-column">
            <input type="range" min="0" max={this.hoursUntilExpiration()}
                   step="1" id="hours-passed" onChange={this.hoursPassedChanged}
                   value={hoursPassed ? hoursPassed : 0}/>{' '}
            <input cid="hours-passed-text" size={1}
                   onChange={this.hoursPassedChanged}
                   value={hoursPassed ? hoursPassed : 0}/>
          </div>
        </div>
        <div className="row">
          <div className="left-column">Width</div>
          <div className="right-column">
            <input id="width" onChange={this.widthChanged}
                   value={width ? width : price}/>
          </div>
        </div>
        <div className="row">
          <div className="left-column">Price</div>
          <div className="right-column">
            <input id="center-price" onChange={this.centerPriceChanged}
                   value={centerPrice ? centerPrice : price}/>
          </div>
        </div>
      </form>
    );
  }
}

export default withCookies(Analyzer);
