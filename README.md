`render`

```sh
# build and run the server
docker build -t puppeteer-render-server .
docker run -p 3000:3000 puppeteer-render-server

# example curl request

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
