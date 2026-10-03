"""
Cache-busting: stamps every local CSS/JS link in the HTML pages with ?v=<timestamp>
so browsers load the new files right after you upload an update.

Run from the project folder before uploading:   python tools/bump-version.py
"""
import glob, os, re, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
stamp = time.strftime('%Y%m%d%H%M')
pat = re.compile(r'((?:href|src)="(?!https?:|//)[^"?#]+\.(?:css|js))(?:\?v=[\w.-]*)?"')
changed = 0
for f in glob.glob(os.path.join(ROOT, '*.html')) + glob.glob(os.path.join(ROOT, 'dashboard', '*.html')) + glob.glob(os.path.join(ROOT, 'admin', '*.html')):
    s = open(f, encoding='utf-8').read()
    n = pat.sub(lambda m: m.group(1) + '?v=' + stamp + '"', s)
    if n != s:
        open(f, 'w', encoding='utf-8', newline='').write(n)
        changed += 1
print('version', stamp, '->', changed, 'pages updated')
