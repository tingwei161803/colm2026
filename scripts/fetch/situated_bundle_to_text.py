"""Extract human-readable strings (children text, name/affiliation props, hrefs) from the Vite bundle of learning-situated-interaction.github.io."""
import re, os
base = os.path.join(os.path.dirname(__file__), '..', 'raw', 'workshops')
js = open(os.path.join(base, 'situated-embodied-interaction.bundle.js'), encoding='utf-8', errors='replace').read()
# Locate the app section (starts at first 'section' id) to skip library code
start = js.find('id:`hero`')
if start < 0: start = js.find('About the Workshop') - 5000
seg = js[max(0, start-20000):]
out = []
for m in re.finditer(r'(children|name|affiliation|website|href|title|time|speaker|desc|role|talk):`([^`]*)`', seg):
    k, v = m.group(1), m.group(2).strip()
    if v and not v.startswith('var(') and len(v) > 1:
        out.append(f'{k}: {v}')
open(os.path.join(base, 'txt', 'situated-embodied-interaction.txt'), 'w').write('\n'.join(out) + '\n')
print(len(out), 'strings')
