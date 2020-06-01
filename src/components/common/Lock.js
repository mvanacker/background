import React from 'react';
import { Lock, Unlock } from './Icons';

export default ({ locked, setLocked }) => {
  return locked ? (
    <Lock onClick={() => setLocked(false)} />
  ) : (
    <Unlock onClick={() => setLocked(true)} />
  );
};