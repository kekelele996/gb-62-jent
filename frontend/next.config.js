/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3103',
    WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'http://localhost:3103'
  }
}

module.exports = nextConfig
