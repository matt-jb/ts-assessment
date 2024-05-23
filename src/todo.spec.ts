import { expect } from 'chai';
import inputJson from './input.json';
import outputJson from './output.json';
import { convertInput, validateOutput } from './todo';
import { Input } from './types/input';

describe('Todo', () => {
  // TODO: make sure this test passes
  it('Should be able to convert the input (flat lists) to the output (nested) structure', () => {
    const output = convertInput(inputJson as Input);

    expect(output.documents.length).to.equal(1);
    expect(output.documents[0].entities.length).to.equal(14);
    expect(output.documents[0].annotations.length).to.equal(9);
    expect(output).to.deep.equal(outputJson);
  });

  // BONUS: Write tests that validates the output json. Use the function you have written in "src/todo.ts".
  it('Should validate a correct output json', async () => {
    const validOutput = convertInput(inputJson as Input);

    expect(await validateOutput(validOutput)).to.equal(true);
  });

  it('Should invalidate an output json with extra properties', async () => {
    const validOutput = convertInput(inputJson as Input);

    const outputWithExtraProp = { ...validOutput, extra: 'property' };
    const outputWithExtraAnnotationProp = {
      documents: [
        {
          id: '123',
          entities: [],
          annotations: validOutput.documents[0].annotations.map((annotation) => ({ ...annotation, extra: 'property' })),
        },
      ],
    };
    const outputWithExtraEntityProp = {
      documents: [
        {
          id: '123',
          entities: validOutput.documents[0].entities.map((entity) => ({ ...entity, extra: 'property' })),
          annotations: [],
        },
      ],
    };

    expect(await validateOutput(outputWithExtraProp)).to.equal(false);
    expect(await validateOutput(outputWithExtraEntityProp)).to.equal(false);
    expect(await validateOutput(outputWithExtraAnnotationProp)).to.equal(false);
  });
});
