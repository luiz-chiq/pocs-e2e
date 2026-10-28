import { availableParallelism } from 'node:os'

export function pocWorkers(target: string, value = process.env.POC_WORKERS): number {
  const workers = value === undefined ? Math.min(2, availableParallelism()) : Number(value)
  if (!Number.isSafeInteger(workers) || workers < 1) {
    throw new Error('POC_WORKERS deve ser um número inteiro maior que zero.')
  }
  // Um dispositivo Android e os adaptadores de desktop ainda usam recursos exclusivos.
  return target === 'web' ? workers : 1
}
