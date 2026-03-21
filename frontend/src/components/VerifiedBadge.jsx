/**
 * Verified badge — shown next to madrasah names that have been
 * manually verified by the E-Daarah team.
 *
 * Props:
 *   size  – icon diameter in px (default 18)
 */
export default function VerifiedBadge({ size = 18 }) {
  return (
    <svg
      className="verified-badge"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Verified by E-Daarah"
      role="img"
    >
      <title>Verified by E-Daarah</title>
      <circle cx="10" cy="10" r="10" fill="#1d9bf0" />
      <path
        d="M6 10.4 8.5 13 14 7"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
