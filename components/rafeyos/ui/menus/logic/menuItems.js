// Context-menu entries as plain data: the shell's ContextMenu renders them; builders stay pure.

export const MENU_ITEM_KINDS = Object.freeze({ ITEM: 'item', SEPARATOR: 'separator', HEADING: 'heading' })

/** An entry without an action is shown disabled, as GNOME shows features that aren't there. */
export const menuItem = (label, action = null) =>
  Object.freeze({ kind: MENU_ITEM_KINDS.ITEM, label, action, disabled: !action })

export const disabledItem = (label) => menuItem(label, null)

/** One of a set of options, GTK dropdown style: an optional icon, and a check on the current one. */
export const choiceItem = ({ label, icon = null, checked, action }) =>
  Object.freeze({ kind: MENU_ITEM_KINDS.ITEM, label, icon, checked: Boolean(checked), action, disabled: false })

export const SEPARATOR = Object.freeze({ kind: MENU_ITEM_KINDS.SEPARATOR })

export const menuHeading = (label) => Object.freeze({ kind: MENU_ITEM_KINDS.HEADING, label })
