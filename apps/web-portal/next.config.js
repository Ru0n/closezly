const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,

          // Separate chunk for framer-motion
          framerMotion: {
            name: 'framer-motion',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            priority: 30,
          },
          // Separate chunk for UI libraries
          ui: {
            name: 'ui-libs',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
            priority: 20,
          },
          // Common vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
          },
        },
      };
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      // Optimize framer-motion imports
      'framer-motion': require.resolve('framer-motion'),
    };

    return config;
  },

  // Compiler optimizations (disabled for Turbopack compatibility)
  // compiler: {
  //   // Remove console logs in production
  //   removeConsole: process.env.NODE_ENV === 'production',
  // },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Enable gzip compression
  compress: true,

  // Optimize CSS
  optimizeFonts: true,

  // Reduce bundle size
  swcMinify: true,

  // Power pack optimizations
  poweredByHeader: false,

  // Transpile packages for better tree shaking
  transpilePackages: ['lucide-react'],
};

module.exports = withBundleAnalyzer(nextConfig);
