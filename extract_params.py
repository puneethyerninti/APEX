import re

with open(r'C:\Users\Y Puneeth\.gemini\antigravity-ide\brain\f28cad98-bf80-4d3a-8e47-b60559311f2a\.system_generated\steps\5376\content.md', encoding='utf-8') as f:
    html = f.read()

matches = re.findall(r'"name":"([^"]+)","type":"([^"]+)","enumValues":"[^"]*","default":"([^"]*)","desc":"([^"]+)"', html)
for m in set(matches):
    print(m)
