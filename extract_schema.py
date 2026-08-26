import re, json

def find_api_keys(d, path=""):
    if isinstance(d, dict):
        if "url" in d and "method" in d and "activate" in str(d["url"]):
            print(f"Found at {path}: {d.get('url')}")
            print(json.dumps(d.get('examples', {}), indent=2))
        for k, v in d.items():
            find_api_keys(v, f"{path}.{k}")
    elif isinstance(d, list):
        for i, v in enumerate(d):
            find_api_keys(v, f"{path}[{i}]")

with open(r'C:\Users\Y Puneeth\.gemini\antigravity-ide\brain\f28cad98-bf80-4d3a-8e47-b60559311f2a\.system_generated\steps\5376\content.md', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'data-json="(.*?)"', html)
if m:
    data = json.loads(m.group(1).replace('&quot;', '"'))
    find_api_keys(data)
