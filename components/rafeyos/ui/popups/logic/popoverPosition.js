// @ts-check
// Where an anchored popover sits: centred under its anchor, or over it when there's no room below. Pure.

const EDGE_GAP = 6
// Room for the arrow between the anchor and the popover
const ARROW_GAP = 10
const TOP_BAR = 34
// The arrow keeps clear of the rounded corners even when the anchor is at the screen's edge
const ARROW_INSET = 16

/**
 * @typedef {{ x: number, y: number, w: number, h: number }} Rect a point is a rect with no size
 * @typedef {{ left: number, top: number, above: boolean, arrowX: number }} PopoverPlacement arrowX: from the popover's left edge
 */

/**
 * @param {Rect} anchor
 * @param {{ w: number, h: number }} size the popover's measured size
 * @param {{ w: number, h: number }} viewport
 * @returns {PopoverPlacement}
 */
export const popoverPosition = (anchor, size, viewport) => {
  const centre = anchor.x + anchor.w / 2
  const left = Math.max(EDGE_GAP, Math.min(centre - size.w / 2, viewport.w - size.w - EDGE_GAP))
  const below = anchor.y + anchor.h + ARROW_GAP
  const above = below + size.h > viewport.h - EDGE_GAP && anchor.y - ARROW_GAP - size.h >= TOP_BAR
  const top = above ? anchor.y - ARROW_GAP - size.h : Math.max(TOP_BAR, Math.min(below, viewport.h - size.h - EDGE_GAP))
  const arrowX = Math.max(ARROW_INSET, Math.min(centre - left, size.w - ARROW_INSET))
  return { left, top, above, arrowX }
}
