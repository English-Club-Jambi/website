export function getConvexDeploymentUrl() {
  const url =
    process.env.CONVEX_URL?.trim() ||
    process.env.NEXT_PUBLIC_CONVEX_URL?.trim();

  return url || undefined;
}
