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
    "docs/welcome.md": "# Welcome to Docs\r\n\r\nThis reusable documentation hub is built from static files and does not require a server or external framework.\r\n\r\n### Add product pages\r\n- Keep each product's pages together under `docs/products/<product-name>/`. Use `index.md` for the overview and add subpages beside it.\r\n- Add each page's title and extensionless path under `documents` in `manifest-docs.json`. Product pages are listed together in the sidebar and are always visible.\r\n- After adding, removing, or editing Markdown pages or changing the manifest, run `node build-local-data.js` to regenerate `local-data.js` for direct `file://` use. Update navigation and URL routing only in `manifest-docs.json`; the bundle is generated from it.\r\n- Add an image anywhere in a Markdown document using a path relative to that document. For example, from a product folder, use `![A colorful landscape](../../images/sample-landscape.svg)`. Images can appear between headings and paragraphs, and you can include as many as needed.\r\n- Images open in a larger preview when clicked. Press Escape or click outside the preview to close it.\r\n- Selecting a page updates the URL with `?doc=docs/...`, which can be bookmarked or shared.\r\n\r\n### Route websites to documentation\r\n- Add website URL rules under `domains` in the same `manifest-docs.json` file. Use the site's hostname as a key; `default` selects the document for other pages on that site, and each `routes` entry selects a document for URLs whose path starts with `path`.\r\n- Replace the `your-site.example` sample hostname with the site you want to match. For example, the sample sends that site's pages to the Product A overview, except paths starting with `/getting-started`, which open Product A's Getting started page.\r\n- Map documents using paths from `manifest-docs.json`, without the `.md` extension. The side panel checks the active tab URL and loads the mapped local document automatically. More-specific matching paths take precedence over the site's `default`.\r\n- Rules are only needed for extension side-panel URL routing; they do not fetch or display the website's own page text.\r\n\r\nThe sample products demonstrate images embedded between their content.",
    "docs/products/product-a/index.md": "# Product A\r\n\r\nReplace this text with an overview of Product A.\r\n\r\n![A colorful mountain landscape](../../images/sample-landscape.svg)\r\n\r\n## Key features\r\n\r\nDescribe a feature here. Images can be placed between any headings and text, and multiple images are supported in one page.\r\n\r\n![A sample product diagram](../../images/sample-product.svg)\r\n\r\nAdd more Product A pages in this folder and list each page in `manifest-docs.json`. They appear together under Product A in the sidebar.\r\n",
    "docs/products/product-a/getting-started.md": "# Product A: Getting started\r\n\r\nUse this page for a Product A subtopic. Add more Markdown pages beside this one and register each path in `manifest-docs.json` to show them in the Product A sidebar group.\r\n",
    "docs/products/product-b/index.md": "# Product B\r\n\r\nReplace this text with an overview of Product B.\r\n\r\nAdd product details here, then place an image wherever it helps explain the content.\r\n\r\n![A sample product diagram](../../images/sample-product.svg)\r\n"
  }
};
