export function assessmentOrderControls(order: number, count: number) {
  return {
    canMoveUp: Number.isInteger(order) && order > 0,
    canMoveDown: Number.isInteger(order) && order >= 0 && order < count - 1,
  };
}

export function assessmentRevisionConflict(currentRevision: number) {
  return `Revision changed to ${currentRevision}. Review the latest draft before trying again.`;
}
