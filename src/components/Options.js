import React, { Component } from 'react';

import CanvasJSReact from '../canvasjs.react';
import { instanceOf } from "prop-types";
import { Cookies, withCookies } from "react-cookie";

import { 
  compute_call, compute_put, compute_prob_itm, compute_iv_call, compute_iv_put
} from './util.math.bs';
import { round_to } from './util.math';
import { reverseEnum } from './util.enum';
import { toYears, toDaysHours } from './util.date';
import { zip } from './util.general';
import setYearlyCookie from './util.cookie';

import Tabs from './common/Tabs';
import Panel from './common/Panel';
import Row from './common/Row';
import LabeledRow from './common/LabeledRow';
import ValueWithSlider from './common/ValueWithSlider';
import ListBlock from './common/ListBlock';

export default withCookies(class Options extends Component {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired,
  };

  constructor(props) {
    super(props);
    const { cookies } = this.props;
    console.log(cookies.get('form-optionPractical-daysRemaining'));
    this.state = {
      activeForm: cookies.get('activeForm') || Form.UNDERLYING,
      form:       {
        underlying:        {
          quantity:  cookies.get('form-underlying-quantity') || 725,
          price:     cookies.get('form-underlying-price') || 7250,
          hedgeOnly: (c => c ? c === 'true' : true)(cookies.get('form-underlying-hedgeOnly')),
        },
        optionPractical:   {
          quantity:        cookies.get('form-optionPractical-quantity') || 0.1,
          underlyingPrice: cookies.get('form-optionPractical-underlyingPrice') || 7340,
          strike:          cookies.get('form-optionPractical-strike') || 7000,
          daysRemaining:   cookies.get('form-optionPractical-daysRemaining') || 16,
          hoursRemaining:  cookies.get('form-optionPractical-hoursRemaining') || 16,
          daysTransacted:  cookies.get('form-optionPractical-daysTransacted') || 0,
          hoursTransacted: cookies.get('form-optionPractical-hoursTransacted') || 0,
          type:            cookies.get('form-optionPractical-type') || OptionType.CALL,
          premium:         cookies.get('form-optionPractical-premium') || 684,
        },
        optionTheoretical: {
          quantity:        cookies.get('form-optionTheoretical-quantity') || 0.1,
          underlyingPrice: cookies.get('form-optionTheoretical-underlyingPrice') || 7340,
          strike:          cookies.get('form-optionTheoretical-strike') || 7000,
          volatility:      cookies.get('form-optionTheoretical-volatility') || 1,
          daysRemaining:   cookies.get('form-optionTheoretical-daysRemaining') || 1,
          hoursRemaining:  cookies.get('form-optionTheoretical-hoursRemaining') || 0,
          type:            cookies.get('form-optionTheoretical-type') || OptionType.CALL,
        },
      },
      positions:  {
        underlying: cookies.get('positions-underlying') || [{
          enabled:   true,
          quantity:  -725,
          price:     7250,
          hedgeOnly: true,
        }],
        options:    cookies.get('positions-options') || [{
          enabled:    false,
          type:       OptionType.PUT,
          quantity:   0.1,
          premium:    64,
          strike:     7125,
          volatility: 0.958,
          time:       22.5 / (24 * 365),
        }, {
          enabled:    true,
          type:       OptionType.PUT,
          quantity:   -0.1,
          premium:    84,
          strike:     7250,
          volatility: 0.782,
          time:       22.5 / (24 * 365),
        }, {
          enabled:    true,
          type:       OptionType.CALL,
          quantity:   -0.1,
          premium:    78,
          strike:     7375,
          volatility: 0.704,
          time:       22.5 / (24 * 365),
        }, {
          enabled:    true,
          type:       OptionType.CALL,
          quantity:   0.1,
          premium:    55,
          strike:     7500,
          volatility: 0.835,
          time:       22.5 / (24 * 365),
        }]
      },
      analysis:   {
        volatilityChange:  cookies.get('analysis-volatilityChange') || 0,
        hoursPassed:       cookies.get('analysis-hoursPassed') || 0,
        currentPrice:      cookies.get('analysis-currentPrice') || 7312,
        currentVolatility: cookies.get('analysis-currentVolatility') || 1,
      },
      debug:      {
        chartResolution: cookies.get('debug-chartResolution') || 5,
        chartCenter:     cookies.get('debug-chartCenter') || 7312.5,
        chartHalfWidth:  cookies.get('debug-chartHalfWidth') || 500,
      }
    };

    const { positions } = this.state;
    ['underlying', 'options'].forEach(type => {
      if (cookies.get(`positions-${type}`)) {
        positions[type] = positions[type].map(JSON.parse);
      }
    })

    this.bind();
    this.FormHandler = {
      UNDERLYING:         this.onUnderlying,
      OPTION_PRACTICAL:   this.onOptionPractical,
      OPTION_THEORETICAL: this.onOptionTheoretical,
    }
  }

  bind() {
    this.onTabsClick = this.onTabsClick.bind(this);

    this.onFormChange = this.onFormChange.bind(this);
    this.onAnalysisChange = this.onAnalysisChange.bind(this);
    this.onDebugChange = this.onDebugChange.bind(this);

    this.onUnderlying = this.onUnderlying.bind(this);
    this.onOptionPractical = this.onOptionPractical.bind(this);
    this.onOptionTheoretical = this.onOptionTheoretical.bind(this);

    this.togglePosition = this.togglePosition.bind(this);
    this.removePosition = this.removePosition.bind(this);
  }

  setCookie(key, value) {
    setYearlyCookie(this.props.cookies, key, value, '/options');
  }

  setCookiePositions(type) {
    const { positions } = this.state;
    this.setCookie(`positions-${type}`, positions[type].map(JSON.stringify));
  }

  onTabsClick(activeForm) {
    this.setCookie('activeForm', activeForm)
    this.setState({ activeForm });
  }

  onFormChange(e, subForm, key, targetProperty = 'value') {
    const form = { ...this.state.form };
    form[subForm] = { ...this.state.form[subForm] };
    const value = e.target[targetProperty];
    form[subForm][key] = value;
    this.setCookie(`form-${subForm}-${key}`, value);
    this.setState({ form });
  }

  onUnderlying(e, side) {
    e.preventDefault();
    const { underlying } = this.state.form;
    const [ quantity, price ] = Object.values(underlying).map(parseFloat);
    const { hedgeOnly } = underlying;
    const positions = { ...this.state.positions };
    positions.underlying.push({
      enabled:  true,
      quantity: side * quantity,
      price,
      hedgeOnly,
    });
    this.setCookiePositions('underlying');
    this.setState({ positions });
  }

  onOptionPractical(e, side) {
    e.preventDefault();
    const [
      quantity, underlyingPrice, strike, daysRemaining, hoursRemaining,
      daysTransacted, hoursTransacted, type, premium
    ] = Object.values(this.state.form.optionPractical).map(parseFloat);
    const time = toYears(daysRemaining + daysTransacted,
                         hoursRemaining + hoursTransacted);
    const iv = compute_iv(type, underlyingPrice, strike, time, premium);
    const positions = { ...this.state.positions };
    positions.options.push({
      enabled: true, type, quantity: side * quantity,
      premium, strike, volatility: iv, time
    });
    this.setCookiePositions('options');
    this.setState({ positions });
  }

  onOptionTheoretical(e, side) {
    e.preventDefault();
    const [
      quantity, underlyingPrice, strike, volatility, daysRemaining,
      hoursRemaining, type
    ] = Object.values(this.state.form.optionTheoretical).map(parseFloat);
    if (!type && type !== 0) return;
    const positions = { ...this.state.positions };
    const compute = OptionPremiumComputations[OptionTypeReversed[type]];
    const time = toYears(daysRemaining, hoursRemaining);
    const premium = compute(underlyingPrice, strike, volatility, time);
    positions.options.push({
      enabled: true, type, quantity: side * quantity,
      premium, strike, volatility, time
    });
    this.setCookiePositions('options');
    this.setState({ positions });
  }

  togglePosition(e, type, i) {
    const positions = { ...this.state.positions };
    positions[type][i].enabled = e.target.checked;
    this.setCookiePositions(type);
    this.setState({ positions });
  }

  removePosition(e, type, i) {
    const positions = { ...this.state.positions };
    positions[type].splice(i, 1);
    this.setCookiePositions(type);
    this.setState({ positions });
  }

  onAnalysisChange(e, param) {
    const analysis = { ...this.state.analysis };
    analysis[param] = e.target.value;
    this.setCookie(`analysis-${param}`, e.target.value);
    this.setState({ analysis });
  }

  onDebugChange(e, param) {
    const debug = { ...this.state.debug };
    debug[param] = e.target.value;
    this.setCookie(`debug-${param}`, e.target.value);
    this.setState({ debug });
  }

  componentDidMount() {
    document.title = 'Options';
  }

  chartDimensions() {
    const [
      chartResolution, chartCenter, chartHalfWidth
    ] = Object.values(this.state.debug).map(parseFloat);
    return {
      start:      round_to(chartCenter - chartHalfWidth, -1, chartResolution),
      end:        round_to(chartCenter + chartHalfWidth, -1, chartResolution),
      resolution: chartResolution,
    }
  }

  pnl() {
    const { underlying, options } = this.state.positions;
    const [
      volatilityChange, hoursPassed
    ] = Object.values(this.state.analysis).map(parseFloat);
    const { start, end, resolution } = this.chartDimensions();
    const expirationDataPoints = [];
    const entryDataPoints = [];
    const arbitraryDataPoints = [];

    // compute pnls
    for (let x = start; x < end; x += resolution) {
      let expiration_y = 0, entry_y = 0, arbitrary_y = 0;

      // options pnl
      options.filter(position => position.enabled).forEach(option => {
        const { type, quantity, premium, strike, volatility, time } = option;
        expiration_y += pnl_expiration(x, type, quantity, premium, strike,
                                       volatility, time);
        entry_y += pnl_entry(x, type, quantity, premium, strike, volatility,
                             time);
        arbitrary_y += pnl(x, type, quantity, premium, strike, volatility, time,
                           volatilityChange, hoursPassed);
      });

      // underlying pnl
      underlying.filter(position => position.enabled).forEach(underlying => {
        const { quantity, price, hedgeOnly } = underlying;
        const pnl = pnl_underlying(x, quantity, price, hedgeOnly);
        expiration_y += pnl;
        entry_y += pnl;
        arbitrary_y += pnl;
      });

      expirationDataPoints.push({ x, y: expiration_y });
      entryDataPoints.push({ x, y: entry_y });
      arbitraryDataPoints.push({ x, y: arbitrary_y });
    }

    return {
      start, end, expirationDataPoints, entryDataPoints, arbitraryDataPoints
    };
  }

  levels() {
    return this.state.positions.options.filter(option => option.enabled)
                                       .map(option => option.strike)
                                       .map(parseFloat)
                                       .sort((a, b) => a - b);
  }

  probs() {
    const [
      currentPrice, currentVolatility
    ] = Object.values(this.state.analysis).slice(2).map(parseFloat);
    const time = toYears(0, this.longestHoursLeft());
    const { start, end } = this.chartDimensions();
    const levels = this.levels();
  
    // split lower from higher levels, only select levels within view
    const lower_levels = levels.filter(l => start < l && l < currentPrice);
    const higher_levels = levels.filter(l => end > l && l > currentPrice);
  
    // compute probabilities of each strike being closed below/above
    const prob = level => compute_prob_itm(currentPrice, level,
                                           currentVolatility, time);
    const lower_probs = lower_levels.map(prob);
    const higher_probs = higher_levels.map(prob);
  
    // compute probabilities of price closing between levels
    const lower_betweens = betweens(lower_probs.reverse()).reverse();
    const higher_betweens = betweens(higher_probs);
    
    // express the pairs of levels corresponding to the probabilities
    let pairs = [start].concat(lower_levels)
                       .concat([currentPrice])
                       .concat(higher_levels)
                       .concat([end]);
    pairs = zip(pairs.slice(0, pairs.length - 1), pairs.slice(1));

    // zip pairs to their corresponding probabilities, convert to stripLines
    return zip(pairs, lower_betweens.concat(higher_betweens));
  }

  leastVolatility() {
    const { options } = this.state.positions;
    return Math.min(...options.map(p => p.volatility));
  }

  longestHoursLeft() {
    const { options } = this.state.positions;
    const yearsLeft = Math.max(...options.map(p => p.time));
    return Math.ceil(24 * 365 * yearsLeft);
  }

  render() {
    const { activeForm, positions, form, analysis, debug } = this.state;
    const _activeForm = FormReversed[activeForm];
    const formStateName = FormStateNames[_activeForm];
    const FormComponent = FormComponents[_activeForm];
    return <div>
      <Tabs enum={Form} titles={FormTitles} onClick={this.onTabsClick}/>
      <FormComponent
        formData={form[formStateName]} formStateName={formStateName}
        onLong={e => this.FormHandler[_activeForm](e, 1)}
        onShort={e => this.FormHandler[_activeForm](e, -1)}
        onFormChange={this.onFormChange}
      />
      <p className="w3-small w3-center my-italic w3-hide">
        This is an analysis tool. No positions are actually taken.
      </p>
      <Positions
        positions={positions.underlying} title="Underlying"
        posToString={pos => {
          const hedgeOnly = !pos.hedgeOnly ? '' : <small>(hedge only)</small>;
          return <span>{pos.quantity}x {pos.price} {hedgeOnly}</span>;
        }}
        togglePosition={(e, i) => this.togglePosition(e, 'underlying', i)}
        removePosition={(e, i) => this.removePosition(e, 'underlying', i)}
      />
      <Positions
        positions={positions.options} title="Options"
        posToString={pos => {
          const { quantity, strike, volatility, premium } = pos;
          const type = OptionTypeTitles[OptionTypeReversed[pos.type]];
          const vol = toPercent(volatility);
          const { days, hours } = toDaysHours(pos.time);
          const time = `${days} days, ${round_to(hours, 1)} hours`
          const prem = toDollars(premium);
          return `${quantity}x ${type} ${strike}, ${vol}, ${prem}, ${time}`;
        }}
        togglePosition={(e, i) => this.togglePosition(e, 'options', i)}
        removePosition={(e, i) => this.removePosition(e, 'options', i)}
      />
      <PnlChart
        pnl={this.pnl()} probs={this.probs()} levels={this.levels()}
        zero={true} currentPrice={this.state.analysis.currentPrice}
      />
      <Analysis
        analysis={analysis} onAnalysisChange={this.onAnalysisChange}
        minVolatilityChange={-this.leastVolatility()}
        maxHoursPassed={this.longestHoursLeft()}
      />
      <Debug debug={debug} onDebugChange={this.onDebugChange} />
    </div>;
  }
});

