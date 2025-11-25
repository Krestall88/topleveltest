import { ExpenseCategoryLimit, ExpensePeriodType, Prisma, PrismaClient } from '@prisma/client';

export type LimitLike = Pick<
  ExpenseCategoryLimit,
  'id' | 'objectId' | 'categoryId' | 'periodType' | 'month' | 'year' | 'startDate' | 'endDate' | 'updatedAt'
> & { amount: ExpenseCategoryLimit['amount'] };

export function buildLimitKey(limit: LimitLike) {
  const base = `${limit.objectId}:${limit.categoryId}:${limit.periodType}`;

  if (limit.periodType === ExpensePeriodType.MONTHLY) {
    return `${base}:${limit.month ?? 'all'}:${limit.year ?? 'all'}`;
  }

  if (limit.periodType === ExpensePeriodType.DAILY) {
    return base;
  }

  // Для полугодовых и годовых ограничиваемся одним актуальным лимитом,
  // поэтому ключ не зависит от дат
  return base;
}

/**
 * Оставляет только самый свежий лимит для каждой комбинации object/category/periodType.
 */
export function dedupeLimits<T extends LimitLike>(limits: T[]): T[] {
  const sorted = [...limits].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const map = new Map<string, T>();

  for (const limit of sorted) {
    const key = buildLimitKey(limit);
    if (!map.has(key)) {
      map.set(key, limit);
    }
  }

  return Array.from(map.values());
}

export function buildDuplicateWhere(limit: LimitLike): Prisma.ExpenseCategoryLimitWhereInput {
  const base: Prisma.ExpenseCategoryLimitWhereInput = {
    objectId: limit.objectId,
    categoryId: limit.categoryId,
    periodType: limit.periodType
  };

  if (limit.periodType === ExpensePeriodType.MONTHLY) {
    return {
      ...base,
      month: limit.month ?? null,
      year: limit.year ?? null
    };
  }

  return base;
}

export function getLimitKey(limit: LimitLike) {
  return buildLimitKey(limit);
}

export async function cleanupExpenseLimitDuplicates(
  prisma: PrismaClient,
  where?: Prisma.ExpenseCategoryLimitWhereInput
) {
  const limits = await prisma.expenseCategoryLimit.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      objectId: true,
      categoryId: true,
      periodType: true,
      month: true,
      year: true,
      startDate: true,
      endDate: true,
      updatedAt: true
    }
  });

  const seen = new Map<string, string>();
  const deleteIds: string[] = [];

  for (const limit of limits) {
    const key = buildLimitKey(limit as LimitLike);
    if (seen.has(key)) {
      deleteIds.push(limit.id);
    } else {
      seen.set(key, limit.id);
    }
  }

  if (deleteIds.length) {
    await prisma.expenseCategoryLimit.deleteMany({
      where: { id: { in: deleteIds } }
    });
  }

  return deleteIds.length;
}
