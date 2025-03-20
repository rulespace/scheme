import { Null, Pair, SchemeParser, Sym } from '../sexp-reader.js';
import { DiffConfig } from '../differ-ast.js';


function doDiff(leftSrc, rightSrc, diffConfig)
{
  const parser = new SchemeParser();

  const leftNodes = diffConfig.createNodes(leftSrc, parser);
  const rightNodes = diffConfig.createNodes(rightSrc, parser);
  
  const leftStr = diffConfig.nodes2string(leftNodes);
  const rightStr = diffConfig.nodes2string(rightNodes);

  console.log(`p1     ${leftStr}
  ${leftNodes.join(' ')}`);
  console.log(`p2     ${rightStr}
  ${rightNodes.join(' ')}`);

  const differ = diffConfig.createDiffer();
  const selection = differ.computeSelection(leftNodes, rightNodes);

  console.log(`selection: ${differ.selection2string(selection)}`);

  const edits = differ.selection2edits(selection, leftNodes, rightNodes);
  const edits2 = differ.coarsifyEdits(edits, leftNodes);

  const leftEdit = differ.applyEdits(leftNodes, edits2);  
  const leftEditStr = diffConfig.nodes2string(leftEdit);
  
  // console.log(`leftEdit ${leftEditStr} // DEBUG
  // ${leftEdit.join(' ')}`);
  // console.log(`${leftEdit.map(diffConfig.node2shortString).join(' ')}`);

  if (leftEditStr !== rightStr)
  {
    throw new Error(`match error:
    leftEditStr: ${leftEditStr}
    rightStr   : ${rightStr}`);
  }          
}

function test(src1, src2)
{
  const diffConfig = new DiffConfig();
  console.log("\n============");
  console.log("\n*** L->R ***");
  doDiff(src1, src2, diffConfig);
  console.log("\n*** R->L ***");
  doDiff(src2, src1, diffConfig);
}

function testEq(src, suboptimal = true)
{
  const diffConfig = new DiffConfig();
  console.log("\n============");
  doDiff(src, src, diffConfig);
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


console.log(`duration: ${performance.now() - start} ms`);

// deno test --allow-read diff.test.js
