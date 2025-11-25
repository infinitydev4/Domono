module.exports = {
    siteUrl: 'https://domono.fr',
    generateRobotsTxt: true,
    changefreq: 'daily',
    priority: 0.7,
    sitemapSize: 5000,
    exclude: ['/admin/*', '/api/*'],
    robotsTxtOptions: {
      policies: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/admin', '/api', '/tarifs']
        }
      ]
    },
    transform: async (config, path) => {
      const priority = path === '/' ? 1.0 : 
                      path.startsWith('/blog') ? 0.8 : 
                      0.7;
                      
      return {
        loc: path,
        changefreq: config.changefreq,
        priority,
        lastmod: new Date().toISOString(),
      };
    },
  }
  