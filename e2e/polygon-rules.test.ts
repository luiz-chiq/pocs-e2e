import assert from 'node:assert/strict'
import { test } from 'node:test'
import Graphic from '@arcgis/core/Graphic.js'
import Polygon from '@arcgis/core/geometry/Polygon.js'
import * as areaOperator from '@arcgis/core/geometry/operators/areaOperator.js'
import { project } from '@arcgis/core/geometry/support/webMercatorUtils.js'
import SpatialReference from '@arcgis/core/geometry/SpatialReference.js'
import { cloneGeometryBeside, fixedPolygonColor, groupOverlappingPolygons, isPolygonColor, polygonPalette } from '../src/polygon-rules.ts'

function square(x: number, y = 0, color = '#1261a0', size = 10) {
  return new Graphic({
    geometry: new Polygon({ rings: [[[x, y], [x, y + size], [x + size, y + size], [x + size, y], [x, y]]], spatialReference: { wkid: 3857 } }),
    attributes: { name: `Área ${x}`, color, locked: false }
  })
}

test('a paleta contém seis cores e converte cores antigas para a opção mais próxima', () => {
  assert.equal(polygonPalette.length, 6)
  for (const [, color] of polygonPalette) assert.equal(fixedPolygonColor(color.toUpperCase()), color)
  assert.equal(fixedPolygonColor('#cf4948'), '#cf4949')
  assert.equal(fixedPolygonColor(null), '#1261a0')
  assert.equal(isPolygonColor('#123456'), false)
})

test('funde a área real, preserva a identidade preferida e não altera os originais ao planejar', () => {
  const first = square(0), second = square(5)
  const original = first.geometry!.toJSON()
  const [result] = groupOverlappingPolygons([first, second], second)
  assert.equal(result.survivor, second)
  assert.equal(result.members.length, 2)
  assert.equal(Math.abs(areaOperator.execute(result.geometry)), 150)
  assert.deepEqual(first.geometry!.toJSON(), original)
  assert.equal(second.attributes.name, 'Área 5')
})

test('funde cadeias independentemente da ordem e mantém áreas isoladas separadas', () => {
  const groups = groupOverlappingPolygons([square(0), square(16), square(8), square(100)])
  assert.equal(groups.length, 2)
  assert.equal(groups[0].members.length, 3)
  assert.equal(Math.abs(areaOperator.execute(groups[0].geometry)), 260)
})

test('áreas iguais ou contidas também se fundem, sem duplicar área', () => {
  const [result] = groupOverlappingPolygons([square(0), square(0), square(2, 2, '#1261a0', 2)])
  assert.equal(result.members.length, 3)
  assert.equal(Math.abs(areaOperator.execute(result.geometry)), 100)
})

test('cores diferentes, contato só pela borda e contato só pelo vértice não se fundem', () => {
  assert.equal(groupOverlappingPolygons([square(0), square(5, 0, '#23845b')]).length, 2)
  assert.equal(groupOverlappingPolygons([square(0), square(10)]).length, 2)
  assert.equal(groupOverlappingPolygons([square(0), square(10, 10)]).length, 2)
})

test('a fusão mantém o bloqueio se qualquer área estiver travada', () => {
  const first = square(0), second = square(5)
  first.attributes.locked = true
  assert.equal(groupOverlappingPolygons([first, second], second)[0].locked, true)
})

test('respeita buracos: um polígono no vazio não se sobrepõe à área ao redor', () => {
  const outer = square(0)
  ;(outer.geometry as Polygon).addRing([[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]])
  assert.equal(groupOverlappingPolygons([outer, square(3, 3, '#1261a0', 2)]).length, 2)
  const [result] = groupOverlappingPolygons([outer, square(9)])
  assert.equal(Math.abs(areaOperator.execute(result.geometry)), 154)
  assert.equal(result.geometry.rings.length, 2)
})

test('normaliza referências geográficas e Web Mercator antes de calcular a união', () => {
  const first = square(1000, 1000), second = square(1005, 1000)
  second.geometry = project(second.geometry, new SpatialReference({ wkid: 4326 }))!
  const [result] = groupOverlappingPolygons([first, second])
  assert.equal(result.members.length, 2)
  assert.ok(Math.abs(Math.abs(areaOperator.execute(result.geometry)) - 150) < 0.001)
})

test('reimportar uma área geográfica idêntica preserva suas coordenadas exatas', () => {
  const first = square(1000, 1000)
  first.geometry = project(first.geometry, new SpatialReference({ wkid: 4326 }))!
  const second = first.clone()
  const [result] = groupOverlappingPolygons([first, second])
  assert.equal(result.members.length, 2)
  assert.deepEqual(result.geometry.toJSON(), first.geometry.toJSON())
})


test('clonar mantém a forma sem alterar a origem e evita áreas já ocupadas', () => {
  const source = square(0), occupied = square(13)
  const original = source.geometry!.toJSON()
  const clone = cloneGeometryBeside(source, [source, occupied])!
  assert.ok(clone)
  assert.equal(Math.abs(areaOperator.execute(clone)), 100)
  assert.equal(clone.extent!.intersects(source.geometry!.extent!), false)
  assert.equal(clone.extent!.intersects(occupied.geometry!.extent!), false)
  assert.deepEqual(source.geometry!.toJSON(), original)
  assert.equal(groupOverlappingPolygons([source, new Graphic({ geometry: clone })]).length, 2)
})

test('clonar preserva a referência geográfica', () => {
  const source = square(1000, 1000)
  source.geometry = project(source.geometry, new SpatialReference({ wkid: 4326 }))!
  const clone = cloneGeometryBeside(source, [source])!
  assert.ok(clone.spatialReference.equals(source.geometry!.spatialReference))
  assert.equal(clone.rings[0].length, 5)
  assert.equal(clone.extent!.intersects(source.geometry!.extent!), false)
})
