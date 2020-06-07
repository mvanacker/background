import { APP_NAME, APP_VERSION } from '../config';

export default class extends WebSocket {
  constructor({ test = true } = {}) {
    if (test) {
      super('wss://test.deribit.com/ws/api/v2');
    } else {
      super('wss://www.deribit.com/ws/api/v2');
    }

    // Handle open
    this.onopen = (e) => {
      console.log("Connected to Deribit's WebSocket.", e);

      // Start heartbeat
      this.send({
        method: 'public/set_heartbeat',
        params: { interval: 30 },
      });

      // Introduce ourselves to Deribit
      this.send({
        method: 'public/hello',
        params: {
          client_name: APP_NAME,
          client_version: APP_VERSION,
        },
      });
    };

    // Debug version of message handler
    this.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (
        // Only log responses to our requests
        'id' in message &&
        // But ignore responses to heartbeats
        this.messages[message.id].method !== 'public/test'
      ) {
        console.log('Received from Deribit: ', message);
      }
      this.receive(message);
    };
    // this.onmessage = ({ data }) => this.receive(JSON.parse(data));

    // Handle close
    this.onclose = (e) => console.log('Disconnected from Deribit', e);

    // Handle error
    this.maybeDown = false;
    this.onerror = (e) => {
      console.error(
        'An error occured while trying to communicate with Deribit.',
        e
      );
      this.maybeDown = true;
    };

    // General fields
    this.id = 0;
    this.messages = [];
    this.promises = [];

    // Authentication field(s)
    this.authState = AuthState.NOT_AUTHENTICATED;
    this.authentication = null;

