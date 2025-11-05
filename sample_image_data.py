import os, zipfile, requests
from pathlib import Path

root = Path("sample_cats_vs_dogs")
(train_cat := root / "train" / "cats").mkdir(parents=True, exist_ok=True)
(train_dog := root / "train" / "dogs").mkdir(parents=True, exist_ok=True)

images = {
    train_cat: [
        "https://huggingface.co/datasets/mishig/sample_images/resolve/main/tiger.jpg",
        "https://huggingface.co/datasets/mishig/sample_images/resolve/main/cat1.jpg",
    ],
    train_dog: [
        "https://huggingface.co/datasets/mishig/sample_images/resolve/main/dog1.jpg",
        "https://huggingface.co/datasets/mishig/sample_images/resolve/main/dog2.jpg",
    ],
}

for folder, urls in images.items():
    for idx, url in enumerate(urls, 1):
        filename = folder / f"img_{idx}.jpg"
        if filename.exists():
            continue
        try:
            resp = requests.get(url, timeout=20)
            resp.raise_for_status()
            filename.write_bytes(resp.content)
        except Exception as exc:
            print(f"Warning: failed to download {url}: {exc}")

zip_path = Path("sample_cats_vs_dogs.zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for file in root.rglob("*"):
        zf.write(file, arcname=file.relative_to(root))

print(f"Dataset ready at {zip_path.resolve()}")