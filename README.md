# RadLab 3D — WebGL Prototype

This is a small WebGL prototype of the RadLab 3D concept using Three.js. It demonstrates:

- Simple 3D lab scene with a source, shielding boxes, and a Geiger-like detector.
- Visual approximations of alpha, beta, and gamma emissions.
- Draggable shielding objects that attenuate particles.
- A Geiger counter HUD showing counts, dose rate, and accumulated dose.

This is a learning prototype — physics are simplified for clarity and interactivity.

Run (recommended via a static server):

Windows PowerShell:
```powershell
cd "C:\Users\Samuel Girma\Desktop\Oil-Drop"
python -m http.server 8000; Start-Process "http://localhost:8000"
```

Or use any static file server (Live Server in VS Code works well).

Controls & UI:
- Click on the floor to move the source.
- Drag the shielding boxes (click and drag) to place them in the beam.
- Use the UI panel to select source type, energy, intensity, and medium.
- Toggle cloud chamber (placeholder) and reset dose.
 - Toggle cloud chamber: shows condensation trails and secondary electrons for gamma.
 - Magnetic Field slider: apply a vertical field to curve beta tracks in the cloud chamber.
 - Holographic Projector: toggle the projector and use micro-view animations to watch decay processes.
 - Projector controls: choose a decay (alpha/beta/gamma), play/pause, step, and reset the animation. Use the speed slider to change animation speed.

Next steps (if you want me to continue):
- Improve physical models (cross-sections, stochastic decay timing).
- Add cloud chamber visuals, magnetic field bending for betas.
- Add holographic projector atomic view + decay animations.
- Add lessons, quizzes, and VR support.
