# roominterior

Interactive IKEA-style AR furniture placement simulation built with Three.js.

## Run locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Included AR placement behaviors

- Snap placement to detected horizontal surfaces.
- Keep furniture at 1:1 meter-based scale.
- Depth occlusion object that can visually pass in front of furniture.
- Real-time response to camera movement and controls.
- Collision detection against room and divider walls.
- Auto wall alignment within 10 cm.
- Subtle contact shadow under furniture.
- Overlap prevention for blocked/occupied detected surfaces.
