import { describe, it, expect } from 'vitest';
import { formatContributionSource } from '../src/systems/scoringLabels.js';

describe('formatContributionSource — derives the log label from structured fields', () => {
  it('spirit: unified "Name (power N)" for both phases', () => {
    expect(formatContributionSource({ kind: 'spirit', name: 'Missing Number', power: 1, phase: 'onCardScored' }))
      .toBe('Missing Number (power 1)');
    expect(formatContributionSource({ kind: 'spirit', name: 'Missing Number', power: 4, phase: 'engine' }))
      .toBe('Missing Number (power 4)');
  });

  it('enhancement: "tier Element", water carries dep', () => {
    expect(formatContributionSource({ kind: 'enhancement', element: 'fire', tier: 'base' })).toBe('base Fire');
    expect(formatContributionSource({ kind: 'enhancement', element: 'wood', tier: 'upgraded' })).toBe('upgraded Wood');
    expect(formatContributionSource({ kind: 'enhancement', element: 'water', tier: 'base', dep: 2 })).toBe('base Water (dep 2)');
    expect(formatContributionSource({ kind: 'enhancement', element: 'water', tier: 'base' })).toBe('base Water (dep 0)');
  });

  it('edition: "Edition edition"', () => {
    expect(formatContributionSource({ kind: 'edition', edition: 'gold' })).toBe('Gold edition');
    expect(formatContributionSource({ kind: 'edition', edition: 'crystal' })).toBe('Crystal edition');
    expect(formatContributionSource({ kind: 'edition', edition: 'ghost' })).toBe('Ghost edition');
  });

  it('held: material DERIVED from element+tier', () => {
    expect(formatContributionSource({ kind: 'held', element: 'metal', tier: 'base', cardName: 'Crane' })).toBe('Iron (Crane)');
    expect(formatContributionSource({ kind: 'held', element: 'metal', tier: 'upgraded', cardName: 'Crane' })).toBe('Meteorite (Crane)');
    expect(formatContributionSource({ kind: 'held', element: 'earth', tier: 'base', cardName: 'Boar' })).toBe('Clay (Boar)');
    expect(formatContributionSource({ kind: 'held', element: 'earth', tier: 'upgraded', cardName: 'Boar' })).toBe('Pottery (Boar)');
  });

  it('hexagram: "hexagram Name"', () => {
    expect(formatContributionSource({ kind: 'hexagram', name: 'The Creative' })).toBe('hexagram The Creative');
  });

  it('phase:retrigger appends a ", retrigger" / "(retrigger)" tag per kind (F3.17)', () => {
    expect(formatContributionSource({ kind: 'spirit', name: 'Salt', power: 1, phase: 'retrigger' }))
      .toBe('Salt (power 1, retrigger)');
    expect(formatContributionSource({ kind: 'enhancement', element: 'fire', tier: 'base', phase: 'retrigger' }))
      .toBe('base Fire (retrigger)');
    expect(formatContributionSource({ kind: 'enhancement', element: 'water', tier: 'base', dep: 1, phase: 'retrigger' }))
      .toBe('base Water (dep 1) (retrigger)');
    expect(formatContributionSource({ kind: 'edition', edition: 'gold', phase: 'retrigger' }))
      .toBe('Gold edition (retrigger)');
    expect(formatContributionSource({ kind: 'hexagram', name: 'Qian', phase: 'retrigger' }))
      .toBe('hexagram Qian (retrigger)');
  });
});
