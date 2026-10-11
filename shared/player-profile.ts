import bs58 from 'bs58';

export interface PlayerProfile {
  name: string;
  publicWallet: string;
}

export interface WorldPresence {
  players: number;
  streetCapacity: number;
}

export function playerProfile(input: unknown): PlayerProfile {
  const value = input as Partial<PlayerProfile> | null;
  const name = typeof value?.name === 'string' ? value.name.trim() : '';
  if (name.length < 2 || name.length > 20 || !/^[\p{L}\p{N}_ -]+$/u.test(name))
    throw new Error(
      'Use 2–20 letters, numbers, spaces, underscores or dashes for your username.',
    );
  if (typeof value?.publicWallet !== 'string')
    throw new Error('Paste a valid Solana public address, or leave it blank.');
  const publicWallet = value.publicWallet.trim();
  if (publicWallet) {
    try {
      if (publicWallet.length > 44 || bs58.decode(publicWallet).length !== 32)
        throw new Error();
    } catch {
      throw new Error(
        'Paste a valid Solana public address, or leave it blank.',
      );
    }
  }
  return { name, publicWallet };
}
