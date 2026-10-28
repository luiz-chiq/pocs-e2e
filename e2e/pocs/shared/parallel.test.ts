import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pocWorkers } from './parallel.ts'

test('permite configurar a concorrência web e voltar à execução individual', () => {
  assert.equal(pocWorkers('web', '4'), 4)
  assert.equal(pocWorkers('web', '1'), 1)
})

test('mantém recursos exclusivos das outras plataformas', () => {
  for (const target of ['pwa', 'electron', 'android']) assert.equal(pocWorkers(target, '4'), 1)
})

test('rejeita limites inválidos antes de iniciar navegadores', () => {
  for (const value of ['', '0', '-1', '1.5', 'abc', 'Infinity']) {
    assert.throws(() => pocWorkers('web', value), /POC_WORKERS/)
  }
})
