// Ubuntu 24.04's accent colours, as in the approved mockup
export const ACCENTS = Object.freeze(
  [
    ['Orange', '#E95420'],
    ['Bark', '#787859'],
    ['Sage', '#657B69'],
    ['Olive', '#4B8501'],
    ['Viridian', '#03875B'],
    ['Prussian green', '#308280'],
    ['Blue', '#0073E5'],
    ['Purple', '#7764D8'],
    ['Magenta', '#B34CB3'],
    ['Red', '#DA3450'],
  ].map(([name, hex]) => Object.freeze({ name, hex })),
)
