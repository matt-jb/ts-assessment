import { Annotation, Entity, EntityClass, EntityType, Input } from './types/input';
import { ConvertedAnnotation, ConvertedEntity, Output } from './types/output';
import { findAnnotationIndex, sortInAsc } from './helpers';
import * as Yup from 'yup';

// TODO: Convert Input to the Output structure. Do this in an efficient and generic way.
// HINT: Make use of the helper library "lodash"
// Matt: Personally, I wouldn't pick "lodash" here. The ES6+ features are more than enough for this task and I try to avoid extra dependencies.
export const convertInput = (input: Input): Output => {
  const documents = input.documents.map((document) => {
    // TODO: map the entities to the new structure and sort them based on the property "name"
    // Make sure the nested children are also mapped and sorted
    const entities = processEntities(document.entities);

    // TODO: map the annotations to the new structure and sort them based on the property "index"
    // Make sure the nested children are also mapped and sorted
    const annotations = processAnnotations(document.annotations, entities);

    return { id: document.id, entities, annotations };
  });

  return { documents };
};

const processEntities = (entities: Entity[]) =>
  entities.map((entity) => convertEntity(entity, entities)).sort(sortEntities);

const processAnnotations = (annotations: Annotation[], entities: ConvertedEntity[]) =>
  annotations
    // Matt: Might also use filter + map in such cases, but I decided that this reducer is sufficiently readable.
    .reduce((acc, annotation) => {
      if (annotation.refs.length) return acc;

      const convertedAnnotation = convertAnnotation(annotation, entities, annotations);
      return [...acc, convertedAnnotation];
    }, [] as ConvertedAnnotation[])
    .sort(sortAnnotations);

// HINT: you probably need to pass extra argument(s) to this function to make it performant.
const convertEntity = (entity: Entity, documentEntities: Entity[]): ConvertedEntity => {
  const children = documentEntities
    .reduce((acc, maybeChildEntity) => {
      if (!maybeChildEntity.refs.includes(entity.id)) return acc;

      const convertedEntity = convertEntity(maybeChildEntity, documentEntities);
      return [...acc, convertedEntity];
    }, [] as ConvertedEntity[])
    .sort(sortEntities);

  return {
    id: entity.id,
    type: entity.type,
    name: entity.name,
    class: entity.class,
    children,
  };
};

// HINT: you probably need to pass extra argument(s) to this function to make it performant.
const convertAnnotation = (
  annotation: Annotation,
  entities: ConvertedEntity[],
  documentAnnotations: Annotation[],
): ConvertedAnnotation => {
  const children = documentAnnotations
    .reduce((acc, maybeChildAnnotation) => {
      if (!maybeChildAnnotation.refs.includes(annotation.id)) return acc;

      const convertedAnnotation = convertAnnotation(maybeChildAnnotation, entities, documentAnnotations);
      return [...acc, convertedAnnotation];
    }, [] as ConvertedAnnotation[])
    .sort(sortAnnotations);

  const { id, name } = entities.find((e) => e.id === annotation.entityId)!;

  return {
    id: annotation.id,
    value: annotation.value,
    index: findAnnotationIndex(annotation, children),
    entity: {
      id,
      name,
    },
    children,
  };
};

const sortEntities = (entityA: ConvertedEntity, entityB: ConvertedEntity) =>
  sortInAsc(entityA.name.toLowerCase(), entityB.name.toLowerCase());

const sortAnnotations = (annotationA: ConvertedAnnotation, annotationB: ConvertedAnnotation) =>
  sortInAsc(annotationA.index, annotationB.index);

// BONUS: Create validation function that validates the result of "convertInput". Use Yup as library to validate your result.
// Matt: haven't used Yup in ages, but it wasn't hard to pick up again. Nowadays, my go-to in these sort of scenarios is zod.
export const validateOutput = async (output: Output) => {
  const annotation: Yup.ObjectSchema<ConvertedAnnotation> = Yup.object()
    .shape({
      // Matt: one might want to validate the MongoDB ObjectId here.
      // That depends on the type of seeding data, test/stage environment, and ci/cd pipeline, I guess.
      // Would require writing some custom Yup validation, though. And here's where zod shines, as it'd be easier to add that validation.
      // But, I admit, in most scenarios this level of attention to detail isn't needed.
      id: Yup.string().required(),
      entity: Yup.object()
        .shape({
          id: Yup.string().required(),
          name: Yup.string().required(),
        })
        .required(),
      children: Yup.array()
        .of(Yup.lazy(() => annotation))
        .required(),
      value: Yup.mixed<string | number>().required().nullable(),
      index: Yup.number().required(),
    })
    .noUnknown('Unknown annotation property');

  const entity: Yup.ObjectSchema<ConvertedEntity> = Yup.object()
    .shape({
      id: Yup.string().required(),
      name: Yup.string().required(),
      children: Yup.array()
        .of(Yup.lazy(() => entity))
        .required(),
      type: Yup.string<EntityType>().required(),
      class: Yup.string<EntityClass>().required(),
    })
    .noUnknown('Unknown entity property');

  const result = Yup.object()
    .shape({
      documents: Yup.array()
        .of(
          Yup.object().shape({
            id: Yup.string().required(),
            entities: Yup.array().of(entity).required(),
            annotations: Yup.array().of(annotation).required(),
          }),
        )
        .required(),
    })
    .noUnknown('Unknown output property');

  return await result.isValid(output, { strict: true });
};
