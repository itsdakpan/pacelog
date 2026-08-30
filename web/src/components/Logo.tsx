/**
 * A triquetra: three interlocking vesica loops at 120°. Each loop is two arcs
 * meeting at a point, so the petals stay sharp — three overlapping circles give
 * a venn diagram rather than a knot.
 */
const PETAL = "M 50,6 A 34.97,34.97 0 0,1 50,66 A 34.97,34.97 0 0,1 50,6";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinejoin="round"
      role="img"
      aria-label="PaceLog"
    >
      {[0, 120, 240].map((angle) => (
        <path key={angle} d={PETAL} transform={`rotate(${angle} 50 50)`} />
      ))}
    </svg>
  );
}
