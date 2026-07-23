// A virtual clock that freezes while paused instead of tracking real time, so
// every timestamp-based system (movement animation, cooldowns, telegraphs, bomb
// fuses) can keep taking `now` as a plain parameter and simply not be called
// while paused - nothing needs to know pause exists, and nothing jumps or
// instantly expires when resumed.
export interface GameClock {
  now(realNow: number): number;
  pause(realNow: number): void;
  resume(realNow: number): void;
  isPaused(): boolean;
}

export function createGameClock(): GameClock {
  let paused = false;
  let pauseStartedAt = 0;
  let totalPausedMs = 0;

  return {
    now(realNow: number): number {
      if (paused) return pauseStartedAt - totalPausedMs;
      return realNow - totalPausedMs;
    },
    pause(realNow: number): void {
      if (paused) return;
      paused = true;
      pauseStartedAt = realNow;
    },
    resume(realNow: number): void {
      if (!paused) return;
      totalPausedMs += realNow - pauseStartedAt;
      paused = false;
    },
    isPaused(): boolean {
      return paused;
    },
  };
}
