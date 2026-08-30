from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{path}: expected exactly one match, got {count}: {old!r}"
        )
    target.write_text(text.replace(old, new, 1))


replace_once(
    "API_REFERENCE.md",
    "- [Configuration Reference](CONFIGURATION.md)\n",
    "- [Configuration Reference](#configuration)\n",
)
replace_once(
    "README.md",
    "- **[Week 1 Completion Report](docs/phase-1-reports/WEEK-1-COMPLETION-REPORT.md)** - Progress status\n",
    "- **[Week 1 Completion Report](docs/PHASE-1-WEEK-1-COMPLETION.md)** - Progress status\n",
)

print("DOC_LINKS_REPAIR_APPLIED")
