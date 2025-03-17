import { Null, Pair, SchemeParser, Sym } from '../sexp-reader.js';
import { nodeStream, computeSelection, MATCH, 
  selection2edits, coarsifyEdits, applyEdits, tuples2string, diff2string } from '../differ.js';

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

  const solutions = computeSelection(n1s, n2s);
  for (const solution of solutions)
  {
    console.log(`\n\n*****\nsolution ${diff2string(solution)}`);
    console.log(`distance: ${solution.filter(selection => selection !== MATCH).length}`);

    const edits = selection2edits(solution, n1s, n2s);
    const edits2 = coarsifyEdits(edits, n1s);

    // console.log(`${edits2.join(' ')}`); // DEBUG

    const p1edit = applyEdits(n1s, edits2);  
    const p1editstr = tuples2string(p1edit);
  
    // console.log(`p1edit ${p1editstr} // DEBUG
    // ${p1edit.join(' ')}`);
  
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

function randomArrayCreator(length, numSymbols)
{

  function getRandomInt(n)
  {
    return Math.floor(Math.random() * n);
  }
  
  const a = [];
  for (let i = 0; i < length; i++)
  {
    const s = getRandomInt(numSymbols);
    a.push(s)
  }

  return a;
}

function randomStringCreator(length, numSymbols)
{
  return randomArrayCreator(length, numSymbols).map(n => String.fromCharCode(97 + n)).join(' ');
}

//test(`(let ((x 2)) y)`, `(+ x 2)`);
//test(`(lambda () f)`, `(lambda (f) f)`);

//test(`(+ x y)`, `(+ x y z)`)

// test(`(${randomStringCreator(15000, 26)})`, `(${randomStringCreator(15000, 26)})`);

// test(Deno.readTextFileSync('diffdata/human.fa.scm'), Deno.readTextFileSync('diffdata/orang.fa.scm'));

// test(Deno.readTextFileSync('diffdata/regex1-left.scm'), Deno.readTextFileSync('diffdata/regex1-right.scm'));


// deno test --allow-read diff-standalone.js
// deno test --allow-read --v8-flags=--max-old-space-size=8192 diff-standalone.js