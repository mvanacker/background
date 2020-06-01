import { useState, useEffect } from 'react';

export const useLocal = (id, options) =>
  useStorage(id, options, {
    get: (id) => localStorage.getItem(id),
    set: (id, val) => localStorage.setItem(id, val),
    remove: (id) => localStorage.removeItem(id),
  });

export const useSession = (id, options) =>
  useStorage(id, options, {
    get: (id) => sessionStorage.getItem(id),
    set: (id, val) => sessionStorage.setItem(id, val),
    remove: (id) => sessionStorage.removeItem(id),
  });

const useStorage = (
  id,
  { initialValue = '', stateOnly = false } = {},
  { get, set, remove }
) => {
  // Retrieve initial value from storage
  if (!stateOnly) {
    const storedValue = get(id);
    if (storedValue) {
      initialValue = JSON.parse(storedValue);
    }
  }

  // Setup state
  const [value, setValue] = useState(initialValue);

  // Update storage after render
  useEffect(() => {
    if (!stateOnly) {
      set(id, JSON.stringify(value));
    }
  }, [id, value, stateOnly]);

  // Define function to remove a value
  const removeValue = () => remove(id);

  // Provide similar interface to useState
  return [value, setValue, removeValue];
};
