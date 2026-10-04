window.LOCAL_DOCS_DATA = {
  "documents": [
    {
      "title": "Welcome",
      "path": "docs/welcome"
    },
    {
      "title": "Product A",
      "path": "docs/products/product-a/index"
    },
    {
      "title": "Getting started",
      "path": "docs/products/product-a/getting-started"
    },
    {
      "title": "Product B",
      "path": "docs/products/product-b/index"
    }
  ],
  "domains": {
    "your-site.example": {
      "default": "docs/products/product-a/index",
      "routes": [
        {
          "path": "/getting-started",
          "doc": "docs/products/product-a/getting-started"
        }
      ]
    }
  },
  "content": {
    "docs/welcome.md": "# Welcome to Docs\n\nThis reusable documentation hub is built from static files and does not require a server or external framework.\n\n### Add product pages\n- Keep each product's pages together under `docs/products/<product-name>/`. Use `index.md` for the overview and add subpages beside it.\n- Add each page's title and extensionless path under `documents` in `manifest-docs.json`. Product pages are listed together in the sidebar and are always visible.\n- After adding, removing, or editing Markdown pages or changing the manifest, run `python build-local-data.py` to regenerate `local-data.js` for direct `file://` use.\n- Add an image anywhere in a Markdown document using a path relative to that document. For example, from a product folder, use `![A colorful landscape](../../images/sample-landscape.svg)`. Images can appear between headings and paragraphs, and you can include as many as needed.\n- Images open in a larger preview when clicked. Press Escape or click outside the preview to close it.\n- Selecting a page updates the URL with `?doc=docs/...`, which can be bookmarked or shared.\n\n### Route websites to documentation\n- Add website URL rules under `domains` in the same `manifest-docs.json` file. Use the site's hostname as a key; `default` selects the document for other pages on that site, and each `routes` entry selects a document for URLs whose path starts with `path`.\n- Replace the `your-site.example` sample hostname with the site you want to match. For example, the sample sends that site's pages to the Product A overview, except paths starting with `/getting-started`, which open Product A's Getting started page.\n- Map documents using paths from `manifest-docs.json`, without the `.md` extension. The side panel checks the active tab URL and loads the mapped local document automatically. More-specific matching paths take precedence over the site's `default`.\n- Rules are only needed for extension side-panel URL routing; they do not fetch or display the website's own page text.\n\nThe sample products demonstrate images embedded between their content.",
    "docs/products/product-a/index.md": "# Product A\n\nReplace this text with an overview of Product A.\n\n![A colorful mountain landscape](../../images/sample-landscape.svg)\n\n## Key features\n\nDescribe a feature here. Images can be placed between any headings and text, and multiple images are supported in one page.\n\n![A sample product diagram](../../images/sample-product.svg)\n\nAdd more Product A pages in this folder and list each page in `manifest-docs.json`. They appear together under Product A in the sidebar.\n",
    "docs/products/product-a/getting-started.md": "# Product A: Getting started\n\nUse this page for a Product A subtopic. Add more Markdown pages beside this one and register each path in `manifest-docs.json` to show them in the Product A sidebar group.\n",
    "docs/products/product-b/index.md": "# Product B\n\nReplace this text with an overview of Product B.\n\nAdd product details here, then place an image wherever it helps explain the content.\n\n![A sample product diagram](../../images/sample-product.svg)\n"
  }
};
