/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'relay-vehicle-images-dev.s3.eu-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'relay-vehicle-images-prod.s3.eu-west-2.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
