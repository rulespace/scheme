import { create_igreval, instance2dot } from '../igreval.js';
import { kalloc_conc } from '../kalloc-rsp.js';
import { lattice_conc } from '../lattice-rsp.js';
import { Null, Pair, SchemeParser, Sym } from '../sexp-reader.js';
import { diff } from '../differ-ast.js';
import { assertTrue } from '../deps.ts';


const parser = new SchemeParser();
function scheme(strings, ...keys)
{
  // console.log(strings);
  // console.log(keys);
  const sb = [];
  keys.forEach((k, i) => {
    for (const c of strings[i])
    {
      sb.push(c);
    }
    sb.push(k);
  });
  for (const c of strings.at(-1))
  {
    sb.push(c);
  }
  return parser.parse(sb).car;
}

function test(src1, src2)
{
  const parser = new SchemeParser();
  const p1 = parser.parse(src1).car;
  const p2 = parser.parse(src2).car;
  const edits = diff(p1, p2);

  console.log(edits);

  const initialEval = create_igreval(lattice_conc + kalloc_conc); // TODO also should be non-incremental for comp
  const start1 = performance.now();
  const eval1 = initialEval(p1); // not symmetric (function iso. method)
  const duration1 = performance.now() - start1;
  const start1d = performance.now();
  const eval1d = eval1.deltaEvaluate(edits);
  const duration1d = performance.now() - start1d;

  const initialEval2 = create_igreval(lattice_conc + kalloc_conc); // TODO does not need to be incr
  const start2 = performance.now();
  const eval2 = initialEval2(p2);
  const duration2 = performance.now() - start2;

  const src1d_ = eval1d.expToString(eval1d.rootTag());
  const src2_ = eval2.expToString(eval2.rootTag());
  console.log(`src2_  ${src2_}`);
  console.log(`src1d_ ${src1d_}`);
  if (src1d_ !== src2_)
  {
    throw new Error(`src2 does not match src1d`);
  }

  const result1d = eval1d.result();
  //console.log(instance2dot(eval1d.evaluator));
  const result2 = eval2.result();
  assertTrue(result1d.length === 1);
  assertTrue(result2.length === 1);

  if (eval1d.print(result1d[0]) !== eval2.print(result2[0]))
  {
    throw new Error(`different results between p1-delta and p2 eval: p1d ${result1d[0]} p2 ${result2[0]}`);
  }
  console.log(`1 ${duration1} 1d ${duration1d} 2 ${duration2}`);
}
                                  
                                  

test(`1`, `2`);
test(`1`, `1`);
test(`#t`, `#f`);
test(`(let ((x 1)) x)`, `(let ((x 2)) x)`);
test(`(let ((x 1)) (let ((y 2)) x))`, `(let ((x 1)) (let ((y 2)) y))`);
test(`(let ((x #t)) (if x 1 2))`, `(let ((x #f)) (if x 1 2))`);
test(`(let ((x #t)) (if x 1 2))`, `(let ((x #t)) (if x 99 2))`);
test(`(let ((x #f)) (if x 1 2))`, `(let ((x #f)) (if x 1 99))`);
test(`(let ((x #f)) (if x 1 2))`, `(let ((x #f)) (if x 99 2))`);
test(`(let ((f (lambda () 1))) (f))`, `(let ((f (lambda () 2))) (f))`);
test(`(let ((f (lambda (x) x))) (f 1))`, `(let ((f (lambda (x) x))) (f 2))`);
test(`(let ((f (lambda (x) x))) (f 1))`, `(let ((f (lambda (y) y))) (f 1))`);
test(`(+ 1 1)`, `(+ 1 2)`);

test(`(lambda (x) x)`, `(lambda (x y) x)`);
test(`(lambda (x y) (+ x y))`, `(lambda (x z y) (+ x y))`);
test(`(lambda (x y) (+ x y))`, `(lambda (z x y) (+ x y))`);

test(`(let ((f (lambda (x) x))) (f 1))`, `(let ((f (lambda (x y) x))) (f 1 2))`);
test(`(let ((f (lambda (x y) (+ x y)))) (f 1 2))`, `(let ((f (lambda (x z y) (+ x y)))) (f 1 99 2))`);
test(`(let ((f (lambda (x y) (+ x y)))) (f 1 2))`, `(let ((f (lambda (z x y) (+ x y)))) (f 99 1 2))`);


// test(`'hello`, `'hello`) does not work (no support in greval)

// test(
//   `(let ((square (lambda (x) (* x x)))
//       (double (lambda (x) (+ x x))))
//    (let ((a (square 10))
//          (b (square 20))
//          (c (square 30)))
// 	  (+ a b c)))`, 
 // ANF);