const Form = {
  UNDERLYING:         0,
  OPTION_PRACTICAL:   1,
  OPTION_THEORETICAL: 2,
}
const FormReversed = reverseEnum(Form);
const FormTitles = {
  UNDERLYING:         'Underlying',
  OPTION_PRACTICAL:   'Option (practical)',
  OPTION_THEORETICAL: 'Option (theoretical)',
}
const FormComponents = {
  UNDERLYING:         Underlying,
  OPTION_PRACTICAL:   OptionPractical,
  OPTION_THEORETICAL: OptionTheoretical,
}
const FormStateNames = {
  UNDERLYING:         'underlying',
  OPTION_PRACTICAL:   'optionPractical',
  OPTION_THEORETICAL: 'optionTheoretical',
}

const OptionType = { CALL: 0, PUT: 1 }
const OptionTypeReversed = reverseEnum(OptionType);
const OptionTypeTitles = { CALL: 'call', PUT: 'put' }
const OptionPremiumComputations = { CALL: compute_call, PUT: compute_put }

function Underlying(props) {
  const [ quantity, price ] = Object.values(props.formData).map(parseFloat);
  const { hedgeOnly } = props.formData;
  const { onFormChange, formStateName, onLong, onShort } = props;
  return <form>
    <div className="w3-content w3-theme-d5">
      <InputQuantity
        value={quantity} min="1"
        onChange={e => onFormChange(e, formStateName, 'quantity')}
      />
      <InputPrice
        value={price} onChange={e => onFormChange(e, formStateName, 'price')}
      />
      <Row>
        <div className="my-cell w3-container w3-cell-top">
          <input
            type="checkbox" className="w3-check" checked={hedgeOnly} 
            id="hedge-only" onChange={e =>
              onFormChange(e, formStateName, 'hedgeOnly', 'checked')}
          /> <label htmlFor="hedge-only">Hedge only</label>
        </div>
      </Row>
    </div>
    <Submit onLong={onLong} onShort={onShort}/>
  </form>;
}

