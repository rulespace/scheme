import { Null, Pair, SchemeParser, Sym } from '../sexp-reader.js';
import { nodeStream, diff, diff2edits, coarsifyEdits, applyEdits, tuples2string, tuple2shortString, diff2string } from '../differ.js';


function doDiff(src1, src2, suboptimal)
{
  const parser = new SchemeParser();

  const n1s = nodeStream(src1, parser);
  const p1str = tuples2string(n1s);

  const n2s = nodeStream(src2, parser);
  const p2str = tuples2string(n2s);
  
  console.log(`p1     ${p1str}
  ${n1s.map(tuple2shortString).join(' ')}`);
  console.log(`p2     ${p2str}
  ${n2s.map(tuple2shortString).join(' ')}`);

  const solutions = diff(n1s, n2s, {maxSolutions: 1000, keepLocalSuboptimalSolutions:false, keepGlobalSuboptimalSolutions:false, returnAllSolutions:false});
  // const solutions = diff(n1s, n2s, {maxSolutions: 1000, keepLocalSuboptimalSolutions:suboptimal, keepGlobalSuboptimalSolutions:suboptimal, returnAllSolutions:true});
  for (const solution of solutions)
  {
    console.log(`\n\n*****\nsolution ${diff2string(solution)} for ${p1str} ≈> ${p2str}`);

    const edits = diff2edits(solution, n1s, n2s);
    const edits2 = coarsifyEdits(edits, n1s);

    const p1edit = applyEdits(n1s, edits2);  
    const p1editstr = tuples2string(p1edit);
  
    console.log(`p1edit ${p1editstr}
    ${p1edit.map(tuple2shortString).join(' ')}`);
  
    if (p1editstr !== p2str)
    {
      throw new Error(`match error:
      p1edit: ${p1editstr}
      p2    : ${p2str}`);
    }
    
  }
}

function test(src1, src2, suboptimal = true)
{
  console.log("\n============");
  console.log("\n*** L->R ***");
  doDiff(src1, src2, suboptimal);
  console.log("\n*** R->L ***");
  doDiff(src2, src1, suboptimal);
}

function testEq(src, suboptimal = true)
{
  console.log("\n============");
  doDiff(src, src, suboptimal);
}

const start = performance.now();

const OPTIMAL = false; // suboptimal = false

testEq(`1`);
testEq(`()`);
testEq(`x`);
testEq(`'a`);
testEq(`"a"`);

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
test(`(let ((p (list a))) x)`, `(let ((p (list b a))) x)`); // (3)
test(`(let ((p (list a))) x)`, `(let ((p (list c b a))) x)`);
test(`(let ((p (list a))) x)`, `(let ((p (list a b))) x)`); // (4)
test(`(let ((p (list a))) x)`, `(let ((p (list a b c))) x)`);
test(`(let ((p (list a))) x)`, `(let ((p (list b a c))) x)`);


test(`(if a b c)`, `(if x b c)`);
test(`(if a b c)`, `(if a x y)`);
test(`(if a b c)`, `(if a c b)`);
test(`(if a b c)`, `(if a (+ x y) (+ r s))`);
test(`(if x neg (let ((fac x)) 8))`, `(if x (let ((fac x)) 8) neg)`); // interesting: M(4)

test(`(set! a b)`, `(set! a c)`);
test(`(set! a b)`, `(set! x b)`);
test(`(set! a b)`, `(set! x y)`);
test(`(set! a b)`, `(set! b a)`);
test(`(set! a b)`, `(set! b c)`);

test(`(foo f g h)`, `(bar f g h)`);
test(`(foo f g h)`, `(foo x g h)`);
test(`(foo f g h)`, `(bar x y z)`);
test(`(foo f g h)`, `(foo 1 g h)`);
test(`(foo f g h)`, `(foo 1 2 3)`);
test(`(list a b c d e f g h i j k l m n o p q r s t u v w x y z)`, `(list a b c d e f g h i j k l m n p q r s t u v w x y z)`);
test(`(list a a a a a a a a a a a a a a a a a a)`, `(list a a a a a a a a a a b a a a a a a a a)`, OPTIMAL);
test(`(list a a a)`, `(list a b a)`);
test(`(let ((x (list a a a a a a a a a a a a a a a a a a))) b)`, `(let ((x (list a a a a a a a a a a a a a a a a a a))) c)`, OPTIMAL);

testEq(`(let ((x (list a a a a a a a a a a a a a a a a a a))) b)`, OPTIMAL);
testEq(`(list a a a a a a a a a a a a a a a a a a)`, OPTIMAL);

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
test(`y`, `(lambda () y)`);
test(`y`, `(lambda (y) z)`);
test(`y`, `(lambda (z) y)`);
test(`(f 1 (lambda (x) 2) 3)`, `(f 1 (lambda (x) 9) 3)`);

test(`(lambda (x y) z)`, `(lambda (x) (lambda (y) z))`); // (1)
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

test(`(let ((f (lambda (x) x))) f)`, `(let ((f (lambda (x) (+ x x)))) f)`);
test(`(if a b c)`, `(if (let ((x 1)) (* a x)) (let ((y 2)) (+ b y)) (let ((z 3)) (- c z)))`); // interesting: is easy to make slow

// non-ANF
test(`(f (g 2))`, `(f (h 3))`);
test(`(f (g (h 3)))`, `(f (h 3))`);
// ^^ non-ANF

  
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
            'neg)`, OPTIMAL);



test(Deno.readTextFileSync('diffdata/regex1-left.scm'), Deno.readTextFileSync('diffdata/regex1-right.scm'), OPTIMAL);
test(Deno.readTextFileSync('diffdata/regex1-smaller-left.scm'), Deno.readTextFileSync('diffdata/regex1-smaller-right.scm'), OPTIMAL);
test(Deno.readTextFileSync('diffdata/regex1-smallest-left.scm'), Deno.readTextFileSync('diffdata/regex1-smallest-right.scm'), OPTIMAL);

// deno test --allow-read diff.test.js