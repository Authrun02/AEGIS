import sounddevice as sd
import numpy as np
import time
import subprocess
import os
import http.server
import socketserver
import threading
import webbrowser
import socket

# ==========================================
# CONFIGURATION
# ==========================================
PORT = 8080
CLAP_THRESHOLD = 0.20
TIME_BETWEEN_CLAPS = 0.6
last_clap_time = 0

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def check_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

# If J.A.R.V.I.S. is already running, terminate the listener immediately
if check_port_in_use(PORT):
    print("[J.A.R.V.I.S.] System is already active. Terminating background listener.")
    exit(0)

def start_web_server():
    os.chdir(SCRIPT_DIR)
    Handler = http.server.SimpleHTTPRequestHandler
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"[J.A.R.V.I.S.] Web Interface hosted on http://localhost:{PORT}")
        httpd.serve_forever()

# Start local web server in a background thread
server_thread = threading.Thread(target=start_web_server, daemon=True)
server_thread.start()

def launch_jarvis():
    print("\n[J.A.R.V.I.S.] VOICE DETECTED! Initializing systems...")

    # 1. Start server.js bridge if not running
    try:
        server_path = os.path.join(SCRIPT_DIR, "server.js")
        subprocess.Popen(
            ["node", server_path], 
            cwd=SCRIPT_DIR, 
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
        )
        print("[J.A.R.V.I.S.] System Bridge (server.js) online.")
    except Exception as e:
        print(f"[Bridge Error]: {e}")

    # 2. Open in existing Opera GX instance
    url = f"http://localhost:{PORT}"
    try:
        webbrowser.open(url)
        print(f"[J.A.R.V.I.S.] Interface dispatched to Opera GX.")
    except Exception as e:
        print(f"[Browser Launch Error]: {e}")

    # 3. Automatically stop the listener script once J.A.R.V.I.S. opens
    print("[J.A.R.V.I.S.] Shutting down background listener as J.A.R.V.I.S. is now active.")
    time.sleep(1)
    os._exit(0)

def audio_callback(indata, frames, time_info, status):
    global last_clap_time
    volume_norm = np.max(np.abs(indata))

    if volume_norm > 0.08:
        print(f"\r[Mic Input Peak]: {volume_norm:.3f} | Threshold: {CLAP_THRESHOLD}", end="", flush=True)

    if volume_norm > CLAP_THRESHOLD:
        current_time = time.time()
        time_diff = current_time - last_clap_time

        if 0.10 < time_diff < TIME_BETWEEN_CLAPS:
            launch_jarvis()
        else:
            last_clap_time = current_time

print("==========================================================")
print(f" [J.A.R.V.I.S.] Web Server running at http://localhost:{PORT}")
print(" Double-Clap Listener Active...")
print("==========================================================")

try:
    with sd.InputStream(callback=audio_callback, channels=1, samplerate=44100):
        while True:
            sd.sleep(1000)
except KeyboardInterrupt:
    print("\n[J.A.R.V.I.S. Listener] Shutting down...")