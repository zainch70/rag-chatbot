import { BRAND_ICON_PETAL_ANGLES } from "@/lib/brand-icon";

export default function ChatEmptyIcon({
  className = "h-6 w-6 text-muted-foreground",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <circle cx="24" cy="24" r="2.25" fill="currentColor" />
      {BRAND_ICON_PETAL_ANGLES.map((angle) => (
        <ellipse
          key={angle}
          cx="24"
          cy="13.75"
          rx="2.5"
          ry="5.25"
          stroke="currentColor"
          strokeWidth="1.25"
          transform={`rotate(${angle} 24 24)`}
        />
      ))}
    </svg>
  );
}
