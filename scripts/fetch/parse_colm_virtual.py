"""Parse colm.cc virtual per-workshop pages -> raw/workshops/colm_meta.json"""
import json, re, glob, os
from bs4 import BeautifulSoup
base = os.path.join(os.path.dirname(__file__), '..', 'raw', 'workshops')
out = {}
for f in sorted(glob.glob(os.path.join(base, 'colm-virtual', 'workshop-*.html'))):
    wid = re.search(r'workshop-(\d+)', f).group(1)
    s = BeautifulSoup(open(f).read(), 'html.parser')
    for t in s(['script', 'style', 'nav', 'header', 'footer']): t.decompose()
    lines = [l for l in s.get_text('\n', strip=True).split('\n') if l]
    # lines[0]=title, then 'COLM 2026','Workshop', time line, title, organizers, 'Project Page','Abstract', abstract..., 'Show more'
    name = lines[0]
    time_line = next((l for l in lines if 'Oct 9' in l), None)
    try:
        i = lines.index('Abstract')
        j = next(k for k in range(i, len(lines)) if lines[k] in ('Show more', 'Log in and register to view live content'))
        abstract = lines[i+1:j]
    except (ValueError, StopIteration):
        abstract = []
    try:
        oi = lines.index('Project Page')
        orgs = [o.strip() for o in lines[oi-1].split('⋅')]
    except ValueError:
        orgs = []
    proj = None
    for a in BeautifulSoup(open(f).read(), 'html.parser').find_all('a', href=True):
        if a.get_text(strip=True) == 'Project Page':
            proj = a['href']
    out[wid] = dict(id=wid, name=name, time=time_line, organizers=orgs, website=proj, abstract=abstract,
                    colmUrl=f'https://colm.cc/virtual/2026/workshop/{wid}')
json.dump(out, open(os.path.join(base, 'colm_meta.json'), 'w'), indent=2, ensure_ascii=False)
for v in out.values():
    print(v['id'], '|', v['time'], '|', v['name'][:60], '|', len(v['organizers']), 'orgs |', len(' '.join(v['abstract'])), 'chars abstract')
