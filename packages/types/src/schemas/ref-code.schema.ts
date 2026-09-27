import { z } from "zod";

/**
 * The identifiers content is known by, across imports, the console and the
 * repository.
 *
 * A lesson is `CL-LSN-NNN-VNN` (the 192 lessons of the first catalogue) or
 * `CL-LSN-PPNNN-VNN` (the catalogue of docs/curriculum: PP the path's number,
 * NNN the lesson's in that path). Three digits stopped at 999 lessons; the new
 * catalogue plans about 1 500. Both shapes stay valid, so nothing already
 * imported changes name.
 *
 * A path keeps three digits: the new catalogue numbers its paths from 101.
 */
export const LESSON_REF_CODE = /^CL-LSN-(\d{3}|\d{5})-V\d{2}$/;
export const PATH_REF_CODE = /^CL-PATH-\d{3}-V\d{2}$/;

export const lessonRefCodeSchema = z
  .string()
  .regex(LESSON_REF_CODE, "Format attendu : CL-LSN-001-V01 ou CL-LSN-01001-V01");

export const pathRefCodeSchema = z
  .string()
  .regex(PATH_REF_CODE, "Format attendu : CL-PATH-001-V01");
