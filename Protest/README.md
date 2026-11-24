# One Voice to a Movement

A scrollytelling data story about the Indian farmers' protest, 2020–21.

Open `index.html` through a web server (for example GitHub Pages, or `python3 -m http.server` in this folder). Opening the file directly will not load the data, because the browser blocks `fetch()` on `file://`.

- `app.js` contains all scenes (D3 7.9.0 and GSAP 3.12.5, loaded from cdnjs).
- `data/` holds story.json, world.json and shapes.json, built from the project workbooks.
- `img/` holds the illustrations and sprites.
