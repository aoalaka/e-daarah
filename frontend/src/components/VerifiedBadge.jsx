/**
 * Verified badge — shown next to madrasah names that have been
 * manually verified by the e-Daarah team.
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
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Verified by e-Daarah"
      role="img"
    >
      <title>Verified by e-Daarah</title>
      <path
        d="M10.007 2.104a3 3 0 0 1 3.986 0l1.07.948a1 1 0 0 0 .84.247l1.418-.236a3 3 0 0 1 3.199 1.987l.506 1.348a1 1 0 0 0 .597.581l1.348.506a3 3 0 0 1 1.987 3.2l-.236 1.417a1 1 0 0 0 .247.84l.948 1.07a3 3 0 0 1 0 3.987l-.948 1.07a1 1 0 0 0-.247.84l.236 1.417a3 3 0 0 1-1.987 3.2l-1.348.506a1 1 0 0 0-.597.58l-.506 1.349a3 3 0 0 1-3.2 1.987l-1.417-.236a1 1 0 0 0-.84.247l-1.07.948a3 3 0 0 1-3.987 0l-1.07-.948a1 1 0 0 0-.84-.247l-1.417.236a3 3 0 0 1-3.2-1.987l-.506-1.348a1 1 0 0 0-.58-.581l-1.349-.506a3 3 0 0 1-1.987-3.2l.236-1.417a1 1 0 0 0-.247-.84l-.948-1.07a3 3 0 0 1 0-3.987l.948-1.07a1 1 0 0 0 .247-.84L2.14 7.183a3 3 0 0 1 1.987-3.2l1.348-.505a1 1 0 0 0 .581-.581l.506-1.348a3 3 0 0 1 3.2-1.987l1.417.236a1 1 0 0 0 .84-.247l1.07-.948Z"
        fill="#1a8917"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
