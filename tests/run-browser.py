"""Run the browser journey in an isolated Chromium profile. Requires Chromium."""
import functools
import http.server
import pathlib
import subprocess
import sys
import tempfile
import threading
from html import unescape

ROOT = pathlib.Path(__file__).resolve().parent.parent
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

handler = functools.partial(QuietHandler, directory=str(ROOT))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with tempfile.TemporaryDirectory(prefix='atelier-browser-') as profile:
        run = subprocess.run([
            'chromium', '--headless', '--no-sandbox', '--disable-gpu',
            '--disable-dev-shm-usage', '--virtual-time-budget=15000', '--dump-dom',
            '--user-data-dir=' + profile, '--window-size=' + (sys.argv[1] if len(sys.argv) > 1 else '390,844'),
            f'http://127.0.0.1:{server.server_port}/tests/browser.html'
        ], capture_output=True, text=True, timeout=55)
        html = run.stdout
        start = html.find('<pre id="result">')
        end = html.find('</pre>', start)
        print(unescape(html[start + len('<pre id="result">'):end]) if start >= 0 else run.stderr)
        if 'data-test="pass"' not in html:
            raise SystemExit(1)
finally:
    server.shutdown()
    server.server_close()
