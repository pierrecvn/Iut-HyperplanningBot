import { randomUUID } from 'crypto';
import { supabase } from '../lib/supabase.js';

/**
 * Recupere le groupe d'un utilisateur Discord.
 */
export async function getUserGroup(discordId: string): Promise<string | null> {
  const { data } = await supabase
    .from('utilisateur')
    .select('group')
    .eq('sub', discordId)
    .maybeSingle();

  return data?.group ?? null;
}

/**
 * Recupere les infos completes d'un utilisateur.
 */
export async function getUserInfo(discordId: string): Promise<{ group: string | null; fullName: string | null; rappelActive: boolean; rappelMinutes: number } | null> {
  const { data } = await supabase
    .from('utilisateur')
    .select('group, full_name, rappel')
    .eq('sub', discordId)
    .maybeSingle();

  if (!data) return null;

  return {
    group: data.group,
    fullName: data.full_name,
    rappelActive: (data.rappel ?? 0) > 0,
    rappelMinutes: data.rappel ?? 15,
  };
}

/**
 * Upsert dans utilisateur (select + update/insert).
 */
async function upsertUser(sub: string, fields: Record<string, unknown>): Promise<void> {
  const { data: existing } = await supabase
    .from('utilisateur')
    .select('id')
    .eq('sub', sub)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('utilisateur').update(fields).eq('sub', sub);
    if (error) console.error('[UserService] UPDATE error:', error.message);
  } else {
    const { error } = await supabase
      .from('utilisateur')
      .insert({ id: randomUUID(), sub, rappel: 15, ...fields });
    if (error) console.error('[UserService] INSERT error:', error.message);
  }
}

/**
 * Met a jour le groupe d'un utilisateur.
 */
export async function setUserGroup(discordId: string, group: string): Promise<void> {
  await upsertUser(discordId, { group });
}

/**
 * Met a jour les preferences de rappel.
 * Convention : rappel > 0 = actif (valeur = minutes), rappel = 0 = desactive.
 */
export async function setRappelPrefs(discordId: string, minutes: number): Promise<void> {
  await upsertUser(discordId, { rappel: minutes });
}

/**
 * Cree/met a jour un utilisateur (onboarding Discord).
 */
export async function upsertUtilisateur(discordId: string, fullName: string, group: string): Promise<void> {
  await upsertUser(discordId, { full_name: fullName, group });
}

/**
 * Recupere tous les utilisateurs avec rappels actifs, groupes par groupe.
 */
export async function getAllActiveReminders(): Promise<Map<string, Array<{ discordId: string; minutes: number }>>> {
  const grouped = new Map<string, Array<{ discordId: string; minutes: number }>>();

  const { data } = await supabase
    .from('utilisateur')
    .select('sub, group, rappel')
    .not('group', 'is', null)
    .not('sub', 'is', null)
    .gt('rappel', 0);

  if (data) {
    for (const u of data) {
      if (!u.group || !u.sub) continue;
      const list = grouped.get(u.group) ?? [];
      list.push({ discordId: u.sub, minutes: u.rappel });
      grouped.set(u.group, list);
    }
  }

  return grouped;
}

/**
 * Recupere tous les utilisateurs d'un groupe (pour /classe).
 */
export async function getUsersByGroup(groupPrefix: string): Promise<Array<{ discordId: string; group: string }>> {
  const { data } = await supabase
    .from('utilisateur')
    .select('sub, group')
    .like('group', `${groupPrefix}%`)
    .not('sub', 'is', null)
    .order('group');

  if (!data) return [];

  return data
    .filter((u): u is typeof u & { sub: string; group: string } => !!u.sub && !!u.group)
    .map(u => ({ discordId: u.sub, group: u.group }));
}
