import programs from './test-programs.js';
import { greval } from './greval.js';


for (const program of programs)
{
  const src = program[0];
  // console.log(src);
  const expected = program[1];
  const actual = greval(src);
  if (expected !== actual)
  {
    console.log(src);
    console.log(expected, actual);
  }
}

console.log("done");