// The boot splash; also app/rafeyos/page.jsx's loading state, so styled by boot.css alone

/** @param {{ onSkip?: () => void }} props - a click skips the boot */
export const BootSplash = ({ onSkip }) => (
  <div className="rafeyos-boot" onClick={onSkip} role="status" aria-label="Starting rafeyOS">
    <div className="lg">
      rafey<b>OS</b>
    </div>
    <div className="spin" />
  </div>
)
