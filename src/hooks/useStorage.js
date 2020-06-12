import { useState, useEffect } from 'react';

const localFuncs = {
  get: (id) => localStorage.getItem(id),
  set: (id, val) => localStorage.setItem(id, val),
  remove: (id) => localStorage.removeItem(id),
};

export const useLocal = (id, options) => useStorage(id, options, localFuncs);

const sessionFuncs = {
  get: (id) => sessionStorage.getItem(id),
  set: (id, val) => sessionStorage.setItem(id, val),
  remove: (id) => sessionStorage.removeItem(id),
};

export const useSession = (id, options) =>
  useStorage(id, options, sessionFuncs);

const useStorage = (
  id,
  {
    initialValue = '',
    stateOnly = false,
    stringify = JSON.stringify,
    parse = JSON.parse,
  } = {},
  { get, set, remove }
) => {
  // Retrieve initial value from storage
  if (!stateOnly) {
    const storedValue = get(id);
    if (storedValue) {
      initialValue = parse(storedValue);
    }
  }

  // Setup state
  const [value, setValue] = useState(initialValue);

  // Update storage after render
  useEffect(() => {
    if (!stateOnly) {
      set(id, stringify(value));
    }
  }, [id, value, stateOnly, stringify, set]);

  // Define function to remove a value
  const removeValue = () => remove(id);

  // Provide similar interface to useState
  return [value, setValue, removeValue];
};
