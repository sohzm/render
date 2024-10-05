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
