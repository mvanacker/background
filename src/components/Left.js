import React, { Fragment, Component } from 'react';

import { Link } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';

import { DATA_URI } from '../config';

import VolumeFlowChart from './VolumeFlowChart';
import Panel from './common/Panel';
import LabeledRow from './common/LabeledRow';
import { Loading128 } from './common/Icons';
import { useLocal } from '../hooks/useStorage';

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
      <>
        <Title />
        <div className="my-full-stretch my-left">
          {isNaN(this.state.dominance) ? (
            <div className="my-display-flex my-full-stretch">
              <Loading128 className="my-margin-auto" />
            </div>
          ) : (
            <>
              <Notes />
              <Overview state={this.state} />
              <VolumeFlowChart />
              <BitmexRecentTrades data={this.state.recentTrades} />
            </>
          )}
        </div>
      </>
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
      <ul className="w3-ul">
        <li>
          <LabeledRow label="Dominance">{dominance}%</LabeledRow>
        </li>
        <li>
          <LabeledRow label="Fear and Greed">
            {fearAndGreed.value}{' '}
            <small>({fearAndGreed.value_classification})</small>
          </LabeledRow>
        </li>
      </ul>
    </Panel>
  );
}

const BitmexRecentTrades = ({ data }) => (
  <Panel>
    <div className="my-recent-trades monospace w3-large">
      {data.map(({ timestamp, side, size, price }, i) => {
        const sideClass =
          side === 'Buy' ? 'my-recent-trades-buy' : 'my-recent-trades-sell';
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
