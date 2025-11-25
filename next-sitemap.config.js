module.exports = {
    siteUrl: 'https://domono.fr',
    generateRobotsTxt: true,
    changefreq: 'daily',
    priority: 0.7,
    sitemapSize: 5000,
    exclude: ['/admin/*', '/api/*', '/server-sitemap.xml'],
    robotsTxtOptions: {
      additionalSitemaps: [
        'https://domono.fr/server-sitemap.xml',
      ],
      policies: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/admin', '/api']
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
        lastmod: new Date().toISOString()
      };
    },
  }
  