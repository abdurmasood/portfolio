// @ts-check
// Every rafeyOS reducer looks its handler up by action type; an unknown type is a bug, so it throws.

/**
 * A reducer's actions, described as a map from action type to payload. Each action is its
 * payload plus `type`, so a missing or misspelt field fails `pnpm typecheck` at the sender.
 * @template {Record<string, object>} Payloads
 * @typedef {{ [T in keyof Payloads & string]: { type: T } & Payloads[T] }[keyof Payloads & string]} ActionOf
 */

/**
 * One handler per action type, each given that type's payload.
 * @template S
 * @template {Record<string, object>} Payloads
 * @typedef {{ readonly [T in keyof Payloads & string]: (state: S, action: Payloads[T]) => S }} HandlerMap
 */

/**
 * @template S
 * @template {Record<string, object>} Payloads
 * @param {string} name
 * @param {HandlerMap<S, Payloads>} handlers
 * @returns {(state: S, action: ActionOf<Payloads>) => S}
 */
export const createReducer = (name, handlers) => {
  /**
   * Generic over the type, so the handler and the action are looked up by the same key.
   * @template {keyof Payloads & string} T
   * @param {S} state
   * @param {{ type: T } & Payloads[T]} action
   * @returns {S}
   */
  const reduce = (state, action) => {
    const handler = handlers[action.type]
    if (!handler) throw new Error(`Unknown ${name} action: ${action.type}`)
    return handler(state, action)
  }
  return reduce
}
