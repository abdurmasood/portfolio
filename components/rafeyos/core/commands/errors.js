// @ts-check
// What each errno reads as, in GNU's words. Commands own the shape of their message ("rm: cannot remove 'x': …");
// this file only supplies the part after the last colon.

/**
 * @import { Errno } from '@/components/rafeyos/core/vfs/fsOps'
 * @import { FsCommitResult } from '@/components/rafeyos/core/vfs/fsStore'
 */

/** @typedef {Errno | 'ENOSPC' | 'EROFS'} ShellErrno the filesystem's errnos plus the two storage can cause */

/** @type {Readonly<Record<ShellErrno, string>>} */
const STRERROR = Object.freeze({
  EACCES: 'Permission denied',
  ENOENT: 'No such file or directory',
  EEXIST: 'File exists',
  ENOTDIR: 'Not a directory',
  EISDIR: 'Is a directory',
  ENOTEMPTY: 'Directory not empty',
  EINVAL: 'Invalid argument',
  ENAMETOOLONG: 'File name too long',
  EPERM: 'Operation not permitted',
  ELOOP: 'Too many levels of symbolic links',
  ENOSPC: 'No space left on device',
  EROFS: 'Read-only file system',
})

/**
 * The GNU strerror text for an errno.
 * @param {ShellErrno} errno
 */
export const errnoText = (errno) => STRERROR[errno]

/**
 * The errno a failed store call stands for (Claude's call 4): full storage is ENOSPC, storage that refuses every
 * write is EROFS, and an fsOps refusal keeps its own.
 * @param {Exclude<FsCommitResult, { ok: true }>} failure
 * @returns {ShellErrno}
 */
export const failureErrno = (failure) => {
  if ('errno' in failure) return failure.errno
  return failure.reason === 'full' ? 'ENOSPC' : 'EROFS'
}