function OptionPractical(props) {
  const [
    quantity, underlyingPrice, strike, daysRemaining, hoursRemaining,
    daysTransacted, hoursTransacted, type, premium
  ] = Object.values(props.formData).map(parseFloat);
  const { onFormChange, formStateName, onLong, onShort } = props;
  const time = toYears(daysRemaining + daysTransacted,
                       hoursRemaining + hoursTransacted)
  const iv = compute_iv(type, underlyingPrice, strike, time, premium);
  return <form>
    <div className="w3-content w3-theme-dark">
      <InputQuantity
        value={quantity} step="0.1" min="0.1"
        onChange={e => onFormChange(e, formStateName, 'quantity')}
      />
      <InputPrice
        label="Underlying price" value={underlyingPrice}
        onChange={e => onFormChange(e, formStateName, 'underlyingPrice')}
      />
      <InputStrike
        value={strike}
        onChange={e => onFormChange(e, formStateName, 'strike')}
      />
      <LabeledRow label="Time remaining">
        <input
          type="number" id="daysRemaining" min="0" value={daysRemaining}
          className="w3-input my-small-input"
          onChange={e => onFormChange(e, formStateName, 'daysRemaining')}
        /> <label htmlFor="daysRemaining">days</label>{' '}
        <input
          type="number" id="hoursRemaining" min="0" value={hoursRemaining}
          className="w3-input my-small-input"
          onChange={e => onFormChange(e, formStateName, 'hoursRemaining')}
        /> <label htmlFor="hoursRemaining">hours</label> to go
      </LabeledRow>
      <LabeledRow label="Time transacted">
        <input
          type="number" id="daysTransacted" min="0" value={daysTransacted}
          className="w3-input my-small-input"
          onChange={e => onFormChange(e, formStateName, 'daysTransacted')}
        /> <label htmlFor="daysTransacted">days</label>{' '}
        <input
          type="number" id="hoursTransacted" min="0" value={hoursTransacted}
          className="w3-input my-small-input"
          onChange={e => onFormChange(e, formStateName, 'hoursTransacted')}
        /> <label htmlFor="hoursTransacted">hours</label> ago
      </LabeledRow>
      <LabeledRow label="Type">
        <div style={{'padding': '2px 0 8px 0'}}>
          <input
            className="w3-radio" type="radio" name="type" id="call"
            value={OptionType.CALL} selected={type === OptionType.CALL}
            onChange={e => onFormChange(e, formStateName, 'type')}
          /> <label htmlFor="call">call</label>{' '}
          <input
            className="w3-radio" type="radio" name="type" id="put"
            value={OptionType.PUT} selected={type === OptionType.PUT}
            onChange={e => onFormChange(e, formStateName, 'type')}
          /> <label htmlFor="put">put</label>
        </div>
      </LabeledRow>
      <InputPrice
        label="Premium" value={premium}
        onChange={e => onFormChange(e, formStateName, 'premium')}
      />
      <LabeledRow label="Implied volatility">
        <div className="my-cell w3-cell-middle">
          {toPercent(iv)}
        </div>
      </LabeledRow>
    </div>
    <Submit onLong={onLong} onShort={onShort}/>
  </form>;
}

