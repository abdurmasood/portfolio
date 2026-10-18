// GNOME's on/off switch, shared by the calendar and Settings

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
