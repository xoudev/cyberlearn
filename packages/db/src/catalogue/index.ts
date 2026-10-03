// The new catalogue as the repository holds it (content/paths, content/quizzes),
// and how a path or an exam of it is written to the database. A subpath of its
// own rather than the package root: it reads the filesystem, which only scripts
// and server code do.
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
export {
  checkQuizFile,
  findQuizDir,
  loadQuizFiles,
  type LoadedQuizFile,
  type QuizFile,
  type QuizFileQuestion,
} from "./quiz-files";
export { quizMatches, syncQuiz, type QuizSyncResult, type StoredQuiz } from "./quiz-sync";
export {
  findChallengeDir,
  loadChallengeFiles,
  type LoadedChallengeFile,
} from "./challenge-files";
export {
  ChallengeSyncError,
  challengeMatches,
  syncChallenge,
  type ChallengeSyncResult,
  type StoredChallenge,
} from "./challenge-sync";
