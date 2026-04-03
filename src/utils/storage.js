export async function get(keys) {
  return chrome.storage.local.get(keys);
}

export async function set(items) {
  return chrome.storage.local.set(items);
}
