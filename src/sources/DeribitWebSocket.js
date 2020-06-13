import hmacSHA256 from 'crypto-js/hmac-sha256';
import cryptoRandomString from 'crypto-random-string';
import { APP_NAME, APP_VERSION } from '../config';

export default class extends WebSocket {
  constructor({ test = true, verbose = false } = {}) {
    if (test) {
      super('wss://test.deribit.com/ws/api/v2');
    } else {
      super('wss://www.deribit.com/ws/api/v2');
    }
    this.verbose = verbose;

    // Handle open
    this.onopen = (e) => {
      if (verbose) {
        console.log("Connected to Deribit's WebSocket.", e);
      }

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

    // Handle message
    if (verbose) {
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
    } else {
      this.onmessage = ({ data }) => this.receive(JSON.parse(data));
    }

    // Handle close
    this.onclose = (e) => {
      if (verbose) {
        console.log('Disconnected from Deribit', e);
      }
    };

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
    this.publicSubscriptions = {};
    this.privateSubscriptions = {};
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

    // Log message if in verbose mode
    if (this.verbose && method !== 'public/test') {
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
          const channel = params.channel.toLowerCase();
          if (channel in this.publicSubscriptions) {
            this.publicSubscriptions[channel].forEach((callback) =>
              callback(params)
            );
          } else if (channel in this.privateSubscriptions) {
            this.privateSubscriptions[channel].forEach((callback) =>
              callback(params)
            );
          } else {
            console.warn(`Could not find any callback for channel: ${channel}`);
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
        grant_type: 'client_signature',
        client_id: key,
        ...this.sign(secret),
      },
    }).then((response) => {
      this.authState = AuthState.AUTHENTICATED;
      this.authentication = response.result;
      this.dispatchEvent(new Event('authenticated'));

      // Start reauthentication loop
      this.reauthLoop();

      return response;
    });
  };

  // Generate a signature
  sign = (secret) => {
    const timestamp = Date.now();
    const nonce = cryptoRandomString({ length: 64 });
    const data = cryptoRandomString({ length: 64 });
    const message = `${timestamp}\n${nonce}\n${data}`;
    const signature = hmacSHA256(message, secret).toString();
    return { timestamp, nonce, data, signature };
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
  subscribe = async (method, newSubscriptions, subscriptions) => {
    if (!newSubscriptions || !Object.keys(newSubscriptions).length) {
      console.warn('No channels were passed to subscribe to.');
      return;
    }

    // Save callback
    Object.entries(newSubscriptions).forEach(([channel, callback]) => {
      const channelLC = channel.toLowerCase();
      if (!(channelLC in subscriptions)) {
        subscriptions[channelLC] = new Set();
      }
      subscriptions[channelLC].add(callback);
    });

    // Request subscription
    const channels = Object.keys(newSubscriptions);
    this.send({ method, params: { channels } });
  };

  publicSubscribe = async (subscriptions) => {
    this.subscribe('public/subscribe', subscriptions, this.publicSubscriptions);
  };

  privateSubscribe = async (subscriptions) => {
    this.subscribe(
      'private/subscribe',
      subscriptions,
      this.privateSubscriptions
    );
  };

  // Unsubscribe from channels, unregister callbacks
  unsubscribe = async (method, oldSubscriptions, subscriptions) => {
    if (!oldSubscriptions || !Object.keys(oldSubscriptions).length) {
      console.warn('No channels were passed to unsubscribe from.');
      return;
    }

    // Request unsubscription
    const channels = Object.keys(oldSubscriptions);
    this.send({ method, params: { channels } });

    // Delete callback
    Object.entries(oldSubscriptions).forEach(([channel, callback]) => {
      const channelLC = channel.toLowerCase();
      console.log(channelLC);
      subscriptions[channelLC].delete(callback);
      if (subscriptions[channelLC].size === 0) {
        delete subscriptions[channelLC];
      }
    });
  };

  publicUnsubscribe = async (subscriptions) => {
    this.unsubscribe(
      'public/unsubscribe',
      subscriptions,
      this.publicSubscriptions
    );
  };

  privateUnsubscribe = async (subscriptions) => {
    this.unsubscribe(
      'private/unsubscribe',
      subscriptions,
      this.privateSubscriptions
    );
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
