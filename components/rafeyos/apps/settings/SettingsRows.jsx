// GNOME Settings' building blocks: titled groups of boxed rows

/** @param {{ title?: string, note?: string, children: any }} props - note: a hint below the content */
export const Group = ({ title, note, children }) => (
  <div className="grp">
    {title && <h4>{title}</h4>}
    {children}
    {note && <p>{note}</p>}
  </div>
)

/** A titled group whose rows sit in one rounded box, the usual case. */
export const BoxedGroup = ({ title, note, children }) => (
  <Group title={title} note={note}>
    <div className="boxed">{children}</div>
  </Group>
)

/** A row: title (with an optional subtitle) on the left, its control or value on the right. */
export const Row = ({ title, subtitle, children, className = 'row' }) => (
  <div className={className}>
    <span className="rt">
      {title}
      {subtitle && <small>{subtitle}</small>}
    </span>
    {children}
  </div>
)

export const ValueRow = ({ title, value, selectable = false }) => (
  <Row title={title}>
    <span className={selectable ? 'rv seltext' : 'rv'}>{value}</span>
  </Row>
)

export const Page = ({ children }) => <div className="page">{children}</div>
