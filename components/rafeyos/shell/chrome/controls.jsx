// The GNOME controls shared by Quick Settings, the calendar, Music and Settings

const PERCENT = 100

/** How much of the track is filled, as the CSS custom property the .sl track reads. */
export const sliderFill = (value, min, max) => `${max > min ? ((value - min) / (max - min)) * PERCENT : 0}%`

/**
 * A range slider with GNOME's accent fill.
 * @param {{ value: number, onChange: (value: number) => void, label: string,
 *   range?: { min: number, max: number, step?: number }, style?: object }} props
 */
export const Slider = ({ value, onChange, label, range = { min: 0, max: PERCENT }, style }) => (
  <input
    className="sl"
    type="range"
    min={range.min}
    max={range.max}
    step={range.step}
    value={value}
    aria-label={label}
    style={{ ...style, '--p': sliderFill(value, range.min, range.max) }}
    onChange={(event) => onChange(Number(event.target.value))}
  />
)

/** @param {{ on: boolean, label: string, onToggle?: () => void }} props */
export const Switch = ({ on, label, onToggle }) => (
  <button
    type="button"
    className={on ? 'sw on' : 'sw'}
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onToggle}
  />
)
