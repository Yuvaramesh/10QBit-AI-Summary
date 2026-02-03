import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = [
  "https://alpha-admin-harley.10qbit.com",
  "https://alpha-app-xflow.10qbit.com",
  "https://alpha-admin-xflow.10qbit.com",
  "http://localhost:3000", // for local development
  "http://localhost:3001", // for local development
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, DELETE, OPTIONS, PATCH",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }
  }

  return NextResponse.next();
}

// Configure which routes to apply middleware to
export const config = {
  matcher: ["/api/:path*"],
};
