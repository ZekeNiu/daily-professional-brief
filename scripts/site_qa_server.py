"""Serve the real site locally, injecting interaction checks only for ?qa=1."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        query = parse_qs(urlsplit(self.path).query)
        p = Path(self.translate_path(self.path))
        if p.is_dir():
            p = p / 'index.html'
        if query.get('qa') == ['1'] and p.suffix == '.html' and p.is_file():
            content = p.read_text().replace('</body>', '<script src="/tests/site-qa.js"></script></body>').encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return None
        return super().send_head()

ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
