// The new catalogue as the repository holds it (content/paths), and how a path
// of it is written to the database. A subpath of its own rather than the
// package root: it reads the filesystem, which only scripts and server code do.
export {
  checkPathManifests,
  findPathManifestDir,
  loadPathManifests,
  manifestLessons,
  type LoadedPathManifest,
  type ManifestLesson,
} from "./path-manifests";
export {
  catalogueFromManifest,
  syncPath,
  type CataloguePath,
  type PathSyncResult,
} from "./path-sync";
