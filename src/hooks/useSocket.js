import { useRef, useEffect} from 'react';

export default (uri, { onopen, onclose, onmessage }) => {
  const socket = useRef(null);

  useEffect(() => {
    socket.current           = new WebSocket(uri);
    socket.current.onopen    = onopen;
    socket.current.onclose   = onclose;
    socket.current.onmessage = onmessage;
    return () => socket.current.close();
  }, [uri, onopen, onclose, onmessage]);
  
  return socket.current;
};