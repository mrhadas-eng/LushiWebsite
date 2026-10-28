#!/usr/bin/env python3
"""Compare a Wix extraction with a local one: match items by text / image id, report geometry and typography deltas.
usage: compare.py wix.json local.json [tolerance_px]"""
import json, sys, unicodedata

def norm(t):
    t = unicodedata.normalize('NFC', t).replace('״', '"').replace('׳', "'").replace('–', '-').replace('—', '-')
    return ''.join(t.split()).strip('|').lower()[:40]

FONT = {'wfont_349df3_b29a14ea11d649d7b2797dad85fb7c1b': 'Lushi', 'wf_b29a14ea11d649d7b2797dad8': 'Lushi', 'avenir-lt-w01_35-light1475496': 'Avenir', 'opensanshebrewcondensed-regular': 'OpenSansHebrewCondensed', 'brandon-grot-w01-light': 'Brandon', 'futura-lt-w01-book': 'Futura'}
def load(p):
    d = json.load(open(p))
    if 'rows' in d:   # compact format -> item dicts
        items = []
        for r in d['rows']:
            it = {'k': r[0], 't': r[1], 'b': r[2:6]}
            if r[0] == 't': it.update(f=r[6], fs=r[7], fw=r[8], lh=r[9], ls=r[10], c=r[11], a=r[12])
            if r[0] == 'f': it.update(f=r[6], fs=r[7], tag=r[8], bd=r[9], bg=r[10], rad=r[11])
            items.append(it)
        d['items'] = items
    import re
    def hx(v):
        return re.sub(r'rgba?\(([^)]+)\)', lambda m: ''.join('%02x' % int(float(n)) for n in m.group(1).split(',')[:3]) + ('a%.2f' % float(m.group(1).split(',')[3]) if len(m.group(1).split(',')) > 3 else ''), v or '')
    for it in d['items']:
        for f in ('c', 'bg', 'bd'):
            if f in it: it[f] = hx(it[f])
        if 'f' in it: it['f'] = FONT.get(it['f'], it['f'])
    return d, d['items']

def key(it):
    if it['k'] == 'i':
        return 'img:' + it['t']
    if it['k'] == 'v':
        return 'icon'
    return f"{it['k']}:" + norm(it['t'])

W, wi = load(sys.argv[1]); L, li = load(sys.argv[2]); tol = int(sys.argv[3]) if len(sys.argv) > 3 else 8
print(f"page {W['url']}  vw {W['vw']}  doc height wix {W['docH']} / local {L['docH']}  items wix {len(wi)} / local {len(li)}")
used = set(); rows = []
for w in wi:
    k = key(w)
    cands = [(i, l) for i, l in enumerate(li) if i not in used and key(l) == k]
    if not cands and w['k'] == 't':   # prefix match for wrapped / split text
        cands = [(i, l) for i, l in enumerate(li) if i not in used and l['k'] == 't' and norm(l['t']) and (norm(l['t']).startswith(norm(w['t'])[:12]) or norm(w['t']).startswith(norm(l['t'])[:12]))]
    if not cands:
        rows.append(('MISSING', w, None)); continue
    i, l = min(cands, key=lambda c: abs(c[1]['b'][1] - w['b'][1]) + abs(c[1]['b'][0] - w['b'][0]))
    used.add(i); rows.append(('', w, l))
for i, l in enumerate(li):
    if i not in used: rows.append(('EXTRA', None, l))
for tag, w, l in rows:
    it = w or l
    label = (it['t'][:28] + ('' if it['k'] != 'i' else '')).ljust(28)
    if tag:
        print(f"  {tag:7} {it['k']} {label} {it['b']}"); continue
    d = [l['b'][j] - w['b'][j] for j in range(4)]
    issues = []
    if any(abs(x) > tol for x in d): issues.append(f"box Δx{d[0]:+} Δy{d[1]:+} Δw{d[2]:+} Δh{d[3]:+}")
    if w['k'] in 't':
        wf = FONT.get(w['f'], w['f'])
        if wf != l['f']: issues.append(f"font {wf}→{l['f']}")
        if abs(w['fs'] - l['fs']) > .5: issues.append(f"size {w['fs']}→{l['fs']}")
        if w['lh'] != l['lh']: issues.append(f"lh {w['lh']}→{l['lh']}")
        if w['ls'] != l['ls']: issues.append(f"ls {w['ls']}→{l['ls']}")
        if w['c'] != l['c']: issues.append(f"color {w['c']}→{l['c']}")
        if w['fw'] != l['fw']: issues.append(f"weight {w['fw']}→{l['fw']}")
    if w['k'] == 'f':
        if w['bd'] != l['bd']: issues.append(f"border {w['bd']}→{l['bd']}")
        if w['bg'] != l['bg']: issues.append(f"bg {w['bg']}→{l['bg']}")
        if w['rad'] != l['rad']: issues.append(f"radius {w['rad']}→{l['rad']}")
    print(f"  {'ok' if not issues else 'DIFF':7} {it['k']} {label} wix {w['b']}  " + '; '.join(issues))
