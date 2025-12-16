import { NextRequest } from "next/server";

export function makeNextRequest(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  init?: any
): NextRequest {
  return new NextRequest(url, init as never);
}