    // Subscription
    this.publicCallbacks = {};
    this.privateCallbacks = {};
  }

  // Send message to Deribit
  send = ({ method, params = {} }) => {
    // Generally work around early calls
    if (
      this.readyState === ReadyState.CONNECTING ||
      this.authState === AuthState.REAUTHENTICATING
    ) {
      const event =
        this.readyState === ReadyState.CONNECTING ? 'open' : 'reauthenticated';
      return new Promise((resolve, reject) => {
        this.addEventListener(event, () => {
          this.send({ method, params }).then(resolve).catch(reject);
        });
      });
    }

    // Add access_token to private methods
    if (/^\/?private/i.test(method)) {
      params.access_token = this.authentication.access_token;
    }

    // Promise which resolves to Deribit's response
    const promise = new Promise((resolve, reject) => {
      this.promises[this.id] = (response) => {
        const { id, error, result } = response;

        if (error) {
          reject(new DeribitError(id, this.messages[id], error));
        } else if (result || result === 0) {
          resolve(response);
        } else {
          // TODO will this ever happen in production?
          // Update: warning triggered once but when result === 0
          console.warn(
            `Response ${id} contained no error nor result.`,
            response
          );
        }
      };
    });

    // Construct and send message
    const message = {
      jsonrpc: '2.0',
      id: this.id,
      method,
      params,
    };
    this.messages[this.id] = message;
    super.send(JSON.stringify(message));

    // TODO debug
    if (method !== 'public/test') {
      console.log(`Sent request ${this.id} to deribit: `, message);
    }

    // Increment id
    this.id++;

    return promise;
  };

  // Receive message from Deribit
  receive = (message) => {
    const { id, method, params } = message;

    // Resolve associated promise
    if (id || id === 0) {
      this.promises[id](message);
    }

    // Handle unidentified messages
    else {
      switch (method) {
        // Respond to heartbeats
        case 'heartbeat':
          if (params.type === 'test_request') {
            this.send({ method: 'public/test' });
          }
          break;

        // Execute appropriate callback on messages from subscribed channels
        case 'subscription':
          const { channel } = params;
          const _channel = channel.toLowerCase();
          if (_channel in this.publicCallbacks) {
            this.publicCallbacks[_channel](params);
          } else if (_channel in this.privateCallbacks) {
            this.privateCallbacks[_channel](params);
          } else {
            console.warn(`Could not find callback for channel: ${_channel}`);
          }
          break;

        // Warn about messages which weren't recognized
        default:
          console.warn('Failed to categorize message: ', message);
          break;
      }
    }
  };

  // Authenticate with Deribit
  auth = async ({ key, secret }) => {
    this.authState = AuthState.AUTHENTICATING;
    this.dispatchEvent(new Event('authenticating'));

    // Authenticate, save the tokens and other information
    return this.send({
      method: 'public/auth',
      params: {
        grant_type: 'client_credentials',
        client_id: key,
        client_secret: secret,
      },
    }).then(({ result }) => {
      this.authState = AuthState.AUTHENTICATED;
      this.authentication = result;
      this.dispatchEvent(new Event('authenticated'));

      // Start reauthentication loop
      this.reauthLoop();
    });
  };

  // Reauthenticate with Deribit; note this is a bit of an academic exercise
  // since Deribit authentications last a year at a time at time of writing
  reauthLoop = () => {
    const reauth = () => {
      this.send({
        method: 'public/auth',
        params: {
          grant_type: 'refresh_token',
          refresh_token: this.authentication.refresh_token,
        },
      }).then(({ result }) => {
        this.authState = AuthState.AUTHENTICATED;
        this.authentication = result;
        this.dispatchEvent(new Event('reauthenticated'));
  
        // Loop
        this.reauthLoop();
      });
      this.authState = AuthState.REAUTHENTICATING;
      this.dispatchEvent(new Event('reauthenticating'));
    };
  
    // Set delay to half the expiration time
    let delay = (this.authentication.expires_in * 1000) / 2;
    // But actually the delay can't be larger than a 32-bit integer max value
    // either because otherwise the callback will fire immediately
    delay = Math.min(2147483647, delay);
    const handle = setTimeout(reauth, delay);
    this.addEventListener('close', () => clearTimeout(handle));
  };

  // Log out from Deribit
  logout = async () => {
    this.authState = AuthState.LOGGING_OUT;
    this.dispatchEvent(new Event('loggingOut'));
    return this.send({
      method: 'private/logout',
    });
  };

  // Subscribe to channels, register callbacks
  subscribe = async (method, newCallbacks, callbacks) => {
    for (const channel in newCallbacks) {
      // Warn for now; TODO perhaps throw an error or ignore or do something
      if (channel.toLowerCase() in callbacks) {
        console.warn(`Duplicate subscription to ${channel}`);
      }
      callbacks[channel.toLowerCase()] = newCallbacks[channel];
    }

    // Request subscription
    const channels = Object.keys(newCallbacks);
    this.send({ method, params: { channels } });
  };

  publicSubscribe = async (callbacks) => {
    this.subscribe('public/subscribe', callbacks, this.publicCallbacks);
  };

  privateSubscribe = async (callbacks) => {
    this.subscribe('private/subscribe', callbacks, this.privateCallbacks);
  };

  // Unsubscribe from channels, unregister callbacks
  unsubscribe = async (method, channels, callbacks) => {
    this.send({ method, params: { channels } });
    channels.forEach((channel) => delete callbacks[channel.toLowerCase()]);
  };

  publicUnsubscribe = async (channels) => {
    this.unsubscribe('public/unsubscribe', channels, this.publicCallbacks);
  };

  privateUnsubscribe = async (channels) => {
    this.unsubscribe('private/unsubscribe', channels, this.privateCallbacks);
  };
}

// To be thrown when receiving a response containing an error from Deribit
export class DeribitError extends Error {
  constructor(id, request, { message, data, code }) {
    super(
      `Response ID ${id}, code ${code}: ${message}${
        data ? ` ${JSON.stringify(data)}` : ''
      }. Original request: ${JSON.stringify(request)}`
    );
    this.name = 'DeribitError';
    this.id = id;
    this.request = request;
    this.response = { message, data, code };
    this.code = code;
  }

  toString = () => {
    const {
      code,
      request: { params } = {},
      response: { message, data: { reason, param } = {} },
    } = this;
    return `[${code}] ${message}
    ${
      reason &&
      `: ${reason}${param && `: ${param} was ${JSON.stringify(params[param])}`}`
    }`;
  };
}

export const ReadyState = {
  CONNECTING: 0,
  CONNECTED: 1,
  CLOSING: 2,
  CLOSED: 3,
};

export const AuthState = {
  NOT_AUTHENTICATED: 0,
  AUTHENTICATING: 1,
  AUTHENTICATED: 2,
  LOGGING_OUT: 3,
  REAUTHENTICATING: 4,
};
