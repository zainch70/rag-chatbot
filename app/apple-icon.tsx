import { getBrandIconSvgMarkup } from "@/lib/brand-icon";

export const contentType = "image/svg+xml";

export default function AppleIcon() {
  return new Response(
    getBrandIconSvgMarkup({
      withBackground: true,
    }),
    {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    }
  );
}
