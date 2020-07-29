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
            This website uses{' '}
            <a href="https://w3.org/TR/webstorage">web storage</a> to save your
            preferences on your computer. This website does absolutely{' '}
            <b>no tracking</b> of any kind.
          </p>
          <button
            className="w3-btn w3-theme-d1 my-round w3-border"
            onClick={() => setHide(true)}
          >
            I accept
          </button>
        </div>
      </div>
    )
  );
};
