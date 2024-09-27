const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "50mb" }));

let browser;

async function initializeBrowser() {
    browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: "new",
    });
}

app.post("/render", async (req, res) => {
    try {
        const { html, css, assets, pixelRatio, scrollX, scrollY, viewportHeight, viewportWidth, height, width, x, y } = req.body;

        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({
            width: viewportWidth,
            height: viewportHeight,
            deviceScaleFactor: pixelRatio,
        });

        // Inject HTML and CSS
        await page.setContent(html);
        await page.evaluate((css) => {
            const style = document.createElement("style");
            style.textContent = css;
            document.head.appendChild(style);
        }, css);

        // Inject assets (assuming they are base64 encoded)
        if (assets) {
            for (const [key, value] of Object.entries(assets)) {
                await page.evaluate(
                    (key, value) => {
                        localStorage.setItem(key, value);
                    },
                    key,
                    value,
                );
            }
        }

        // Set scroll position
        await page.evaluate(
            (scrollX, scrollY) => {
                window.scrollTo(scrollX, scrollY);
            },
            scrollX,
            scrollY,
        );

        // Capture screenshot
        const screenshot = await page.screenshot({
            clip: {
                x: x,
                y: y,
                width: width,
                height: height,
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
