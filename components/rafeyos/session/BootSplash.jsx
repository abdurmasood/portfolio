// The boot splash; also app/rafeyos/page.jsx's loading state, so styled by boot.css alone

/** @param {{ onSkip?: () => void, accent?: string }} props - a click skips the boot; accent colours "OS" */
export const BootSplash = ({ onSkip, accent }) => (
  <div
    className="rafeyos-boot"
    style={accent ? { '--accent': accent } : undefined}
    onClick={onSkip}
    role="status"
    aria-label="Starting rOS"
  >
    <div className="lg">
      r<b>OS</b>
    </div>
    <div className="spin" />
  </div>
)
