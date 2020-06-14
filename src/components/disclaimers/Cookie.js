import React from 'react';
import { useLocal } from '../../hooks/useStorage';

export default () => {
  const [hide, setHide] = useLocal('hide-storage-disclaimer', {
    initialValue: false,
  });
  return (
    !hide && (
      <div className="my-cookie-disclaimer-container">
        <div className="w3-content w3-card w3-theme-l1 w3-padding-large w3-center my-round-top w3-border my-cookie-disclaimer">
          <p>
            This website stores your preferences, notes, marked checkboxes and
            so on in your <b>local storage</b>. It's similar to using cookies,
            but neither are great. This application's creator allowed use of
            this application to store information on your device with the sole
            purpose of customizing this application and nothing else.
          </p>
          <button
            className="w3-btn w3-theme-d1 my-round w3-border"
            onClick={() => setHide(true)}
          >
            Okay!
          </button>
        </div>
      </div>
    )
  );
};
