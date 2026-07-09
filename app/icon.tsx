import { getBrandIconSvgMarkup } from "@/lib/brand-icon";

export const contentType = "image/svg+xml";

export default function Icon() {
  return new Response(getBrandIconSvgMarkup(), {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
}
