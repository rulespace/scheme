import { Null, Pair, SchemeParser, Sym } from '../sexp-reader.js';
import { ast2tuples, diff, diff2edits, coarsifyEdits, nodeMap, diff2string } from '../differ.js';

function doDiff(src1, src2)
{
  const parser = new SchemeParser();

  const n1s = nodeStream(src1, parser);
  const p1str = tuplesToString(n1s);

  const n2s = nodeStream(src2, parser);
  const p2str = tuplesToString(n2s);

  console.log(`p1     ${p1str}
  ${n1s.join(' ')}`);
  console.log(`p2     ${p2str}
  ${n2s.join(' ')}`);

  const solutions = diff(n1s, n2s);
  for (const solution of solutions)
  {
    console.log(`\n\n*****\nsolution ${diff2string(solution)}`);

    const edits = diff2edits(solution, n1s, n2s);
    const edits2 = coarsifyEdits(edits, n1s);

    const p1edit = applyEdits(n1s, edits2);  
    const p1editstr = tuplesToString(p1edit);
  
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
  console.log("\n============");
  console.log("\n*** L->R ***");
  doDiff(src1, src2);
  console.log("\n*** R->L ***");
  doDiff(src2, src1);
}

function testEq(src)
{
  console.log("\n============");
  doDiff(src, src);
}

const start = performance.now();

test(`(if a b c)`, `(if (let ((x (- 1 1))) (* a x)) (let ((y (+ 2 22))) (+ b y)) (let ((z (/ 3 33))) (- c z)))`);

// test(`(if x
//             'neg
//             (let ((fac (lambda (n) 
//             (let ((t (= n 0))) 
//               (if t 
//                   1 
//                   (let ((u (- n 1))) 
//                     (let ((v (fac u))) 
//                       (* n v)))))))) 
// (fac 8)))`,  
//      `(if x
//           (let ((fac (lambda (n) 
//           (let ((t (= n 0))) 
//             (if t 
//                 1 
//                 (let ((u (- n 1))) 
//                   (let ((v (fac u))) 
//                     (* n v)))))))) 
// (fac 8))
//             'neg)`);   // switch branches: shift FAST pop SLOW



// test(Deno.readTextFileSync('diffdata/regex1-left.scm'), Deno.readTextFileSync('diffdata/regex1-right.scm'));
// test(Deno.readTextFileSync('diffdata/regex1-smaller-left.scm'), Deno.readTextFileSync('diffdata/regex1-smaller-right.scm'));
// test(Deno.readTextFileSync('diffdata/regex1-smallest-left.scm'), Deno.readTextFileSync('diffdata/regex1-smallest-right.scm'));
// test(`(let ((x 1)) x)`, `(let ((y 1)) x)`);

// deno test --allow-read diff.test.js