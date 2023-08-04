import { Null, Pair, SchemeParser, Sym } from '../sexp-reader.js';
import { ast2tuples, diff, diff2edits, coarsifyEdits, nodeMap, diff2string } from '../differ.js';

function applyEdits(ts, edits)
{
  ts = ts.map(t => t.slice(0));
  const m = nodeMap(ts);
  for (const edit of edits)
  {
    switch (edit[0])
    {
      case 'replace':
        {
          m[edit[1][1]] = edit[2];
          break;
        }
      case 'add':
        {
          m[edit[1][1]] = edit[1];
          break;
        }
      case 'remove':
        {
          m[edit[1][1]] = undefined;
          break;
        }
      default: throw new Error(`cannot handle edit ${edit}`);
    }
  }

  const isSubexp = [];
  for (const t of m)
  {
    if (t === undefined)
    {
      continue;
    }
    if (isSubexp[t[1]] === undefined)
    {
      isSubexp[t[1]] = false;
    }
    for (let i = 2; i < t.length; i++)
    {
      isSubexp[t[i]] = true;
    }
  }

  const rooti = isSubexp.findIndex(x => x === false);
  const root = m[rooti]; 
  m[rooti] = m[0];
  m[0] = root;
  return m.filter(x => x);
}

function tuplesToString(tuples)
{

  const m = nodeMap(tuples);

  function stringify(t)
  {
    switch (t[0])
    {
      case '$lit':
      case '$id':
      case '$param':
        {
          return t[2];
        }
      case '$let':
        {
          return `(let ((${stringify(m[t[2]])} ${stringify(m[t[3]])})) ${stringify(m[t[4]])})`;
        }
      case '$letrec':
        {
          return `(letrec ((${stringify(m[t[2]])} ${stringify(m[t[3]])})) ${stringify(m[t[4]])})`;
        }
      case '$if':
        {
          return `(if ${stringify(m[t[2]])} ${stringify(m[t[3]])} ${stringify(m[t[4]])})`;
        }
      case '$lam':
        {
          return `(lambda (${t.slice(2, -1).map(x => stringify(m[x])).join(' ')}) ${stringify(m[t.at(-1)])})`;
        }
      case '$app':
        {
          return `(${stringify(m[t[2]])} ${t.slice(3).map(x => stringify(m[x])).join(' ')})`;
        }
      default: throw new Error(`cannot handle ${t}`);
    }
  }

  return stringify(tuples[0]);
}

function doDiff(src1, src2)
{
  const parser = new SchemeParser();
  const p1 = parser.parse(src1).car;
  const n1s = ast2tuples(p1);
  const p1str = tuplesToString(n1s);

  const p2 = parser.parse(src2).car;
  const n2s = ast2tuples(p2);
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

test(`(if x
            'neg
            (let ((fac (lambda (n) 
            (let ((t (= n 0))) 
              (if t 
                  1 
                  (let ((u (- n 1))) 
                    (let ((v (fac u))) 
                      (* n v)))))))) 
(fac 8)))`,  
     `(if x
          (let ((fac (lambda (n) 
          (let ((t (= n 0))) 
            (if t 
                1 
                (let ((u (- n 1))) 
                  (let ((v (fac u))) 
                    (* n v)))))))) 
(fac 8))
            'neg)`);   // switch branches: shift FAST pop SLOW



// test(Deno.readTextFileSync('diffdata/regex1-left.scm'), Deno.readTextFileSync('diffdata/regex1-right.scm'));
// test(Deno.readTextFileSync('diffdata/regex1-smaller-left.scm'), Deno.readTextFileSync('diffdata/regex1-smaller-right.scm'));
// test(Deno.readTextFileSync('diffdata/regex1-smallest-left.scm'), Deno.readTextFileSync('diffdata/regex1-smallest-right.scm'));
// test(`(let ((x 1)) x)`, `(let ((y 1)) x)`);

// deno test --allow-read diff.test.js