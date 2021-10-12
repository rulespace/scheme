import programs from './test-programs.js';
import { greval } from './greval.js';
import { performance } from 'perf_hooks';

import { specification as analysis_specification } from './agreval-rsp.js';
import { lattice_conc as lattice } from './lattice-rsp.js';
import { kalloc_conc as kalloc } from './kalloc-rsp.js';


const start = performance.now();
for (const program of programs)
{
  const src = program[0];
  // console.log(src);
  const expected = program[1];
  const actualValues = greval(src);
  if (actualValues.length !== 1)
  {
    if (program.length === 1) // no result specified, i.e. fail expected
    {
      continue; // ok, supposed to fail
    }
    console.log("program:");
    console.log(src);
    // console.log("\nevaluator tuples:")
    // console.log([...evaluator.tuples()].join('\n'));
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