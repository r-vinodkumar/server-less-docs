# Welcome to Docs

This reusable documentation hub is built from static files and does not require a server or external framework.

### Add product pages
- Keep each product's pages together under `docs/products/<product-name>/`. Use `index.md` for the overview and add subpages beside it.
- Add each page's title and extensionless path under `documents` in `manifest-docs.json`. Product pages are listed together in the sidebar and are always visible.
- After adding, removing, or editing Markdown pages or changing the manifest, run `python build-local-data.py` to regenerate `local-data.js` for direct `file://` use.
- Add an image anywhere in a Markdown document using a path relative to that document. For example, from a product folder, use `![A colorful landscape](../../images/sample-landscape.svg)`. Images can appear between headings and paragraphs, and you can include as many as needed.
- Images open in a larger preview when clicked. Press Escape or click outside the preview to close it.
- Selecting a page updates the URL with `?doc=docs/...`, which can be bookmarked or shared.

### Route websites to documentation
- Add website URL rules under `domains` in the same `manifest-docs.json` file. Use the site's hostname as a key; `default` selects the document for other pages on that site, and each `routes` entry selects a document for URLs whose path starts with `path`.
- Replace the `your-site.example` sample hostname with the site you want to match. For example, the sample sends that site's pages to the Product A overview, except paths starting with `/getting-started`, which open Product A's Getting started page.
- Map documents using paths from `manifest-docs.json`, without the `.md` extension. The side panel checks the active tab URL and loads the mapped local document automatically. More-specific matching paths take precedence over the site's `default`.
- Rules are only needed for extension side-panel URL routing; they do not fetch or display the website's own page text.

The sample products demonstrate images embedded between their content.