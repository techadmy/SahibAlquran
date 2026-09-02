import { PrismaClient } from 'generated/prisma/client';
import { faker, fakerAR } from '@faker-js/faker';
import argon from 'argon2';
import { normalizeArabic, UserRole } from '@sahibalquran/shared';

const seedTimezones = [
  'Africa/Cairo',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Europe/Istanbul',
  'America/New_York',
];

export const seedAppUser = async (phone: string, role: UserRole) => {
  const name = fakerAR.person.fullName();
  const normalizedName = normalizeArabic(name).toLocaleLowerCase();
  return {
    name,
    nameNormalized: normalizedName,
    role,
    password: await argon.hash('12345678'),
    phone,
    timezone: faker.helpers.arrayElement(seedTimezones),
    notes: faker.datatype.boolean(0.2) ? fakerAR.lorem.sentence() : null,
  };
};

function buildLearners(totalLearners: number, passwordHash: string, startOffset: number) {
  return Array.from({ length: totalLearners }, (_, index) => {
    const name = fakerAR.person.fullName();
    const normalizedName = normalizeArabic(name);
    return {
      name,
      nameNormalized: normalizedName,
      role: 'STUDENT' as const,
      phone: `+9665${String(startOffset + index).padStart(8, '0')}`,
      password: passwordHash,
      timezone: faker.helpers.arrayElement(seedTimezones),
      notes: faker.datatype.boolean(0.45) ? fakerAR.lorem.sentence() : null,
    };
  });
}

async function buildStaffUsers(totalModerators: number) {
  return Promise.all([
    seedAppUser('+201032758989', 'ADMIN'),
    seedAppUser('+201507770400', 'ADMIN'),
    seedAppUser('+966500000001', 'MODERATOR'),
    ...Array.from({ length: totalModerators - 1 }, (_, index) =>
      seedAppUser(`+9665${String(index + 2).padStart(8, '0')}`, 'MODERATOR')
    ),
  ]);
}

export async function seedUsers(args: {
  prisma: PrismaClient;
  totalModerators: number;
  totalLearners: number;
}): Promise<{ students: { id: string }[] }> {
  const defaultPassword = await argon.hash('12345678');

  const staffUsers = await buildStaffUsers(args.totalModerators);
  // Learners start after all moderators: +966500000001..00{totalModerators}
  const learnerStartOffset = args.totalModerators + 1;
  const learners = buildLearners(args.totalLearners, defaultPassword, learnerStartOffset);

  await args.prisma.user.createMany({
    data: [...staffUsers, ...learners],
  });

  const students = await args.prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true },
  });

  return { students };
}
