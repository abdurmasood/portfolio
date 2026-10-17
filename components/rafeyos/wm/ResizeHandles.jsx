const EDGES = Object.freeze(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'])

/** Eight invisible grab strips around the window (hidden by CSS while maximized). */
export const ResizeHandles = ({ onStart }) =>
  EDGES.map((edge) => (
    <i key={edge} className={`rz ${edge}`} data-edge={edge} onPointerDown={(event) => onStart(event, edge)} />
  ))
