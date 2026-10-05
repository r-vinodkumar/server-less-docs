const fs = require('node:fs/promises');
const path = require('node:path');

const root = __dirname;
const docsRoot = path.resolve(root, 'docs');
const manifestPath = path.join(root, 'manifest-docs.json');
const outputPath = path.join(root, 'local-data.js');

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const content = {};

  for (const document of manifest.documents) {
    const relativePath = `${document.path}.md`;
    const sourcePath = path.resolve(root, relativePath);
    const docsRelativePath = path.relative(docsRoot, sourcePath);

    if (docsRelativePath.startsWith('..') || path.isAbsolute(docsRelativePath)) {
      throw new Error(`Document path must be under docs/: ${document.path}`);
    }

    content[relativePath] = await fs.readFile(sourcePath, 'utf8');
  }

  const data = {
    documents: manifest.documents,
    domains: manifest.domains || {},
    content
  };

  await fs.writeFile(
    outputPath,
    `window.LOCAL_DOCS_DATA = ${JSON.stringify(data, null, 2)};\n`,
    'utf8'
  );
  console.log(`Generated local-data.js from manifest-docs.json and ${Object.keys(content).length} Markdown files.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});