function OptionTheoretical(props) {
  const [
    quantity, underlyingPrice, strike, volatility, daysRemaining,
    hoursRemaining, type
  ] = Object.values(props.formData).map(parseFloat);
  const timeRemaining = toYears(daysRemaining, hoursRemaining);
  const call = compute_call(underlyingPrice, strike, volatility, timeRemaining);
  const put = compute_put(underlyingPrice, strike, volatility, timeRemaining);
  const { onFormChange, formStateName, onLong, onShort } = props;
  return <form>
    <div className="w3-content w3-theme-d5">
      <InputQuantity
        value={quantity} step="0.1" min="0.1"
        onChange={e => onFormChange(e, formStateName, 'quantity')}
      />
      <InputPrice
        label="Underlying price" value={underlyingPrice}
        onChange={e => onFormChange(e, formStateName, 'underlyingPrice')}
      />
      <InputStrike
        value={strike}
        onChange={e => onFormChange(e, formStateName, 'strike')}
      />
      <InputVolatility
        value={volatility}
        onChange={e => onFormChange(e, formStateName, 'volatility')}
      />
      <LabeledRow label="Time remaining">
        <input
          type="number" id="daysRemaining" min="0" value={daysRemaining}
          className="w3-input my-small-input"
          onChange={e => onFormChange(e, formStateName, 'daysRemaining')}
        /> <label htmlFor="daysRemaining">days</label>{' '}
        <input
          type="number" id="hoursRemaining" min="0" value={hoursRemaining}
          className="w3-input my-small-input"
          onChange={e => onFormChange(e, formStateName, 'hoursRemaining')}
        /> <label htmlFor="hoursRemaining">hours</label> to go
      </LabeledRow>
      <LabeledRow label="Type">
        <div style={{'paddingBottom': '6px'}}>
          <div>
            <input
              className="w3-radio" type="radio" name="type" id="call"
              value={OptionType.CALL} selected={type === OptionType.CALL}
              onChange={e => onFormChange(e, formStateName, 'type')}
            /> <label htmlFor="call">
              call ${round_to(call, 2)} ({
                round_to(call / underlyingPrice, 4)
              } BTC)
            </label>
          </div>
          <div>
            <input
              className="w3-radio" type="radio" name="type" id="put"
              value={OptionType.PUT} selected={type === OptionType.PUT}
              onChange={e => onFormChange(e, formStateName, 'type')}
            /> <label htmlFor="put">
              put ${round_to(put, 2)} ({
                round_to(put / underlyingPrice, 4)
              } BTC)
            </label>
          </div>
        </div>
      </LabeledRow>
    </div>
    <Submit onLong={onLong} onShort={onShort}/>
  </form>;
}

