import { STORAGE_KEYS } from "./config.js";

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getData() {
  const value = readJson(STORAGE_KEYS.data, []);
  return Array.isArray(value) ? value : [];
}
export function setData(value) {
  writeJson(STORAGE_KEYS.data, value);
}
export function getConfig() {
  return readJson(STORAGE_KEYS.config, { apiUrl: "", ownerName: "" });
}
export function setConfig(value) {
  writeJson(STORAGE_KEYS.config, value);
}
export function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || "light";
}
export function setTheme(value) {
  localStorage.setItem(STORAGE_KEYS.theme, value);
}
