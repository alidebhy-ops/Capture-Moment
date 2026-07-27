const ensuredTabs = new Map<string, Promise<number>>();

// Creating a tab and writing its header row costs two to three Sheets calls.
// Those calls ran on every single read, ahead of the read itself. A tab that
// exists will not vanish underneath a running server, so verifying it once per
// process is enough. A failed setup is forgotten so the next request retries.
export function ensureTabOnce(
  key: string,
  setup: () => Promise<number>
): Promise<number> {
  const existing = ensuredTabs.get(key);
  if (existing) return existing;

  const pending = setup().catch((error) => {
    ensuredTabs.delete(key);
    throw error;
  });
  ensuredTabs.set(key, pending);
  return pending;
}
