import { useState, useEffect } from 'react';

export const get = (id)      => localStorage.getItem(id);
export const set = (id, val) => localStorage.setItem(id, val);

export default function useStorage(id, initialValue = null) {
  const storedValue = get(id);
  if (storedValue) {
    initialValue = storedValue;
  }
  const [value, setValue] = useState(initialValue);
  useEffect(() => set(id, value), [id, value]);
  return [value, setValue];
}