interface PolygonFileData {
  name: string
  locked?: boolean
  color?: string
  geometry: { spatialReference: { wkid: number } } & (
    | { rings: number[][][]; x?: never; y?: never }
    | { x: number; y: number; rings?: never }
  )
}
type PolygonFileResult =
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
  | { status: 'success'; fileName: string; polygons?: PolygonFileData[]; count?: number }
interface Window {
  polygonFiles?: {
    importPolygons(): Promise<PolygonFileResult>
    exportPolygons(polygons: PolygonFileData[]): Promise<PolygonFileResult>
  }
}
