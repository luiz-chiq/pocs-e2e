type PolygonFileData = import('./editor/feature-model').FeatureDocument
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
