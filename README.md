# Deep Space Relay -- Loadcell Monitor

## Overview

A dark, space-themed dashboard for monitoring a load cell and
controlling a lifting/arm mechanism.

### Header

-   Brand/logo at top left
-   Subtitle: **DEEP SPACE RELAY**
-   Title: **LOADCELL MONITOR**
-   Connection status indicator (currently **Disconnected**)
-   Hamburger menu button

------------------------------------------------------------------------

## Layout

The interface is divided into three primary columns:

### 1. Controls Panel

Available actions:

  Button   Description
  -------- ----------------------
  OUT      Arm out
  IN       Arm in
  ↑        Hefmast omhoog
  ↑ 0.5s   Hefmast tikje omhoog
  ↓        Hefmast omlaag
  STOP     Hefmast stop

------------------------------------------------------------------------

### 2. Loadcell Monitor Panel

#### Current Weight Card

Displays the live load cell value.

Current state:

    -- g

Status:

    Waiting for data...

#### Spacebar Control

Large button labeled:

    SPACEBAR

Reserved area below for future content, telemetry, charts, or
diagnostics.

------------------------------------------------------------------------

### 3. Stored Weights Panel

Previously saved measurements.

  Weight   Timestamp               Label
  -------- ----------------------- -------
  45 g     5/12/2026, 1:50:50 PM   test
  125 g    5/12/2026, 1:50:42 PM   beker
  100 g    5/12/2026, 1:50:37 PM   \-

Each entry includes a context/options menu (⋮).

------------------------------------------------------------------------

## Visual Style

-   Dark navy/black background
-   Space-themed imagery
-   Rounded cards and panels
-   Soft blue glow effects
-   High contrast typography
-   Large control buttons optimized for touch interaction
-   Futuristic dashboard aesthetic

## Suggested Components

-   WebSocket connection indicator
-   Live load cell stream
-   Weight history storage
-   Motor/actuator controls
-   Keyboard shortcuts (Spacebar)
-   Telemetry/diagnostic panel
