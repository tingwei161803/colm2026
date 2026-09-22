"""Convert raw/workshops/<slug>.html into raw/workshops/txt/<slug>.txt (readable text + internal links)."""
import os, re, sys, glob
from urllib.parse import urljoin
from bs4 import BeautifulSoup
base = os.path.join(os.path.dirname(__file__), '..', 'raw', 'workshops')
os.makedirs(os.path.join(base, 'txt'), exist_ok=True)
SITES = {
 'haips': 'https://haips.com/', 'actionable-interpretability': 'https://actionable-interpretability.github.io/',
 'advml-frontiers': 'https://advml-frontier.github.io/', 'ai-measurement-science': 'https://aimslab.stanford.edu/workshop',
 'efficient-reasoning': 'https://wdlctc.github.io/efficient-reasoning-2026/', 'context-beyond-window': 'https://context-beyond-window.github.io/',
 'genai4world': 'https://sites.google.com/view/genai4world/', 'situated-embodied-interaction': 'https://learning-situated-interaction.github.io/',
 'daih': 'https://daih2026.github.io/', 'lm4sci': 'https://lm4sci.github.io/', 'moss': 'https://sites.google.com/view/moss-colm-2026/',
 'nonar-lm': 'https://pengzhangzhi.github.io/NonAR-LM/', 'tokenization': 'https://tokenization-workshop.github.io/',
 'social-sim': 'https://sites.google.com/view/social-sims-with-llms', 'lifelong-agent': 'https://lifelongagent.github.io/',
 'agent-behavior': 'https://www.aiagentbehavior.com/', 're-data': 'https://re-data-colm2026.github.io/', 'science-ai': 'https://science-ai-2026.github.io/',
}
def convert(path, url, outpath):
    html = open(path, encoding='utf-8', errors='replace').read()
    s = BeautifulSoup(html, 'html.parser')
    for t in s(['script', 'style', 'noscript', 'svg']): t.decompose()
    # inline hrefs as [text](url) so links survive
    for a in s.find_all('a', href=True):
        h = urljoin(url, a['href'])
        if h.startswith('mailto:'): a.replace_with(a.get_text()); continue
        a.replace_with(f"[{a.get_text(' ', strip=True)}]({h})")
    for br in s.find_all(['br']): br.replace_with('\n')
    for tag in s.find_all(['p','div','li','h1','h2','h3','h4','h5','h6','tr','section','article','td','th']):
        tag.insert_before('\n'); tag.insert_after('\n')
    txt = s.get_text(' ')
    txt = re.sub(r'[ \t ]+', ' ', txt)
    txt = re.sub(r'\n\s*\n+', '\n', txt)
    open(outpath, 'w').write(txt.strip() + '\n')
    return len(txt)
# CLI: no args -> all main sites; args may be a known slug or "slug=url" for a subpage
targets = sys.argv[1:] or list(SITES)
for t in targets:
    slug, url = (t.split('=', 1) if '=' in t else (t, SITES.get(t)))
    p = os.path.join(base, slug + '.html')
    if not os.path.exists(p) or not url: print('missing', slug); continue
    n = convert(p, url, os.path.join(base, 'txt', slug + '.txt'))
    print(f'{slug}: {n} chars')
