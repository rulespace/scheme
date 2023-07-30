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

function test(src1, src2)
{
  console.log("\n============");
  console.log("\n*** LR ***");
  doDiff(src1, src2);
  console.log("\n*** RL ***");
  doDiff(src2, src1);
}

function testEq(src)
{
  console.log("\n============");
  doDiff(src, src);
}

const start = performance.now();

test(`1`, `2`);
test(`x`, `y`);
test(`1`, `x`);
test(`'a`, `'b`);
test(`'a`, `a`);
test(`"a"`,`"b"`);
test(`"a"`,`'a`);
test(`"a"`,`a`);
test(`"a"`,`1`);
test(`()`,`1`);
test(`()`,`(f)`);

testEq(`1`);
testEq(`()`);
testEq(`x`);
testEq(`'a`);
testEq(`"a"`,`"a"`);

test(`1`, `(+ x y)`);
test(`1`, `(+ 1 x)`);

test(`(let ((x 1)) x)`, `(let ((x 2)) x)`);
test(`(let ((x 1)) x)`, `(let ((y 1)) y)`);
test(`(let ((x 1)) x)`, `(let ((x (+ y z))) x)`);
test(`(let ((x 1)) x)`, `(let ((x (+ 1 z))) x)`);
test(`(let ((x 1)) x)`, `(let ((x (+ 2 z))) x)`);
test(`(let ((x 1)) x)`, `(let ((x (+ (* a 1 b) z))) x)`);
test(`(let ((x 1)) x)`, `(let ((x 1)) (+ x 1))`);
test(`(let ((x 1)) x)`, `(let ((x 2)) (+ x 1))`);
test(`(let ((p (list a))) x)`, `(let ((p (list b a))) x)`);

test(`(if a b c)`, `(if x b c)`)
test(`(if a b c)`, `(if a x y)`)
test(`(if a b c)`, `(if a c b)`)
test(`(if a b c)`, `(if a (+ x y) (+ r s))`);

test(`(foo f g h)`, `(bar f g h)`);
test(`(foo f g h)`, `(foo x g h)`);
test(`(foo f g h)`, `(bar x y z)`);
test(`(foo f g h)`, `(foo 1 g h)`);
test(`(foo f g h)`, `(foo 1 2 3)`);
test(`(list a b c d e f g h i j k l m n o p q r s t u v w x y z)`, `(list a b c d e f g h i j k l m n p q r s t u v w x y z)`);
test(`(list a a a a a a a a a a a a a a a a a a)`, `(list a a a a a a a a a a b a a a a a a a a)`);
test(`(list a a a a a a a a a a a a a a a a a a)`, `(list a a a a a a a a a a b a a a a a a a)`);
test(`(let ((x (list a a a a a a a a a a a a a a a a a a))) b)`, `(let ((x (list a a a a a a a a a a a a a a a a a a))) c)`);

testEq(`(let ((x (list a a a a a a a a a a a a a a a a a a))) b)`);
testEq(`(list a a a a a a a a a a a a a a a a a a)`, `(list a a a a a a a a a a a a a a a a a a)`);

test(`(foo)`, `(foo f)`);
test(`(foo f)`, `(foo f g)`);
test(`(foo f)`, `(foo f g h)`);
test(`(foo f)`, `(foo x f y)`);
test(`(foo f)`, `(foo 1 f 2)`);
test(`(foo f)`, `(foo 1 2 3)`);
test(`(foo a b c)`, `(foo 1 a b 2)`);

test(`(lambda (f g h) foo)`, `(lambda (f g h) bar)`);
test(`(lambda (f g h) foo)`, `(lambda (f g h) (+ x y))`); // !REVISIT! the modify of foo -> + is a bit awkward, because then we also overwrite it in the new-to-add application (where the + was correct in the first place) (maybe modify makes sense for an arg but not operator because of cf consequences [where's the gain?])
test(`(lambda (f g h) foo)`, `(lambda (x g h) foo)`);
test(`(lambda (f g h) foo)`, `(lambda (x y z) bar)`);
test(`(lambda () foo)`, `(lambda (f) foo)`);
test(`(lambda (f) foo)`, `(lambda (f g) foo)`);
test(`(lambda (f) foo)`, `(lambda (f g h) foo)`);
test(`(lambda (f) foo)`, `(lambda (x f y) foo)`);

