/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from espncricinfo for player photos later
  images: {
    domains: ['p.imgci.com', 'img1.hscicdn.com'],
  },
  // Ensure clean URLs
  trailingSlash: false,
  // Skip ESLint during builds (linting is run separately in CI)
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
