// Shared wording for a write the browser refused, so the Editor and the Trash menus say the same thing
const FULL_BODY = "This browser's storage is full."
const BLOCKED_BODY = 'This browser blocked saving the file.'

/**
 * The notification body for a failed file write. Only a full store has its own wording; any other
 * refusal (blocked storage, a newer tab's data, a file another tab moved) reads as blocked, as before.
 * @param {string} reason
 * @returns {string}
 */
export const reasonBody = (reason) => (reason === 'full' ? FULL_BODY : BLOCKED_BODY)

/**
 * Whether a failed write was the browser refusing to store it, rather than the files having changed
 * under it (another tab trashed or emptied them first), which needs no message.
 * @param {string} reason
 * @returns {boolean}
 */
export const isStorageFailure = (reason) => reason === 'full' || reason === 'blocked'
