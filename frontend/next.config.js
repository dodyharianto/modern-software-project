/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Amplify/CodeBuild: don't fail the deploy on ESLint warnings (run `npm run lint` locally)
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    // Use environment variable for backend URL, fallback to localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