function Input(props) {
  return <LabeledRow label={props.label}>
    <input className="w3-input" {...props}/>
  </LabeledRow>;
}

function InputQuantity(props) {
  return <Input label="Quantity" type="number" {...props}/>;
}

function InputPrice(props) {
  const label = props.label ? props.label : "Price";
  return <Input label={label} type="number" min="5" {...props}/>;
}

function InputStrike(props) {
  return <Input label="Strike price" type="number" min="0" {...props}/>;
}

function InputVolatility(props) {
  return <Input
    label="Volatility" type="number" min="0.01" step="0.01" {...props}
  />;
}

function Submit(props) {
  const { onLong, onShort } = props;
  return <div className="w3-cell-row">
    <div className="w3-cell">
      <button
        type="button" onClick={onLong}
        className="w3-button w3-block w3-green w3-large"
      >
        Long
      </button>
    </div>
    <div className="w3-cell">
      <button
        type="button" onClick={onShort}
        className="w3-button w3-block w3-red w3-large"
      >
        Short
      </button>
    </div>
  </div>;
}

function Positions(props) {
  const {
    positions, title, posToString, togglePosition, removePosition
  } = props;
  return <Panel title={props.title}>
    <ListBlock>
      {
        positions.map((pos, i) => <li key={i}>
          <div className="w3-cell-row">
            <div
              className="w3-cell w3-cell-middle"
              style={{'width': '32px', 'paddingBottom': '7px'}}
            >
              <input
                id={`${title.toLowerCase()}-${i}`} type="checkbox"
                className="w3-check" checked={pos.enabled}
                onChange={e => togglePosition(e, i)}
              />
            </div>
            <div className="w3-cell w3-cell-middle">
              <label
                htmlFor={`${title.toLowerCase()}-${i}`}
                className="w3-block"
              >
                {posToString(pos)}
              </label>
            </div>
            <div className="w3-cell w3-cell-middle" style={{'width': '20px'}}>
              <i
                className="fa fa-trash w3-right my-pointer"
                onClick={e => removePosition(e, i)}
              />
            </div>
          </div>
        </li>)
      }
    </ListBlock>
  </Panel>;
}

