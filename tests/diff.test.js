import { Null, Pair, SchemeParser, Sym } from '../sexp-reader.js';
import { ast2tuples, diff, nodeMap } from '../differ.js';

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

  const m =  nodeMap(tuples);

  function stringify(t)
  {
    switch (t[0])
    {
      case '$lit':
        {
          return t[2];
        }
      case '$id':
        {
          return t[2];
        }
      case '$let':
        {
          return `(let ((${stringify(m[t[2]])} ${stringify(m[t[3]])})) ${stringify(m[t[4]])})`;
        }
      case '$app':
        {
          return `(${stringify(m[t[2]])} ${t.slice(3).map(x => stringify(m[x])).join(' ')}`;
        }
      default: throw new Error(`cannot handle ${t}`);
    }
  }

  return stringify(tuples[0]);
}


function test(src1, src2)
{
  console.log("\n============");


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

    const edits = diff(n1s, n2s);
    const p1edit = applyEdits(n1s, edits);  
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

  console.log("\n*** LR ***");
  doDiff(src1, src2);
  console.log("\n*** RL ***");
  doDiff(src2, src1);
}

test(`1`, `2`);
test(`x`, `y`);
test(`1`, `x`);
test(`1`, `(+ x y)`);
test(`1`, `(+ 1 x)`);
test(`(let ((x 1)) x)`, `(let ((x 2)) x)`);
test(`(let ((x 1)) x)`, `(let ((y 1)) y)`);
test(`(let ((x 1)) x)`, `(let ((x (+ y z))) x)`);
test(`(let ((x 1)) x)`, `(let ((x (+ 1 z))) x)`);
test(`(let ((x 1)) x)`, `(let ((x (+ (* a 1 b) z))) x)`);
test(`(let ((x 1)) x)`, `(let ((x 1)) (+ x 1))`);

test(`(foo f g h)`, `(bar f g h)`);
test(`(foo f g h)`, `(foo x g h)`);
test(`(foo f g h)`, `(bar x y z)`);

// test(`(foo f)`, `(foo f g)`);

// **

// test(`(lambda (x y) (+ x y))`, `(lambda (x y) x)`);
// test(`(lambda (x y) (+ x y))`, `(lambda (x) x)`);
// test(`(let ((x #t))
//         (if x
//             'neg
//             'zeropos))`,  
//      `(let ((x #t))
//         (if x
//             'neg
//             'zeropos))`);                           

// test(`(let ((x 1)) x)`, `(let ((x 2)) (+ x 1))`);

// test(`(let ((find-extension
//         (lambda (url)
//           (let ((_ "Return the extension of the archive e.g. '.tar.gz' given a URL, or false if none is recognized"))
//             (let ((l (list ".tar.gz" ".tar.bz2" ".tar.xz" ".zip" ".tar" ".tgz" ".tbz" ".love")))
//               (find (lambda (x) (string-suffix? x url))
//                     l)))))) find-extension)`,
//      `(let ((find-extension
//         (lambda (url)
//           (let ((_ "Return the extension of the archive e.g. '.tar.gz' given a URL, or false if none is recognized"))
//             (let ((l (list ".orig.tar.gz" ".tar.gz" ".tar.bz2" ".tar.xz" ".zip" ".tar" ".tgz" ".tbz" ".love")))
//               (find (lambda (x) (string-suffix? x url))
//                     l)))))) find-extension)`);

        
                              


