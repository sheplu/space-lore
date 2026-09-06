// Time controller
export class TimeController {
  timeScale = 1;
  paused = false;
  deltaTime = 0;
  elapsedTime = 0;

  update(deltaSeconds: number): void {
    const dt = Number.isFinite(deltaSeconds) && deltaSeconds >= 0 ? deltaSeconds : 0;
    this.deltaTime = this.paused ? 0 : dt * this.timeScale;
    if (!this.paused) {
      this.elapsedTime += this.deltaTime;
    }
  }

  reset(): void {
    this.deltaTime = 0;
    this.elapsedTime = 0;
  }

  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }
}