# render
A Puppeteer-based server that provides HTML rendering, website screenshots, and metadata extraction capabilities. Perfect for generating preview images, taking screenshots, and fetching webpage metadata.

## Features
- Convert HTML/CSS to PNG images
- Take full-page or aspect-ratio-constrained screenshots of websites
- Extract metadata from web pages including OpenGraph and Twitter card data
- Process and optimize favicons

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

## API Endpoints

### 1. HTML Rendering (`/render`)
Converts HTML and CSS into a PNG image.

```sh
curl -X POST http://localhost:3000/render \
    -H "Content-Type: application/json" \
    -d '{
        "html": "<div class=\"demo-box\"><h1>Hello, World!</h1></div>",
        "css": ".demo-box { background-color: #3498db; }",
        "pixelRatio": 2,
        "scrollX": 0,
        "scrollY": 0,
        "viewportWidth": 800,
        "viewportHeight": 600,
        "width": 300,
        "height": 200,
        "fullscreen": false
    }' \
    --output rendered_image.png
```

Parameters:
- `html`: HTML content to render
- `css`: CSS styles to apply
- `pixelRatio`: Device scale factor (default: 1)
- `scrollX`: Horizontal scroll position
- `scrollY`: Vertical scroll position
- `viewportWidth`: Width of the viewport
- `viewportHeight`: Height of the viewport
- `width`: Width of the output image
- `height`: Height of the output image
- `fullscreen`: Whether to capture the full page
- `assets` (optional): Key-value pairs to store in localStorage

### 2. Website Screenshots (`/screenshot`)
Takes screenshots of websites with optional aspect ratio constraints.

Full page screenshot:
```sh
curl -X GET "http://localhost:3000/screenshot?url=https://www.example.com" \
    --output fullpage_screenshot.png
```

Aspect ratio constrained screenshot:
```sh
curl -X GET "http://localhost:3000/screenshot?url=https://www.example.com&ratio=16:9" \
    --output widescreen_screenshot.png
```

Parameters:
- `url`: Website URL to screenshot (required)
- `ratio`: Desired aspect ratio (optional, format: "width:height")

### 3. Metadata Extraction (`/fetch-metadata`)
Extracts metadata from a webpage including OpenGraph tags, Twitter cards, and favicon.

```sh
curl -X POST http://localhost:3000/fetch-metadata \
    -H "Content-Type: application/json" \
    -d '{
        "url": "https://www.example.com"
    }'
```

Returns JSON with the following fields (when available):
```json
{
    "title": "Page Title",
    "description": "Page description",
    "image": "OG/Twitter image URL",
    "siteName": "Site name",
    "type": "OG type",
    "author": "Author name",
    "keywords": "Page keywords",
    "favicon": "Base64 encoded favicon",
    "url": "Canonical URL",
    "twitterCard": "Twitter card type",
    "ogLocale": "OG locale",
    "publishDate": "Article publish date"
}
```

## Error Handling
All endpoints return appropriate HTTP status codes:
- 200: Success
- 400: Invalid parameters
- 500: Server error

Error responses include a JSON object with an `error` field describing the issue.

## Development
The server uses the following technologies:
- Express.js for the API server
- Puppeteer for headless browser operations
- Body-parser for request parsing
- CORS enabled for all origins

## Environment Variables
- `PORT`: Server port (default: 3000)

## License
Do whatever the fuck you want license (DWTFYWL)
