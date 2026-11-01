#!/usr/bin/env python3
"""Scale a Wix mobile extraction (320px design) to a device width: scale.py in.json out.json 390"""
import json, sys, re
d = json.load(open(sys.argv[1])); k = float(sys.argv[3]) / d['vw']
def px(v):
    return re.sub(r'([\d.]+)px', lambda m: '%.2fpx' % (float(m.group(1)) * k), v) if isinstance(v, str) else v
for r in d['rows']:
    r[2:6] = [round(v * k) for v in r[2:6]]
    if r[0] == 't': r[7] = round(r[7] * k, 2); r[9] = px(r[9]); r[10] = px(r[10])
    if r[0] == 'f': r[7] = round(r[7] * k, 2)
d['docH'] = round(d['docH'] * k); d['vw'] = int(sys.argv[3])
json.dump(d, open(sys.argv[2], 'w'), ensure_ascii=False)
