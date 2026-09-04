export function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      className="logo"
      src="/pacelog-runner.png"
      width={Math.round(size * 1.6)}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}
