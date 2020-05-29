import { useState, useEffect } from 'react';

export const get = (id)      => localStorage.getItem(id);
export const set = (id, val) => localStorage.setItem(id, val);

export default function useStorage(id, initialValue = '') {
  const storedValue = get(id);
  if (storedValue) {
    initialValue = JSON.parse(storedValue);
  }
  const [value, setValue] = useState(initialValue);
  useEffect(() => set(id, JSON.stringify(value)), [id, value]);
  return [value, setValue];
}