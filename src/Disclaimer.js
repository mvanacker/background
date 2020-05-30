import React from 'react';
import Panel from './components/common/Panel';
import useStorage from './hooks/useStorage';

const DISCLAIMER_WIDTH = '580px';

export default ({ children }) => {
  const [agreed, setAgreed] = useStorage('hide-disclaimer', {
    initialValue: false,
  });
  return agreed ? children : <div style={{
    display: 'table',
    height:  '100vh',
    width:   '100%',
  }}>
    <div style={{ display: 'table-cell', verticalAlign: 'middle' }}>
      <Panel
        title="Disclaimer"
        margin={false}
        className="w3-center w3-mobile w3-content"
        style={{
          maxWidth: DISCLAIMER_WIDTH,
          width:    DISCLAIMER_WIDTH,
        }}
      >
        <div className="w3-padding-large">
          <p>
            Information on this website is not financial advice,
            nor should it be treated as a substitute
            for the services of a certified financial advisor.
          </p>
          <p>
            You are responsible for your own actions or lack thereof.
            You have the power to make up your own mind.
          </p>
        </div>
        <button
          className="w3-btn w3-theme-l2 w3-margin my-round"
          onClick={() => setAgreed(true)}
        >
          I agree
        </button>
      </Panel>
    </div>
  </div>;
};