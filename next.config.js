let path = require('path')
let withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
let { i18n } = require('./next-i18next.config')
let { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } = require('next/constants')
let { generateExplorerIndexes } = require('./scripts/generate-explorer')

module.exports = (phase) => {
  // The dev interface's explorer and search indexes (data/explorer.json, public/search-index/)
  // are generated here rather than in an npm script, so they exist whatever build command the
  // host runs. Not at `next start`: the server's filesystem may be read-only.
  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_DEVELOPMENT_SERVER) {
    generateExplorerIndexes(__dirname)
  }
  return nextConfig
}

let nextConfig = withBundleAnalyzer({
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  eslint: {
    dirs: ['components', 'constant', 'layouts', 'libs', 'pages', 'scripts', 'utils'],
  },
  images: {
    remotePatterns: [{ hostname: 'i.scdn.co' }],
  },
  typescript: { tsconfigPath: './tsconfig.json' },
  i18n,
  trailingSlash: true,
  experimental: {
    // The admin preview bundles MDX at runtime with esbuild, so the function needs the
    // components posts import, what they import through the `~/` alias, and tsconfig.json
    // (where esbuild reads that alias from)
    outputFileTracingIncludes: {
      '/api/admin/preview': [
        './tsconfig.json',
        './components/**/*',
        './utils/**/*',
        './constant/**/*',
        './types/**/*',
        './hooks/**/*',
        './data/*.ts',
        './node_modules/esbuild/**/*',
        './node_modules/@esbuild/**/*',
      ],
    },
  },
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|mp4)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next',
            name: 'static/media/[name].[hash].[ext]',
          },
        },
      ],
    })

    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })

    config.module.rules.push({
      test: /\.json$/,
      use: [options.defaultLoaders.babel],
      include: path.resolve(__dirname, 'public/locales'),
    })

    return config
  },
})
