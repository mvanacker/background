import React, { useState, useRef, useEffect } from 'react';
import useInterval from '../../hooks/useInterval';
import beep from '../../assets/beep.mp3';

// Constant(s)
const INTERVAL = 100; // milliseconds
const VOLUME = 0.3; // from 0 to 1

// Time in seconds
const now = () => Math.floor(Date.now() / 1000);

// Trigger every 900 seconds (15 minutes)
const PERIOD = 900; // seconds
const isTrigger = (time) => time % PERIOD === 0;

export default () => {
  // Set up ticks
  const [time, setTime] = useState(now());
  const update = () => setTime(now());
  useInterval(update, INTERVAL);

  // Play sound on trigger
  const audio = useRef();
  if (audio.current && isTrigger(time)) {
    audio.current.play();
  }

  // Adjust volume (once)
  useEffect(() => {
    audio.current.volume = VOLUME;
  }, []);

  return (
    <>
      <audio ref={audio}>
        <source src={beep} type="audio/mpeg" />
      </audio>
      {PERIOD - (time % PERIOD)}
    </>
  );
};
