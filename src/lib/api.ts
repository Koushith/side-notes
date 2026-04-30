// Thin typed wrapper around the IPC bridge exposed by electron/preload.ts.
// Components import from here so we can swap the transport later if needed.

export const api = window.api;