function PnlChart(props) {
  const {
    start, end, expirationDataPoints, entryDataPoints, arbitraryDataPoints
  } = props.pnl;
  const { probs, levels, currentPrice } = props;

  // probability labels
  const probStripLines = probs.map(([[start, end], prob]) => {
    return {
      startValue:           start,
      endValue:             end,
      label:                toPercent(prob),
      color:                'transparent',
      labelBackgroundColor: 'transparent',
    };
  });

  // vertical rulers
  const ys = expirationDataPoints.map(point => point.y).filter(y => !isNaN(y));
  const min_y = Math.floor(Math.min(...ys)) - 1;
  const max_y = Math.ceil(Math.max(...ys)) + 1;
  const levelsData = levels.filter(l => start < l && l < end).map(l => {
    return {
      type:         "line",
      lineColor:    "grey",
      markerType:   "none",
      lineDashType: "dash",
      dataPoints:   [{ x: l, y: min_y }, { x: l, y: max_y }],
    };
  });

  // put it all together
  const options = {
    culture:          "be",
    animationEnabled: true,
    theme:            "dark2",
    backgroundColor:  "transparent",
    axisX:            {
      includeZero: false,
      stripLines:  probStripLines,
    },
    axisY:            [{
      title:             props.title,
      logarithmic:       false,
      // includeZero:       true,
      valueFormatString: "#,###",
      gridColor:         "#666666",
    }],
    data:             [...levelsData, {
      type:         "line",
      lineColor:    "pink",
      markerType:   "none",
      lineDashType: "dash",
      dataPoints:   [
        { x: currentPrice, y: min_y },
        { x: currentPrice, y: max_y },
      ],
    }, {
      lineColor:  "cyan",
      type:       "line",
      dataPoints: expirationDataPoints,
    }, {
      lineColor:  "white",
      type:       "line", 
      dataPoints: entryDataPoints,
    }, {
      lineColor:  "lime",
      type:       "line",
      dataPoints: arbitraryDataPoints,
    }]
  };
  if (props.zero) {
    options.data.unshift({
      lineColor:    "grey",
      type:         "line",
      markerType:   "none",
      dataPoints:   [{ x: start, y: 0 }, { x: end, y: 0 }],
    });
  }

  return <div className="w3-margin w3-container w3-theme-dark w3-padding-24">
    <CanvasJSReact.CanvasJSChart options={options}/>
  </div>;
}

