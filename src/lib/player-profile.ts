import { playerProfile, type PlayerProfile } from '../../shared/player-profile';
import { laneApi, laneSession } from './hollow-api';

let remembered: PlayerProfile = { name: '', publicWallet: '' };

export function rememberedProfile() {
  try {
    const saved = localStorage.getItem('hollow-player-profile');
    if (saved) remembered = playerProfile(JSON.parse(saved));
  } catch {
    return { ...remembered };
  }
  return { ...remembered };
}

export function rememberProfile(profile: PlayerProfile) {
  remembered = profile;
  try {
    localStorage.setItem('hollow-player-profile', JSON.stringify(profile));
  } catch {
    return;
  }
}

export async function savedProfile() {
  return laneSession() ? laneApi<PlayerProfile | null>('/profile') : null;
}
