import { useState, useEffect } from 'react';

export const get = (id) => localStorage.getItem(id);
export const set = (id, val) => localStorage.setItem(id, val);
export const remove = (id) => localStorage.removeItem(id);

export default function useStorage(
  id,
  { initialValue = '', stateOnly = false } = {}
) {
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
  const removeValue = () => localStorage.removeItem(id);

  // Provide similar interface to useState
  return [value, setValue, removeValue];
}
