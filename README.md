# render

A Puppeteer server that renders HTML and returns images. It also supports taking screenshots of websites.

## Quick Start

```sh
docker pull sohzm/render
docker run -p 3000:3000 sohzm/render
```

Or build from source:

```sh
docker build -t puppeteer-render-server .
docker run -p 3000:3000 puppeteer-render-server
```

## Usage

### /render

Renders provided HTML and CSS.

```sh
curl -X POST http://localhost:3000/render \
    -H "Content-Type: application/json" \
    -d '{
        "html": "<div class=\"demo-box\"><h1>Hello, World!</h1></div>",
        "css": ".demo-box { width: 300px; height: 200px; background-color: #3498db; display: flex; justify-content: center; align-items: center; } h1 { color: white; font-family: Arial, sans-serif; }",
        "pixelRatio": 2,
        "scrollX": 0,
        "scrollY": 0,
        "viewportWidth": 800,
        "viewportHeight": 600,
        "width": 300,
        "height": 200,
        "x": 0,
        "y": 0
    }' \
    --output rendered_image.png
```

### /screenshot

Takes screenshots of websites.

Full page:
```sh
curl -X GET "http://localhost:3000/screenshot?url=https://www.example.com" --output fullpage_screenshot.png
```

With aspect ratio:
```sh
curl -X GET "http://localhost:3000/screenshot?url=https://www.example.com&ratio=16:9" --output widescreen_screenshot.png
```

## Parameters

- `/render`: HTML, CSS, pixelRatio, scrollX, scrollY, viewportWidth, viewportHeight, width, height, x, y
- `/screenshot`: url, ratio (optional)

For detailed parameter descriptions, refer to the source code.