function Analysis(props) {
  const {
    analysis, onAnalysisChange, minVolatilityChange, maxHoursPassed
  } = props;
  return <Panel title="Analysis" padding={true}>
    <ListBlock>
      <li>
        <LabeledRow label="Volatility change">
          <ValueWithSlider
            min={minVolatilityChange} max="2" step="0.01"
            value={analysis.volatilityChange}
            onChange={e => onAnalysisChange(e, 'volatilityChange')}
          />
        </LabeledRow>
      </li>
      <li>
        <LabeledRow label="Hours passed">
          <ValueWithSlider
            min="0" max={maxHoursPassed} value={analysis.hoursPassed}  
            onChange={e => onAnalysisChange(e, 'hoursPassed')}
          />
        </LabeledRow>
      </li>
      <li>
        <LabeledRow label="Current price">
          <input
            className="w3-input" value={analysis.currentPrice}
            onChange={e => onAnalysisChange(e, 'currentPrice')}
          />
        </LabeledRow>
      </li>
      <li>
        <LabeledRow label="Current volatility">
          <input
            className="w3-input" value={analysis.currentVolatility}
            onChange={e => onAnalysisChange(e, 'currentVolatility')}
          />
        </LabeledRow>
      </li>
    </ListBlock>
  </Panel>;
}

