import React, { useState, useEffect } from 'react';
import { useLocal } from '../hooks/useStorage';
import DeribitWebSocket from '../sources/DeribitWebSocket';

export const DeribitContext = React.createContext();

export default ({ children }) => {
  const [test, setTest] = useLocal('deribit-test', { initialValue: true });
  const [readyState, setReadyState] = useState(0);
  const [authState, setAuthState] = useState(0);
  const [deribit, setDeribit] = useState(null);

  // WebSocket setup & cleanup
  useEffect(() => {
    let newDeribit, onReadyState, onAuthState;
    const setup = () => {
      newDeribit = new DeribitWebSocket({ test });
      onReadyState = () => setReadyState(newDeribit.readyState);
      onAuthState = () => setAuthState(newDeribit.authState);

      // Track connectivity in state, so changes update the DOM
      newDeribit.addEventListener('open', onReadyState);
      newDeribit.addEventListener('close', onReadyState);
      newDeribit.addEventListener('error', onReadyState);

      // Track authentication in state, so changes update the DOM
      newDeribit.addEventListener('authenticating', onAuthState);
      newDeribit.addEventListener('authenticated', onAuthState);
      newDeribit.addEventListener('reauthenticating', onAuthState);
      newDeribit.addEventListener('reauthenticated', onAuthState);
      newDeribit.addEventListener('loggingOut', onAuthState);

      // Reinitialize WebSocket on logout
      newDeribit.addEventListener('close', (e) => {
        if (e.reason === 'logout') {
          setup();
        }
      });

      setDeribit(newDeribit);
    };
    setup();

    // Cleanup
    const close = () => newDeribit.close();
    window.addEventListener('beforeunload', close);
    return () => {
      window.removeEventListener('beforeunload', close);
      newDeribit.removeEventListener('close', onReadyState);
      newDeribit.removeEventListener('error', onReadyState);
      close();
    };
  }, [test]);

  return (
    <DeribitContext.Provider
      value={{ deribit, readyState, authState, test, setTest }}
    >
      {children}
    </DeribitContext.Provider>
  );
};
