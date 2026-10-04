"use client";

import React, { useEffect, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { type AnimationScene, totalFrames } from "@cyberlearn/lib/animations/scenes";
import type { AnimationSceneId } from "@cyberlearn/types";
import { CallStack } from "./animation-scenes/call-stack";
import { SCENE } from "./animation-scenes/common";
import { SymmetricEncryption } from "./animation-scenes/symmetric-encryption";
import { TcpHandshake } from "./animation-scenes/tcp-handshake";

/**
 * The Remotion player behind <StepAnimation>, loaded only when a lesson has
 * one. It takes commands (seek, play up to a frame, pause) and reports the
 * frame it is on; the pacing is the step component's business.
 */

const SCENES: Readonly<Record<AnimationSceneId, React.FC>> = {
  "tcp-handshake": TcpHandshake,
  "symmetric-encryption": SymmetricEncryption,
  "call-stack": CallStack,
};

export interface PlayerCommand {
  /** A new number each time, so the same command twice still runs. */
  readonly seq: number;
  readonly type: "seek" | "play" | "pause";
  readonly from: number;
  /** For play: the first frame not to show, or null to play to the end. */
  readonly to: number | null;
}

interface PlayerProps {
  readonly sceneId: AnimationSceneId;
  readonly scene: AnimationScene;
  readonly command: PlayerCommand;
  readonly onFrame: (frame: number) => void;
  readonly onPaused: () => void;
}

export function StepAnimationPlayer({
  sceneId,
  scene,
  command,
  onFrame,
  onPaused,
}: PlayerProps): React.ReactElement {
  const ref = useRef<PlayerRef>(null);
  const stopAt = useRef<number | null>(null);

  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    const onUpdate = (event: { detail: { frame: number } }): void => {
      onFrame(event.detail.frame);
      const stop = stopAt.current;
      if (stop !== null && event.detail.frame >= stop) {
        stopAt.current = null;
        player.pause();
        player.seekTo(stop);
        onPaused();
      }
    };
    const onEnded = (): void => {
      // No seeking here: seeking to the last frame is itself what makes the
      // player say "ended". The frame stays where the scene ends, see the
      // moveToBeginningWhenEnded prop below.
      stopAt.current = null;
      onPaused();
    };
    player.addEventListener("frameupdate", onUpdate);
    player.addEventListener("ended", onEnded);
    return () => {
      player.removeEventListener("frameupdate", onUpdate);
      player.removeEventListener("ended", onEnded);
    };
  }, [onFrame, onPaused]);

  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    if (command.type === "play") {
      stopAt.current = command.to === null ? null : command.to - 1;
      player.seekTo(command.from);
      player.play();
    } else {
      stopAt.current = null;
      player.pause();
      if (command.type === "seek") player.seekTo(command.from);
    }
  }, [command]);

  return (
    <Player
      ref={ref}
      component={SCENES[sceneId]}
      durationInFrames={totalFrames(scene)}
      fps={scene.fps}
      compositionWidth={SCENE.width}
      compositionHeight={SCENE.height}
      style={{ width: "100%" }}
      controls={false}
      loop={false}
      moveToBeginningWhenEnded={false}
      clickToPlay={false}
      initiallyMuted
    />
  );
}
