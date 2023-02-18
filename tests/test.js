import programs from './test-programs.js';
import { specification } from '../agreval-rsp.js';
import { create_agreval, lattice_conc, kalloc_conc } from '../agreval.js';

const agreval = create_agreval(specification, lattice_conc + kalloc_conc);
const start = performance.now();
for (const program of programs)
{
  const src = program[0];
  // console.log(src);
  const expected = program[1];
  const evaluator = agreval(src);
  const actualValues = evaluator.result();
  if (actualValues.length !== 1)
  {
    if (program.length === 1) // no result specified, i.e. fail expected
    {
      continue; // ok, supposed to fail
    }
    console.log("program:");
    console.log(src);
    console.log("\nevaluator tuples:")
    console.log([...evaluator.tuples()].join('\n'));
    throw new Error(`wrong number of result values: ${actualValues.length}`);
  }
  const actual = actualValues[0];
  if (expected !== actual)
  {
    console.log(src);
    console.log(`expected ${expected}, got ${actual}`);
  }
}
const end = performance.now();

console.log(`done in ${end-start} ms`);