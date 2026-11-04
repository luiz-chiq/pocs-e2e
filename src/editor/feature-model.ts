export type FeatureKind = 'polygon' | 'point'
export type Position = [number, number]
interface ItemBase { id: string; name: string; locked: boolean; color: string }
export interface AreaItem extends ItemBase {
  kind: 'polygon'
  rings: number[][][]
  vertices: number[][]
  vertexCount: number
}
export interface PointItem extends ItemBase {
  kind: 'point'
  position: Position
  vertices: [Position]
  vertexCount: 1
}
export type FeatureItem = AreaItem | PointItem
interface DocumentBase { name: string; locked?: boolean; color?: string }
interface SpatialReference { wkid: number }
export interface AreaDocument extends DocumentBase {
  geometry: { rings: number[][][]; spatialReference: SpatialReference; x?: never; y?: never }
}
export interface PointDocument extends DocumentBase {
  geometry: { x: number; y: number; spatialReference: SpatialReference; rings?: never }
}
export type FeatureDocument = AreaDocument | PointDocument
export function isAreaDocument(feature: FeatureDocument): feature is AreaDocument { return Array.isArray(feature.geometry.rings) }
