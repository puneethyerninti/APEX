import json

def get_params(data):
    if isinstance(data, dict):
        # Look for the activate endpoint
        if "activate" in str(data.get("url", "")):
            print("Found endpoint:", data.get("url"))
            print("Parameters:", json.dumps(data.get("params", []), indent=2))
            
        for k, v in data.items():
            get_params(v)
    elif isinstance(data, list):
        for item in data:
            get_params(item)

try:
    with open(r'C:\Users\Y Puneeth\.gemini\antigravity-ide\brain\f28cad98-bf80-4d3a-8e47-b60559311f2a\.system_generated\steps\5376\content.md', 'r', encoding='utf-8') as f:
        html = f.read()
    
    import re
    m = re.search(r'data-json="(.*?)"', html)
    if m:
        data = json.loads(m.group(1).replace('&quot;', '"'))
        get_params(data)
except Exception as e:
    print(e)
