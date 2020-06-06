import React from 'react';
import { useLocal } from '../../hooks/useStorage';

export default () => {
  const [okay, setOkay] = useLocal('hide-storage-disclaimer', {
    initialValue: false,
  });
  return (
    !okay && (
      <div style={{ width: '100%', position: 'fixed', bottom: 0 }}>
        <div
          className="
            w3-content
            w3-card
            w3-theme-l1
            w3-padding-large
            w3-center
            my-round-top
            w3-border"
          style={{ width: '80%' }}
        >
          <p>
            This website stores your preferences, notes, marked checkboxes and
            so on in your <b>local storage</b>. It's similar to using cookies,
            except that cookies are accessible by other websites. Information
            stored on your device through use of this website was never meant by
            this website's creator te be used for anything else but to customize
            this website only.
          </p>
          <button
            className="w3-btn w3-theme-d1 my-round w3-border"
            onClick={() => setOkay(true)}
          >
            Okay!
          </button>
        </div>
      </div>
    )
  );
};
