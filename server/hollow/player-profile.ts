import { playerProfile, type PlayerProfile } from '../../shared/player-profile';
import type { HollowDatabase } from './database';

export async function readPlayerProfile(
  db: HollowDatabase,
  wallet: string,
): Promise<PlayerProfile | null> {
  const [row] = await db.query(
    'SELECT name,public_wallet FROM profiles WHERE wallet=$1',
    [wallet],
  );
  return row
    ? { name: String(row.name), publicWallet: String(row.public_wallet) }
    : null;
}

export async function savePlayerProfile(
  db: HollowDatabase,
  wallet: string,
  input: unknown,
) {
  const profile = playerProfile(input);
  await db.query(
    'INSERT INTO profiles(wallet,name,public_wallet) VALUES($1,$2,$3) ON CONFLICT(wallet) DO UPDATE SET name=excluded.name,public_wallet=excluded.public_wallet',
    [wallet, profile.name, profile.publicWallet],
  );
  return profile;
}
