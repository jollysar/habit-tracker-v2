export function moveHabitId(
  orderedIds: readonly string[],
  movingId: string,
  targetId: string,
): readonly string[] {
  if (movingId === targetId) return orderedIds;
  const fromIndex = orderedIds.indexOf(movingId);
  const targetIndex = orderedIds.indexOf(targetId);
  if (fromIndex < 0 || targetIndex < 0) return orderedIds;
  const next = [...orderedIds];
  next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, movingId);
  return next;
}
