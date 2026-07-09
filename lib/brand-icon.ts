export const BRAND_ICON_PETAL_ANGLES = [
  0, 45, 90, 135, 180, 225, 270, 315,
] as const;

function petalMarkup(strokeWidth = 1.75) {
  return BRAND_ICON_PETAL_ANGLES.map(
    (angle) =>
      `<ellipse cx="24" cy="13.75" rx="2.5" ry="5.25" stroke="#262626" stroke-width="${strokeWidth}" transform="rotate(${angle} 24 24)" />`
  ).join("");
}

export function getBrandIconSvgMarkup({
  withBackground = false,
}: {
  withBackground?: boolean;
} = {}) {
  const background = withBackground
    ? '<rect width="48" height="48" rx="10" fill="#fafafa" />'
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">${background}<circle cx="24" cy="24" r="20" stroke="#262626" stroke-width="1.75" /><circle cx="24" cy="24" r="2.25" fill="#262626" />${petalMarkup()}</svg>`;
}
