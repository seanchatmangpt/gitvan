/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Enable static exports for GitHub Pages deployment
   * @see https://nextjs.org/docs/app/building-your-application/deploying/static-exports
   */
  output: 'export',
  
  /**
   * Set base path for GitHub Pages deployment
   * @see https://nextjs.org/docs/app/api-reference/next-config-js/basePath
   */
  basePath: process.env.NODE_ENV === 'production' ? '/{{ github_repo }}' : '',
  
  /**
   * Disable server-based image optimization for static exports
   * @see https://nextjs.org/docs/app/api-reference/components/image#unoptimized
   */
  images: {
    unoptimized: true,
  },
  
  /**
   * Enable experimental features for better static site generation
   */
  experimental: {
    mdxRs: true,
  },
  
  /**
   * Configure webpack for MDX processing
   */
  webpack: (config, { isServer }) => {
    // Handle MDX files
    config.module.rules.push({
      test: /\.mdx?$/,
      use: [
        {
          loader: '@next/mdx-loader',
          options: {
            remarkPlugins: [],
            rehypePlugins: [],
          },
        },
      ],
    });
    
    return config;
  },
  
  /**
   * Configure page extensions to include MDX
   */
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  
  /**
   * Disable trailing slash for cleaner URLs
   */
  trailingSlash: false,
  
  /**
   * Configure asset prefix for GitHub Pages
   */
  assetPrefix: process.env.NODE_ENV === 'production' ? '/{{ github_repo }}/' : '',
};

export default nextConfig;