function Debug(props) {
  const { debug, onDebugChange } = props;
  return <Panel title="Debug" padding={true}>
    <ListBlock>
      <li>
        <LabeledRow label="Chart resolution">
          <ValueWithSlider
            min="1" max="10" value={debug.chartResolution}  
            onChange={e => onDebugChange(e, 'chartResolution')}
          />
        </LabeledRow>
      </li>
      <li>
        <LabeledRow label="Chart center">
          <ValueWithSlider
            min="5000" max="20000" step="62.5" value={debug.chartCenter}  
            onChange={e => onDebugChange(e, 'chartCenter')}
          />
        </LabeledRow>
      </li>
      <li>
        <LabeledRow label="Chart half width">
          <ValueWithSlider
            min="250" max="3000" step="50" value={debug.chartHalfWidth}  
            onChange={e => onDebugChange(e, 'chartHalfWidth')}
          />
        </LabeledRow>
      </li>
    </ListBlock>
  </Panel>;
}

/* PNL functions */

function pnl_expiration(x, type, quantity, premium, strike, volatility, time) {
  return pnl(x, type, quantity, premium, strike, volatility, time, 0,
             time * 24 * 365);
}

function pnl_entry(x, type, quantity, premium, strike, volatility, time) {
  return pnl(x, type, quantity, premium, strike, volatility, time, 0, 0);
}

function pnl(x, type, quantity, premium, strike, volatility, time,
             volatilityChange, hoursPassed) {
  volatilityChange = volatilityChange ? volatilityChange : 0;
  hoursPassed = hoursPassed ? hoursPassed : 0;
  time = Math.max(time - toYears(0, hoursPassed), 0);
  volatility += volatilityChange;
  const compute = type === OptionType.CALL ? compute_call : compute_put;
  const future_premium = compute(x, strike, volatility, time);
  return quantity * (future_premium - premium);
}

function pnl_underlying(x, quantity, entry, hedgeOnly) {
  if (hedgeOnly && ((quantity < 0 && x > entry)
                    || (quantity > 0 && x < entry))) {
    return 0;
  } else {
    return quantity * (x / entry - 1);
  }
}

/* Probabilities auxiliary function */

// todo: this computation is inefficient, optimize using dynamic programming
function betweens(probs) {
  const n = probs.length;
  if (n === 0) {
    return [.5];
  }
  const betweens = [];
  for (let i = 0; i < n; i++) {
    let between = 0;
    for (let j = 0; j <= i; j++) {
      between += (-1) ** j * (.5 - probs[i - j]);
    }
    betweens.push(between);
  }
  betweens.push(probs[n - 1]);
  return betweens;
}

/* Miscellaneous auxiliary functions */

function compute_iv(type, price, strike, time, premium) {
  return type === OptionType.CALL
  ? compute_iv_call(price, strike, time, premium)
  : type === OptionType.PUT
  ? compute_iv_put(price, strike, time, premium)
  : NaN;
}

function toPercent(n) {
  return `${round_to(100 * n, 1)}%`;
}

function toDollars(n) {
  return `$${round_to(n, 2)}`
}
