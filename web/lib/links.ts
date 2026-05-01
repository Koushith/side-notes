// Single source of truth for download links and external URLs the landing
// page references. Update versions here when a new release ships.

export const REPO_URL = 'https://github.com/Koushith/side-deck';
export const ISSUES_URL = `${REPO_URL}/issues`;
export const RELEASES_URL = `${REPO_URL}/releases`;
export const LATEST_RELEASE_URL = `${RELEASES_URL}/latest`;

/** GitHub auto-redirects `/releases/latest/download/<asset>` to whichever
 *  asset is uploaded under the latest tag with that name. Naming follows
 *  electron-builder's defaults; if you change the productName or arch
 *  matrix, update these. */
export const DOWNLOADS = {
  macArm: `${RELEASES_URL}/latest`, // Pick the .dmg matching your Mac
  macIntel: `${RELEASES_URL}/latest`,
  windows: `${RELEASES_URL}/latest`,
  linux: `${RELEASES_URL}/latest`,
};
