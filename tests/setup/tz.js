/* global process */
// Dates in listings (ls -l, stat) render in the local zone; pin it so expectations hold on any machine
process.env.TZ = 'UTC'
