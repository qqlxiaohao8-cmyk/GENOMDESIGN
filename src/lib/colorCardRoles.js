/** Odd/even strip index → palette role (first strip = primary). */
export function colorRoleLabelAtIndex(index) {
  return index % 2 === 0 ? 'Primary' : 'Secondary';
}
