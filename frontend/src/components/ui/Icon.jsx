/**
 * Line-icon set (no emoji, no icon-font dependency).
 * Each entry is a set of SVG path/shape elements drawn on a 24×24 grid.
 */

const PATHS = {
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4.5 20a7.5 7.5 0 0 1 15 0"],
  lock: ["M7 10V7a5 5 0 0 1 10 0v3", "M5 10h14v10H5z", "M12 14v2"],
  bolt: ["M13 2 4 14h6l-1 8 9-12h-6l1-8Z"],
  layers: ["M12 3 3 8l9 5 9-5-9-5Z", "M3 13l9 5 9-5", "M3 17.5 12 22l9-4.5"],
  phone: [
    "M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z",
  ],
  bank: ["M3 9.5 12 4l9 5.5", "M5 10v8", "M10 10v8", "M14 10v8", "M19 10v8", "M3 20h18"],
  card: ["M3 6h18v12H3z", "M3 10h18", "M6.5 14.5h3"],
  image: ["M3 5h18v14H3z", "M3 16l5-5 4 4 3-3 6 6", "M8.5 9.5a1 1 0 1 0 0-.01Z"],
  note: ["M6 3h12v18H6z", "M9 8h6", "M9 12h6", "M9 16h3"],
  check: ["M4 12.5 9.5 18 20 6.5"],
  shield: ["M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z", "M9 12l2 2 4-4"],
  mail: ["M3 5h18v14H3z", "M3 6l9 7 9-7"],
  inbox: ["M3 13h5l1.5 3h5L16 13h5", "M4.5 5h15l1.5 8v6H3v-6L4.5 5Z"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "M16 16l4.5 4.5"],
  upload: ["M12 16V4", "M7.5 8.5 12 4l4.5 4.5", "M4 16v3h16v-3"],
  arrowUp: ["M12 19V5", "M5 12l7-7 7 7"],
  arrowDown: ["M12 5v14", "M19 12l-7 7-7-7"],
  key: ["M15 8a4 4 0 1 0-3.9 4.9L4 20v-3h3v-3h3l1.1-1.1A4 4 0 0 0 15 8Z", "M17 7.5h.01"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7.5V12l3.5 2"],
  send: ["M4 12 20 4l-8 16-1.5-6.5L4 12Z", "M10.5 13.5 20 4"],
  grid: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  quote: ["M7 7h4v4a4 4 0 0 1-4 4", "M15 7h4v4a4 4 0 0 1-4 4"],
};

export default function Icon({ name, size = 20, className = "" }) {
  const paths = PATHS[name];
  if (!paths) return null;

  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}