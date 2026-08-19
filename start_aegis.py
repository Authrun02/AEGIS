import subprocess
import os
import time
import webbrowser

# 1. Automatically locate the 'web va' folder where server.js lives
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

# 2. Opera GX Path & Server Config
OPERA_GX_PATH = os.path.expandvars(r"C:\\Users\\reuel\AppData\\Local\\Programs\\Opera GX\\opera.exe")
SERVER_URL = "http://localhost:3000"

def launch_aegis():
    print(f"Working Directory: {SCRIPT_DIR}")
    print("Starting Node.js server (server.js)...")
    
    # Run node server.js explicitly inside the 'web va' folder
    server_process = subprocess.Popen(["node", "server.js"], cwd=SCRIPT_DIR)

    # Wait 2 seconds for server boot
    time.sleep(2)

    # Open Opera GX
    if os.path.exists(OPERA_GX_PATH):
        print("Opening AEGIS in Opera GX...")
        webbrowser.register('opera_gx', None, webbrowser.BackgroundBrowser(OPERA_GX_PATH))
        webbrowser.get('opera_gx').open(SERVER_URL)
    else:
        print("Opera GX path not found. Opening in default browser...")
        webbrowser.open(SERVER_URL)

    # Keep script alive for the server
    try:
        server_process.wait()
    except KeyboardInterrupt:
        print("\nStopping server.js...")
        server_process.terminate()

if __name__ == "__main__":
    launch_aegis()