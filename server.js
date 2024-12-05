const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "50mb" }));

// fuck CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

let browser;

async function initializeBrowser() {
    browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: "new",
    });
}

app.post("/render", async (req, res) => {
    try {
        const { html, css, assets, pixelRatio, scrollX, scrollY, viewportWidth, viewportHeight, width, height, fullscreen } = req.body;
        const page = await browser.newPage();

        await page.setViewport({
            width: viewportWidth,
            height: viewportHeight,
            deviceScaleFactor: pixelRatio,
        });

        await page.setContent(html);
        await page.evaluate((css) => {
            const style = document.createElement("style");
            style.textContent = css;
            document.head.appendChild(style);
        }, css);

        if (assets) {
            for (const [key, value] of Object.entries(assets)) {
                await page.evaluate(
                    (key, value) => {
                        localStorage.setItem(key, value);
                    },
                    key,
                    value
                );
            }
        }

        await page.evaluate(
            (scrollX, scrollY) => {
                window.scrollTo(scrollX, scrollY);
            },
            scrollX,
            scrollY
        );

        var w = viewportWidth;
        var h = viewportHeight;

        if (fullscreen) {
            w = width;
            h = height;
        }

        const screenshot = await page.screenshot({
            clip: {
                x: scrollX,
                y: scrollY,
                width: viewportWidth,
                height: viewportHeight,
            },
            encoding: "binary",
        });

        await page.close();
        res.contentType("image/png");
        res.send(screenshot);
    } catch (error) {
        console.error("Rendering error:", error);
        res.status(500).json({ error: "Rendering failed" });
    }
});

app.get("/screenshot", async (req, res) => {
    try {
        const { url, ratio } = req.query;
        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle0" });

        let screenshot;
        if (ratio) {
            const [width, height] = ratio.split(":").map(Number);
            const aspectRatio = width / height;
            await page.setViewport({
                width: 1920,
                height: Math.round(1920 / aspectRatio),
                deviceScaleFactor: 1,
            });
            screenshot = await page.screenshot({
                clip: {
                    x: 0,
                    y: 0,
                    width: 1920,
                    height: Math.round(1920 / aspectRatio),
                },
                encoding: "binary",
            });
        } else {
            screenshot = await page.screenshot({
                fullPage: true,
                encoding: "binary",
            });
        }

        await page.close();
        res.contentType("image/png");
        res.send(screenshot);
    } catch (error) {
        console.error("Screenshot error:", error);
        res.status(500).json({ error: "Screenshot failed" });
    }
});

async function fetchAndProcessFavicon(url, page) {
    try {
        // Create a new page just for favicon
        const faviconPage = await browser.newPage();
        await faviconPage.setViewport({ width: 16, height: 16 });
        
        // Create an HTML page with just the favicon
        await faviconPage.setContent(`
            <html>
                <head>
                    <style>
                        img {
                            width: 16px;
                            height: 16px;
                            object-fit: contain;
                        }
                    </style>
                </head>
                <body style="margin: 0; padding: 0;">
                    <img src="${url}" />
                </body>
            </html>
        `);

        // Wait for the image to load
        await faviconPage.waitForSelector('img', { timeout: 5000 });
        
        // Capture the image as base64
        const screenshot = await faviconPage.screenshot({
            encoding: 'base64',
            type: 'png'
        });

        await faviconPage.close();
        return `data:image/png;base64,${screenshot}`;
    } catch (error) {
        console.error('Error processing favicon:', error);
        
        // Fallback to direct favicon URL if screenshot fails
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            
            // Detect mime type from the first bytes of the buffer
            const mime = buffer[0] === 0x89 && buffer[1] === 0x50 ? 'image/png' : 'image/x-icon';
            return `data:${mime};base64,${base64}`;
        } catch (e) {
            console.error('Fallback favicon fetch failed:', e);
            return null;
        }
    }
}

app.post("/fetch-metadata", async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: "URL is required" });
        }

        const page = await browser.newPage();
        
        try {
            await page.goto(url, { 
                waitUntil: "networkidle0",
                timeout: 10000
            });

            const metadata = await page.evaluate(() => {
                const getMetaContent = (selectors) => {
                    for (const selector of selectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            const content = element.getAttribute('content');
                            if (content) return content.trim();
                        }
                    }
                    return null;
                };

                // Get favicon from various sources
                let favicon = 
                    document.querySelector('link[rel="icon"][sizes="16x16"]')?.href ||
                    document.querySelector('link[rel="icon"]')?.href ||
                    document.querySelector('link[rel="shortcut icon"]')?.href ||
                    new URL('/favicon.ico', window.location.origin).href;

                // Extract all relevant metadata
                return {
                    title: 
                        document.querySelector('title')?.textContent?.trim() ||
                        getMetaContent(['meta[property="og:title"]', 'meta[name="twitter:title"]']),
                    
                    description: 
                        getMetaContent([
                            'meta[name="description"]',
                            'meta[property="og:description"]',
                            'meta[name="twitter:description"]'
                        ]),
                    
                    image: 
                        getMetaContent([
                            'meta[property="og:image"]',
                            'meta[name="twitter:image"]'
                        ]),
                    
                    siteName: 
                        getMetaContent(['meta[property="og:site_name"]']),
                    
                    type: 
                        getMetaContent(['meta[property="og:type"]']),
                    
                    author: 
                        getMetaContent([
                            'meta[name="author"]',
                            'meta[property="article:author"]'
                        ]),
                    
                    keywords: 
                        getMetaContent(['meta[name="keywords"]']),
                    
                    favicon,
                    url: window.location.href,
                    
                    // Additional social media specific
                    twitterCard: 
                        getMetaContent(['meta[name="twitter:card"]']),
                    
                    // Open Graph specific
                    ogLocale: 
                        getMetaContent(['meta[property="og:locale"]']),
                    
                    // Try to get publish date
                    publishDate: 
                        getMetaContent([
                            'meta[property="article:published_time"]',
                            'meta[name="date"]'
                        ])
                };
            });

            // Process favicon
            if (metadata.favicon) {
                metadata.favicon = await fetchAndProcessFavicon(metadata.favicon);
            }

            // Clean up the metadata by removing null values
            Object.keys(metadata).forEach(key => {
                if (metadata[key] === null || metadata[key] === undefined) {
                    delete metadata[key];
                }
            });

            await page.close();
            res.json(metadata);
        } catch (error) {
            await page.close();
            throw error;
        }
    } catch (error) {
        console.error("Metadata fetch error:", error);
        res.status(500).json({ 
            error: "Failed to fetch metadata",
            title: "Unable to load preview",
            favicon: null
        });
    }
});

initializeBrowser().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});

process.on("SIGINT", async () => {
    if (browser) {
        await browser.close();
    }
    process.exit();
});
