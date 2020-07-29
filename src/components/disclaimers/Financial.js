import React from 'react';
import Panel from '../common/Panel';
import { useSession, useLocal } from '../../hooks/useStorage';

export default ({ children }) => {
  const [agreed, setAgreed] = useSession('hide-disclaimer', {
    initialValue: false,
  });
  const [agreedOnce, setAgreedOnce] = useLocal('agreed-disclaimer', {
    intialValue: false,
  });
  const [remember, setRemember] = useLocal('remember-disclaimer', {
    intialValue: false,
  });
  return agreed || remember ? (
    children
  ) : (
    <div className="my-financial-disclaimer-container">
      <Panel
        title="Disclaimer"
        className="w3-center w3-mobile w3-content my-financial-disclaimer"
      >
        <div className="w3-padding-large">
          <p>
            Information on this website is not financial advice, nor should it
            be treated as a substitute for the services of a certified financial
            advisor.
          </p>
          <p>
            You are responsible for your own actions or lack thereof. You have
            the power to make up your own mind.
          </p>
        </div>
        <div className="w3-padding-large">
          <button
            className="w3-btn w3-theme-l2 w3-margin my-round"
            onClick={() => {
              setAgreed(true);
              setAgreedOnce(true);
            }}
          >
            I agree
          </button>
          {agreedOnce && (
            <div>
              <label>
                <input
                  type="checkbox"
                  className="my-check"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />{' '}
                Remember
              </label>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};
