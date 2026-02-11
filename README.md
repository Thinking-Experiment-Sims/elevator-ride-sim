# Simple Elevator Ride Simulation

This is a minimal simulation to help complete the Elevator Ride worksheet.

## What it shows

- Elevator motion from selected route (`1->20`, `1->10`, `20->1`, `10->1`)
- State of motion: speeding up, constant speed, slowing down, stopped
- Acceleration value and direction
- Rider sensation: heavier, normal, lighter
- Force comparison: `F_N > F_g`, `F_N = F_g`, or `F_N < F_g`
- A pug character in the elevator that says how it feels

## Controls

- Sliders: mass, max speed, acceleration magnitude
- Buttons: Start, Pause/Resume, Reset, Step +0.25 s

## Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
