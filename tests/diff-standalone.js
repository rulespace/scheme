import { SchemeParser } from '../sexp-reader.js';
import { DiffConfig } from '../differ-ast.js';

function doDiff(leftSrc, rightSrc, diffConfig)
{
  const parser = new SchemeParser();

  const leftNodes = diffConfig.createNodes(leftSrc, parser);
  const rightNodes = diffConfig.createNodes(rightSrc, parser);
  
  const leftStr = diffConfig.nodes2string(leftNodes);
  const rightStr = diffConfig.nodes2string(rightNodes);

  console.log(`left  ${leftStr}
  ${leftNodes.join(' ')}`);
  console.log(`right ${rightStr}
  ${rightNodes.join(' ')}`);

  const differ = diffConfig.createDiffer();

  const selection = differ.computeSelection(leftNodes, rightNodes);
  console.log(`selection: ${differ.selection2string(selection)}`);
  console.log(`distance: ${differ.selectionDistance(selection)}`);

  const edits = differ.selection2edits(selection, leftNodes, rightNodes);
  const edits2 = differ.coarsifyEdits(edits, leftNodes);

  // console.log(`${edits2.join(' ')}`); // DEBUG

  const leftEdit = differ.applyEdits(leftNodes, edits2);  
  const leftEditStr = diffConfig.nodes2string(leftEdit);

  // console.log(`leftEdit ${leftEditStr} // DEBUG
  // ${leftEdit.join(' ')}`);

  if (leftEditStr !== rightStr)
  {
    throw new Error(`match error:
    leftEditStr: ${leftEditStr}
    rightStr   : ${rightStr}`);
  }    
}

function test(src1, src2)
{
  const start = performance.now();
  doDiff(src1, src2, new DiffConfig());
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

test(`(let ((x 2)) y)`, `(+ x 2)`);
//test(`(lambda () f)`, `(lambda (f) f)`);

//test(`(+ x y)`, `(+ x y z)`)

// test(`(${randomStringCreator(15000, 26)})`, `(${randomStringCreator(15000, 26)})`);

// test(Deno.readTextFileSync('diffdata/human.fa.scm'), Deno.readTextFileSync('diffdata/orang.fa.scm'));

// test(Deno.readTextFileSync('diffdata/regex1-left.scm'), Deno.readTextFileSync('diffdata/regex1-right.scm'));


// deno test --allow-read diff-standalone.js
// deno test --allow-read --v8-flags=--max-old-space-size=8192 diff-standalone.js