// Every rafeyOS reducer looks its handler up by action type; an unknown type is a bug, so it throws.
export const createReducer = (name, handlers) => (state, action) => {
  const handler = handlers[action.type]
  if (!handler) throw new Error(`Unknown ${name} action: ${action.type}`)
  return handler(state, action)
}
