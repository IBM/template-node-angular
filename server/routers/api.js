const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.API_HOST,
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/'
      },
    })
  );
}
