import { Null, Pair, SchemeParser, Sym } from '../sexp-reader.js';
import { nodeStream, diff, diff2edits, coarsifyEdits, applyEdits, tuples2string, diff2string } from '../differ.js';

function doDiff(src1, src2)
{
  const parser = new SchemeParser();

  const n1s = nodeStream(src1, parser);
  const p1str = tuples2string(n1s);

  const n2s = nodeStream(src2, parser);
  const p2str = tuples2string(n2s);
  
  // console.log(`p1     ${p1str}
  // ${n1s.join(' ')}`);
  // console.log(`p2     ${p2str}
  // ${n2s.join(' ')}`);

  const solutions = diff(n1s, n2s);
  for (const solution of solutions)
  {
    console.log(`\n\n*****\nsolution ${diff2string(solution)}`);

    const edits = diff2edits(solution, n1s, n2s);
    const edits2 = coarsifyEdits(edits, n1s);

    const p1edit = applyEdits(n1s, edits2);  
    const p1editstr = tuples2string(p1edit);
  
    console.log(`p1edit ${p1editstr}
    ${p1edit.join(' ')}`);
  
    if (p1editstr !== p2str)
    {
      throw new Error(`match error:
      p1edit: ${p1editstr}
      p2    : ${p2str}`);
    }    
  }
}

function test(src1, src2)
{
  const start = performance.now();
  doDiff(src1, src2);
  console.log(`duration: ${performance.now() - start} ms`);
}


test(`(if a b c)`, `(if (let ((x (- 1 1))) (* a x)) (let ((y (+ 2 22))) (+ b y)) (let ((z (/ 3 33))) (- c z)))`);

// test(Deno.readTextFileSync('diffdata/regex1-left.scm'), Deno.readTextFileSync('diffdata/regex1-right.scm'));


// deno test --allow-read diff-standalone.js
