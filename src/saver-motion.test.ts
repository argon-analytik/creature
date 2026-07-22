import { describe, expect, it } from 'vitest';
import { DEFAULT_MORPH, generateCreature } from './builder-model';
import { IDENTITY_CUSTOM_MORPH } from './builder-code';
import { deriveLocomotionProfile, sampleScreenSaverPose } from './saver-motion';

describe('screen saver motion', () => {
  it('aligns the inferred local forward vector with the screen path tangent', () => {
    const creature = generateCreature(0x6d4f1139);
    const profile = deriveLocomotionProfile(creature.genome, DEFAULT_MORPH, IDENTITY_CUSTOM_MORPH);
    const pose = sampleScreenSaverPose(profile, 5.2, 16 / 9, 0.76);
    const localAngle = Math.atan2(profile.forward[1], profile.forward[0]);
    // Canvas pixels have a downward-positive y-axis; the renderer flips the
    // mathematical local y-axis while mapping points to the display.
    const worldForward = [Math.cos(pose.angle + localAngle), -Math.sin(pose.angle + localAngle)] as const;
    const tangentAngle = Math.atan2(pose.tangent[1] * (16 / 9), pose.tangent[0]);
    const headingAngle = Math.atan2(worldForward[1], worldForward[0]);

    expect(Math.cos(headingAngle - tangentAngle)).toBeGreaterThan(0.999);
  });

  it('moves across the overscan area without a visible bounce', () => {
    const creature = generateCreature(0x6d4f1139);
    const profile = deriveLocomotionProfile(creature.genome, DEFAULT_MORPH, IDENTITY_CUSTOM_MORPH);
    const duration = 1 / profile.speed;
    const early = sampleScreenSaverPose(profile, duration * 0.05, 16 / 9, 0.76);
    const late = sampleScreenSaverPose(profile, duration * 0.95, 16 / 9, 0.76);

    expect(early.x).toBeLessThan(0);
    expect(late.x).toBeGreaterThan(1);
    expect(late.tangent[0]).toBeGreaterThan(0);
  });
});
