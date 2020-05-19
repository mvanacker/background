export default function setYearlyCookie(cookies, key, value, path) {
  const expires = new Date();
  expires.setFullYear(new Date().getFullYear() + 1);
  cookies.set(key, value, { path, expires });
}