import React, { useContext, Fragment, Component } from 'react';

import { Link } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';

import { DATA_URI } from '../config';

import VolumeFlowChart from './VolumeFlowChart';
import Panel from './common/Panel';
import { Loading128 } from './common/Icons';
import { useLocal } from '../hooks/useStorage';
import { DeribitContext } from '../contexts/Deribit';

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // static
      refreshRate: 1000,
      recentTradesCount: 100,

      // dynamic
      recentTrades: [],
      fearAndGreed: {},
      dominance: NaN,
    };
  }

  componentDidMount() {
    const update = () => {
      // Fetch data
      Promise.all(
        [
          {
            link: `${DATA_URI}/data/recent-trades.json`,
            onsuccess: (response) => response.json(),
            onfailure: () => this.state.recentTrades,
          },
          {
            link: `${DATA_URI}/data/fear-and-greed.json`,
            onsuccess: (response) => response.json(),
            onfailure: () => this.state.fearAndGreed,
          },
          {
            link: `${DATA_URI}/data/bitcoin-dominance.txt`,
            onsuccess: (response) => response.text(),
            onfailure: () => this.state.dominance,
          },
        ].map(({ link, onsuccess, onfailure }) =>
          fetch(link).then(onsuccess).catch(onfailure)
        )
      ).then((responses) => {
        // Transform data
        let [recentTrades, fearAndGreed, dominance] = responses;
        recentTrades = recentTrades.slice(0, this.state.recentTradesCount);
        recentTrades.forEach((trade) => (trade.size = parseInt(trade.size)));
        fearAndGreed = fearAndGreed.data
          ? fearAndGreed.data[0]
          : this.state.fearAndGreed;
        dominance = Math.round(parseFloat(dominance) * 100) / 100;

        // Update state
        this.setState({
          recentTrades,
          fearAndGreed,
          dominance,
        });
      });
    };
    update();
    this.priceInterval = setInterval(update, this.state.refreshRate);
  }

  componentWillUnmount() {
    clearInterval(this.priceInterval);
  }

  render() {
    return (
      <div className="my-left-inner-container">
        <Title />
        <div className="my-full-stretch my-left">
          {isNaN(this.state.dominance) ? (
            <div className="my-flex my-full-stretch">
              <Loading128 className="my-margin-auto" />
            </div>
          ) : (
            <>
              <Notes />
              <Overview state={this.state} />
              <VolumeFlowChart />
              <BitmexRecentTrades data={this.state.recentTrades} />
              <Logout />
            </>
          )}
        </div>
      </div>
    );
  }
}

function Title() {
  return (
    <Link to="/" className="my-no-decoration">
      <div className="w3-hover-theme w3-card w3-container w3-theme-d3 my-round-bottom-right my-title">
        <h1>Maurits'</h1>
      </div>
    </Link>
  );
}

const Notes = () => {
  const [notes, setNotes] = useLocal('notes');
  return (
    <Panel>
      <TextareaAutosize
        placeholder="Write notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w3-input w3-theme-l4 w3-round-large my-notes"
        minRows={2}
      />
    </Panel>
  );
};

function Overview(props) {
  const { dominance, fearAndGreed } = props.state;
  return (
    <Panel>
      <div className="my-overview">
        <div className="w3-right-align">Dominance</div>
        <div className="w3-left-align">{dominance}%</div>
        <div className="w3-right-align">Fear and Greed</div>
        <div className="w3-left-align">
          {fearAndGreed.value}{' '}
          <small>({fearAndGreed.value_classification})</small>
        </div>
      </div>
    </Panel>
  );
}

const BitmexRecentTrades = ({ data }) =>
  !data.length ? null : (
    <Panel>
      <div className="my-recent-trades monospace w3-large">
        {data.map(({ timestamp, side, size, price }, i) => {
          const sideClass = side === 'Buy' ? 'my-text-lime' : 'my-text-red';
          return (
            <Fragment key={i}>
              <div className={`my-recent-trades-time ${sideClass}`}>
                {timestamp.split(' ')[1].split('.')[0]}
              </div>
              <div
                className={`my-recent-trades-side ${sideClass} my-uppercase w3-right-align`}
              >
                {side}
              </div>
              <div className={`my-recent-trades-size ${sideClass}`}>
                {squish(size)}
              </div>
              <div
                className={`my-recent-trades-price ${sideClass} w3-left-align`}
              >
                {price}
              </div>
            </Fragment>
          );
        })}
      </div>
    </Panel>
  );

const squish = (size) => {
  const first = Math.trunc(size / 100000);
  const trunc = first % 10 === 0 ? Math.trunc : (x) => x;
  return `${trunc(first / 10)}M`;
};

const Logout = () => {
  const { deribit } = useContext(DeribitContext);
  return (
    <div>
      <button
        className="w3-btn w3-card w3-theme-l2 my-round my-opaquer-fader my-full-width"
        type="button"
        onClick={() => deribit.logout()}
      >
        Log out from Deribit
      </button>
    </div>
  );
};
