import { useEffect, useRef } from 'react';

// Dan Abramov https://overreacted.io/making-setinterval-declarative-with-react-hooks/
export default function useInterval(callback, delay) {
  const lastCallback = useRef(() => {});

  useEffect(() => {
    lastCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => lastCallback.current();
    tick();
    const handle = setInterval(tick, delay);
    return () => clearInterval(handle);
  }, [delay]);
}