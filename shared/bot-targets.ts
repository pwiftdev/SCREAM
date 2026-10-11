import { distance, lineOfSight } from './geometry';
import { canSee } from './visibility';
import { cages, type Spot } from './maps/rotten-hollow';
import { mobile, terminal, type Match, type Player } from './types';
const nearest = <T extends Spot>(player: Spot, spots: T[]) =>
  spots.sort((a, b) => distance(player, a) - distance(player, b))[0];
export function killerTarget(match: Match, player: Player) {
  const carried = match.players.find((other) => other.carrier === player.id);
  if (carried)
    return nearest(
      player,
      cages.filter(
        (cage) =>
          !match.players.some(
            (other) => other.cageId === cage.id && other.health === 'caged',
          ) &&
          !(carried.lastCage === cage.id && carried.immuneUntil > match.now),
      ),
    );
  const visible = nearest(
    player,
    match.players.filter(
      (other) =>
        other.role === 'survivor' &&
        !terminal(other) &&
        !['caged', 'carried'].includes(other.health) &&
        !other.locker &&
        canSee(player, other, match.now),
    ),
  );
  return (
    visible ??
    nearest(
      player,
      match.generators.filter(
        (generator) => generator.progress > 0 && generator.progress < 1,
      ),
    ) ??
    match.generators[
      Math.floor((match.now - match.startedAt) / 15000) %
        match.generators.length
    ]
  );
}
export function survivorTarget(
  match: Match,
  player: Player,
): { target?: Spot; fleeing: boolean } {
  const killer = match.players.find((other) => other.role === 'killer');
  const fleeing =
    !!killer &&
    mobile(player) &&
    killer.stunUntil <= match.now &&
    (distance(player, killer) < 6 ||
      (distance(player, killer) < 12 && lineOfSight(player, killer)));
  if (fleeing) {
    const target = [...match.generators, ...match.gates]
      .filter((spot) => distance(killer!, spot) > 18)
      .sort(
        (a, b) =>
          distance(killer!, b) -
          distance(player, b) * 0.7 -
          (distance(killer!, a) - distance(player, a) * 0.7),
      )[0];
    return { target, fleeing };
  }
  if (
    match.generators.filter((generator) => generator.progress >= 1).length >=
    match.required
  )
    return { target: nearest(player, [...match.gates]), fleeing };
  const rescue = nearest(
    player,
    match.players.filter((other) => {
      if (!['caged', 'downed'].includes(other.health) || other.id === player.id)
        return false;
      if (killer && distance(killer, other) < 8) return false;
      const helper = nearest(
        other,
        match.players.filter(
          (candidate) =>
            candidate.role === 'survivor' &&
            mobile(candidate) &&
            !candidate.locker,
        ),
      );
      return helper?.id === player.id;
    }),
  );
  if (rescue) return { target: rescue, fleeing };
  const repairing = match.generators.find(
    (generator) =>
      generator.id === player.task?.target && generator.progress < 1,
  );
  return {
    target:
      repairing ??
      nearest(
        player,
        match.generators.filter((generator) => generator.progress < 1),
      ),
    fleeing,
  };
}
