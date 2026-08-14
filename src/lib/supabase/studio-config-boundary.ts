export const STUDIO_PUBLIC_ENV_FALLBACK_HEADER =
  "x-studio-os-public-env-fallback";
export const STUDIO_PUBLIC_ENV_FALLBACK_VALUE = "1";

export function isStudioPathname(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";

  return (
    normalizedPathname === "/studio" ||
    normalizedPathname.startsWith("/studio/")
  );
}
