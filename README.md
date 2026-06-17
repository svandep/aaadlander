# AAADlander Websites

## Overview

This workspace contains the web console for the Deep Space Relay loadcell system, plus the PHP/MySQL endpoints used to store saved weights and notes.

The main UI lives in [Website/index.html](Website/index.html) and is driven by plain JavaScript and CSS. It connects to a live websocket feed for weight updates and sends REST requests for the actuator controls.

## Features

- Live loadcell readout with connection status
- Arm, spindle, and gripper controls
- Saved weight history with delete and note actions
- Keyboard shortcuts and an on-screen shortcut guide
- Easter egg page reachable from the logo

## Project Structure

- [Website/index.html](Website/index.html) - main dashboard markup
- [Website/styles.css](Website/styles.css) - styling for the console UI
- [Website/scripts.js](Website/scripts.js) - websocket, REST, and storage logic
- [Website/keyboardcontrols.js](Website/keyboardcontrols.js) - keyboard shortcut handling
- [Website/PHP connections/db.php](Website/PHP%20connections/db.php) - database connection settings
- [Website/PHP connections/get_weights.php](Website/PHP%20connections/get_weights.php) - fetch stored weights
- [Website/PHP connections/save_weight.php](Website/PHP%20connections/save_weight.php) - save a new weight
- [Website/PHP connections/update_note.php](Website/PHP%20connections/update_note.php) - update a note for a saved weight
- [Website/PHP connections/delete_weight.php](Website/PHP%20connections/delete_weight.php) - delete a saved weight
- [Website/PHP connections/setup.php](Website/PHP%20connections/setup.php) - create the database table
- [script.sql](script.sql) - MySQL dump for the `Meting` table and sample data

## Setup

1. Import [script.sql](script.sql) into MySQL, or run [Website/PHP connections/setup.php](Website/PHP%20connections/setup.php) after configuring the database.
2. Update [Website/config.json](Website/config.json) with the correct Node-RED URLs, control values, and connection timing.
3. Update `.env` with the local MySQL host, database, username, password, and charset.
4. Serve the `Website` folder through a PHP-capable web server.
5. Confirm the websocket and REST endpoints in [Website/config.json](Website/config.json) point to the correct Node-RED server.

## Behavior

- The websocket connection is used for live weight updates.
- The REST endpoints are used for actuator commands.
- Saved weights are loaded from the `Meting` table and displayed in the stored weights panel.
- Notes are limited to 30 characters in the UI and backend.

## Notes

- The current frontend uses hardcoded IP-based endpoints, so moving the project to a different environment may require updating [Website/scripts.js](Website/scripts.js).
- The database table primary key is a combination of `gewichtwaarde` and `datumwaarde`.
