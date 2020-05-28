import { useRef, useEffect} from 'react';

export default (uri, { onopen, onclose, onmessage, onerror }) => {
  const socket = useRef(null);

  useEffect(() => {
    socket.current = new WebSocket(uri);
    return () => socket.current.close();
  }, [uri]);

  useEffect(() => {
    socket.current.onopen    = onopen;
    socket.current.onclose   = onclose;
    socket.current.onmessage = onmessage;
    socket.current.onerror   = onerror;
  }, [onopen, onclose, onmessage, onerror]);
  
  return socket.current;
};