test(`(lambda () f)`, `(lambda (f) f)`); // !REVISIT! MRM (preferable) vs. MMR 
test(`(lambda (a b) f)`, `(lambda (a b f) f)`); // !REVISIT! MMMRM (pref) vs. MMMMR
test(`(lambda (a b) f)`, `(lambda (f a b) f)`);
test(`(lambda (y) z)`, `(lambda (x a b) z)`);
test(`(lambda (x) x)`, `(lambda (x) (+ x x))`);
test(`(lambda (x y) x)`, `(lambda (x y) (+ x y))`);
test(`(lambda (x y) x)`, `(lambda (x) (+ x y))`); // interesting 'quick' example MMLRRMR, but currently getting MMRRLMR (diff, solved diff2)
test(`(lambda (x) y)`, `(lambda (x y) z)`);
test(`(lambda (x) (lambda (y) z))`, `(lambda (x y) z)`); // (1)
test(`(lambda (o x) (lambda (y) z))`, `(lambda (o x y) z)`);
test(`(lambda (x o) (lambda (y) z))`, `(lambda (x o y) z)`);
test(`(lambda (x) (lambda (o y) z))`, `(lambda (x o y) z)`);
test(`(lambda (x a b) (lambda (y c d) z))`, `(lambda (x a b y c d) z)`);
test(`(lambda (y) z)`, `(lambda () (lambda (y) z))`);
test(`(lambda (x) y)`, `(lambda (x) (lambda (y) z))`);
test(`(lambda (y) z)`, `(lambda (x) (lambda (y) z))`); // interesting: MRRMM vs. (pref) RRMMM // (2)
test(`(lambda (y a b) z)`, `(lambda (x) (lambda (y a b) z))`);
test(`(lambda (y) z)`, `(lambda (x a b) (lambda (y) z))`);
test(`(lambda (x) (lambda (y z) z))`, `(lambda (x y) (lambda (z) z))`); // 'param jump' but intervening lambda!
test(`(lambda () (lambda () f))`, `(lambda () (lambda (f) f))`);
test(`y`, `(lambda () y)`);
test(`y`, `(lambda (y) z)`);
test(`y`, `(lambda (z) y)`);

test(`(let ((f (lambda (x) x))) f)`, `(let ((f (lambda (x) (+ x x)))) f)`);
test(`(f 1 (lambda (x) 2) 3)`, `(f 1 (lambda (x) 9) 3)`);
  
test(
`(let ((find-extension
  (lambda (url)
    (let ((_ "R"))
      (let ((l (list ".tar.gz")))
        (find (lambda (x) (sf? x url))
              l)))))) x)`,
`(let ((find-extension
  (lambda (url)
    (let ((_ "R"))
      (let ((l (list ".orig.tar.gz" ".tar.gz")))
        (find (lambda (x) (sf? x url))
              l)))))) x)`);


// // console.log(`${performance.now() - start} ms`)


test(`(let ((x #t))
        (if x
            'neg
            'zeropos))`,  
     `(let ((x #t))
        (if x
            'zeropos
            'neg))`);                           

test(`(let ((find-extension
        (lambda (url)
          (let ((_ "Return the extension of the archive e.g. '.tar.gz' given a URL, or false if none is recognized"))
            (let ((l (list ".tar.gz" ".tar.bz2" ".tar.xz" ".zip" ".tar" ".tgz" ".tbz" ".love")))
              (find (lambda (x) (string-suffix? x url))
                    l)))))) find-extension)`,
     `(let ((find-extension
        (lambda (url)
          (let ((_ "Return the extension of the archive e.g. '.tar.gz' given a URL, or false if none is recognized"))
            (let ((l (list ".orig.tar.gz" ".tar.gz" ".tar.bz2" ".tar.xz" ".zip" ".tar" ".tgz" ".tbz" ".love")))
              (find (lambda (x) (string-suffix? x url))
                    l)))))) find-extension)`); // shift SLOW pop fast


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