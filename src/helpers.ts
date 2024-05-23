import { Annotation } from './types/input';
import { ConvertedAnnotation } from './types/output';

// Matt: In production code, I would probably write these helpers it in a more human-readable way, but I though one-liners would be a cool show-off for this exercise.
// On the other hand, the name does make it pretty self-explanatory, so maybe user-test readability of this fragment? :D

export const findAnnotationIndex = (annotation: Annotation, children: ConvertedAnnotation[]) =>
  annotation.indices && annotation.indices.length ? annotation.indices[0].start : children[0].index;

export const sortInAsc = (a: string | number, b: string | number) => (a > b ? 1 : a < b ? -1 : 0);
