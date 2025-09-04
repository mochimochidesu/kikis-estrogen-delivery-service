#!/usr/bin/env python3
"""
kikis estrogen delivery service
professional hormone therapy planning server
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import logging
from pathlib import Path

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        if "404" in format % args:
            return
        return super().log_message(format, *args)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_GET(self):
        try:
            if self.path == '/favicon.ico':
                self.send_response(204)
                self.end_headers()
                return
            super().do_GET()
        except (BrokenPipeError, ConnectionResetError):
            pass

class Server(socketserver.TCPServer):
    def handle_error(self, request, client_address):
        exc_type, exc_value, exc_traceback = sys.exc_info()
        if isinstance(exc_value, (BrokenPipeError, ConnectionResetError)):
            return

def main():
    app_dir = Path(__file__).parent
    os.chdir(app_dir)

    PORT = 8080
    logging.getLogger("http.server").setLevel(logging.ERROR)

    try:
        with Server(("", PORT), Handler) as httpd:
            print("kikis estrogen delivery service")
            print(f"server: http://localhost:{PORT}")
            print("press ctrl+c to stop")

            try:
                webbrowser.open(f'http://localhost:{PORT}')
            except:
                pass

            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\nserver stopped")
    except PermissionError:
        print(f"port {PORT} in use")
        sys.exit(1)

if __name__ == "__main__":
    main()
