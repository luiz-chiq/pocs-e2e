type PolygonFileData = import('./editor/feature-model').FeatureDocument
type PolygonFileResult =
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
  | { status: 'success'; fileName: string; polygons?: PolygonFileData[]; document?: unknown; count?: number }
interface Window {
  polygonFiles?: {
    importPolygons(): Promise<PolygonFileResult>
    exportDocument(document: import('./polygon-document').ExportDocument): Promise<PolygonFileResult>
  }
}
