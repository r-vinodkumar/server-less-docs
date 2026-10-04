import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MANIFEST_PATH = ROOT / "manifest-docs.json"
OUTPUT_PATH = ROOT / "local-data.js"


def main():
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    content = {}

    for document in manifest["documents"]:
        relative_path = Path(document["path"] + ".md")
        source_path = (ROOT / relative_path).resolve()
        if not source_path.is_relative_to(ROOT / "docs"):
            raise ValueError(f"Document path must be under docs/: {document['path']}")
        if not source_path.is_file():
            raise FileNotFoundError(f"Missing document: {relative_path}")
        content[relative_path.as_posix()] = source_path.read_text(encoding="utf-8")

    data = {
        "documents": manifest["documents"],
        "domains": manifest.get("domains", {}),
        "content": content,
    }
    OUTPUT_PATH.write_text(
        "window.LOCAL_DOCS_DATA = "
        + json.dumps(data, ensure_ascii=True, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Generated {OUTPUT_PATH.name} from {MANIFEST_PATH.name} and {len(content)} Markdown files.")


if __name__ == "__main__":
    main()
