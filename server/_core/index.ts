import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { applySecurityMiddleware } from "./security";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Security middleware temporarily disabled for debugging
  // applySecurityMiddleware(app);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Sitemap.xml for SEO
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const { getPublishedArticlesForSitemap } = await import('../db');
      const articles = await getPublishedArticlesForSitemap();
      const baseUrl = req.protocol + '://' + req.get('host');
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      
      // Add homepage
      sitemap += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      
      // Add all published articles
      for (const article of articles) {
        const lastmod = article.updatedAt ? new Date(article.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        sitemap += `  <url>\n`;
        sitemap += `    <loc>${baseUrl}/blog/${article.slug}</loc>\n`;
        sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
        sitemap += `    <changefreq>weekly</changefreq>\n`;
        sitemap += `    <priority>0.8</priority>\n`;
        sitemap += `  </url>\n`;
      }
      
      sitemap += `</urlset>`;
      
      res.set('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('Sitemap generation error:', error);
      res.status(500).send('Error generating sitemap');
    }
  });
  
  // Robots.txt for SEO
  app.get('/robots.txt', (req, res) => {
    const baseUrl = req.protocol + '://' + req.get('host');
    const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`;
    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });
  
  // IndexNow API key file for Bing/Yandex instant indexing
  const INDEXNOW_KEY = 'moneymachine2026indexnow';
  app.get(`/${INDEXNOW_KEY}.txt`, (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(INDEXNOW_KEY);
  });
  
  // IndexNow submission endpoint - submits URLs to Bing, Yandex instantly
  app.post('/api/indexnow', async (req, res) => {
    try {
      const { urls } = req.body;
      const baseUrl = req.protocol + '://' + req.get('host');
      
      if (!urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'URLs array required' });
      }
      
      // Submit to IndexNow (Bing, Yandex, Seznam, Naver)
      const indexNowPayload = {
        host: new URL(baseUrl).host,
        key: INDEXNOW_KEY,
        keyLocation: `${baseUrl}/${INDEXNOW_KEY}.txt`,
        urlList: urls.map(url => url.startsWith('http') ? url : `${baseUrl}${url}`)
      };
      
      // Submit to multiple IndexNow endpoints
      const endpoints = [
        'https://api.indexnow.org/indexnow',
        'https://www.bing.com/indexnow',
        'https://yandex.com/indexnow'
      ];
      
      const results = await Promise.allSettled(
        endpoints.map(endpoint =>
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(indexNowPayload)
          })
        )
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      console.log(`IndexNow: Submitted ${urls.length} URLs to ${successful}/${endpoints.length} search engines`);
      
      res.json({ 
        success: true, 
        message: `Submitted ${urls.length} URLs to ${successful} search engines`,
        urls: indexNowPayload.urlList
      });
    } catch (error) {
      console.error('IndexNow submission error:', error);
      res.status(500).json({ error: 'Failed to submit to IndexNow' });
    }
  });
  
  // Google Ping endpoint - pings Google about sitemap updates
  app.post('/api/ping-google', async (req, res) => {
    try {
      const baseUrl = req.protocol + '://' + req.get('host');
      const sitemapUrl = `${baseUrl}/sitemap.xml`;
      
      // Ping Google about sitemap update
      const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
      
      const response = await fetch(googlePingUrl);
      
      if (response.ok) {
        console.log(`Google Ping: Successfully pinged Google about sitemap update`);
        res.json({ success: true, message: 'Google pinged successfully', sitemapUrl });
      } else {
        throw new Error(`Google ping failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Google ping error:', error);
      res.status(500).json({ error: 'Failed to ping Google' });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
