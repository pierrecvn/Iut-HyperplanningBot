import { Guild, GuildMember, Role } from 'discord.js';

export const VERIFIED_ROLE_NAME = 'Verifie';

const GROUP_NAMES = [
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2',
  'E1', 'E2', 'F1', 'F2', 'G1', 'G2', 'H1', 'H2',
  'I1', 'I2', 'J1', 'J2', 'K1', 'K2', 'L1', 'L2',
];

export const SPECIAL_ROLES = ['Ancien', 'Prof'] as const;

export function isGroupRole(role: Role): boolean {
  return GROUP_NAMES.includes(role.name);
}

export function isAssignableRole(role: Role): boolean {
  return GROUP_NAMES.includes(role.name)
    || SPECIAL_ROLES.some(s => s.toUpperCase() === role.name.toUpperCase());
}

export function findGroupRole(guild: Guild, group: string): Role | undefined {
  const upper = group.toUpperCase();
  return guild.roles.cache.find(r => r.name.toUpperCase() === upper);
}

export async function removeGroupRoles(guild: Guild, member: GuildMember): Promise<void> {
  const toRemove = member.roles.cache.filter(r => isAssignableRole(r));
  if (toRemove.size > 0) {
    await member.roles.remove(toRemove);
  }
}

export async function assignGroupRole(guild: Guild, member: GuildMember, group: string): Promise<boolean> {
  const role = findGroupRole(guild, group);
  if (!role) return false;

  await removeGroupRoles(guild, member);
  await member.roles.add(role);
  return true;
}

export function findVerifiedRole(guild: Guild): Role | undefined {
  return guild.roles.cache.find(r => r.name === VERIFIED_ROLE_NAME);
}

export async function assignVerifiedRole(guild: Guild, member: GuildMember): Promise<boolean> {
  const role = findVerifiedRole(guild);
  if (!role) return false;

  await member.roles.add(role);
  return true;
}
