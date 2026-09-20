import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  
  /**
   * Proxy /api/* requests to the backend in development.
   * 
   * CRITICAL for EventSource (SSE):
   * In development, the Next.js frontend runs on localhost:3000 and the Express
   * API runs on localhost:4000. Browsers treat these as different origins due to
   * different ports. EventSource respects CORS — even though CORS headers are
   * set on the API, EventSource fails cross-origin in many environments.
   * 
   * By proxying /api/* to localhost:4000 via Next.js's rewrites, requests appear
   * to come from the same origin (localhost:3000), bypassing the CORS/EventSource
   * issue entirely.
   * 
   * This is a development convenience only — production will have the frontend and
   * API on the same domain/origin, so this proxy is unnecessary there.
   */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*'
      }
    ];
  }
};

export default nextConfig;
