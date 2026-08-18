const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Dictionary mapping voice keys to launch commands and process names (.exe)
const APPS = {
    // Windows Built-in Tools & URI Protocols
    'calculator': { launch: 'start ms-calculator:', process: 'CalculatorApp.exe' },
    'notepad': { launch: 'start notepad', process: 'notepad.exe' },
    'explorer': { launch: 'start explorer', process: 'explorer.exe' },
    'cmd': { launch: 'start cmd', process: 'cmd.exe' },

    // Browsers & Apps
    'chrome': { launch: 'start chrome', process: 'chrome.exe' },
    'opera': { launch: 'start opera', process: 'opera.exe' },
    'spotify': { launch: 'start spotify:', process: 'Spotify.exe' },
    'discord': { launch: 'start discord', process: 'Discord.exe' },
    'vscode': { launch: 'code', process: 'Code.exe' },

    // Custom Path Installers
    'steam': { launch: 'start "" "C:\\Program Files (x86)\\Steam\\steam.exe"', process: 'steam.exe' },
    'vlc': { launch: 'start "" "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe"', process: 'vlc.exe' }
};

// API Endpoint to LAUNCH apps
app.post('/api/launch', (req, res) => {
    const { appName, appPath } = req.body;
    const targetKey = appName ? appName.toLowerCase() : null;

    let command = APPS[targetKey] ? APPS[targetKey].launch : null;

    if (!command && appPath) {
        command = `start "" "${appPath}"`;
    }

    if (!command) {
        return res.status(400).json({ 
            error: `Application '${targetKey || 'unknown'}' is not configured in APPS registry.` 
        });
    }

    exec(command, (error) => {
        if (error) {
            console.error(`Launch error: ${error.message}`);
            return res.status(500).json({ error: `Failed to launch application: ${error.message}` });
        }
        return res.status(200).json({ status: 'success', message: `Application ${targetKey} launched.` });
    });
});

// API Endpoint to CLOSE apps
app.post('/api/close', (req, res) => {
    const { appName } = req.body;
    const targetKey = appName ? appName.toLowerCase() : null;

    const processName = APPS[targetKey] ? APPS[targetKey].process : `${targetKey}.exe`;

    if (!processName) {
        return res.status(400).json({ error: `Process name for '${targetKey}' unknown.` });
    }

    // Windows taskkill command (/f forces close, /im specifies image name)
    const command = `taskkill /f /im ${processName}`;

    exec(command, (error) => {
        if (error) {
            console.error(`Close error: ${error.message}`);
            return res.status(500).json({ 
                error: `Could not close ${targetKey}. Ensure it is currently running.` 
            });
        }
        return res.status(200).json({ status: 'success', message: `Closed ${targetKey}.` });
    });
});

app.listen(PORT, () => {
    console.log(`================================================`);
    console.log(`J.A.R.V.I.S. System Bridge Online (Launch & Close)`);
    console.log(`Listening on: http://localhost:${PORT}`);
    console.log(`================================================`);
});