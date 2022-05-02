import { Null, Pair, SchemeParser, Sym } from '../sexp-reader.js';
import { ast2tuples, diff } from '../differ.js';

const parser = new SchemeParser();

function apply(p, edits)
{
  const ts = ast2tuples(p);
  for (const edit of edits)
  {
    switch (edit[0])
    {
      case 'modify':
        {
          
        }
      default: throw new Error(`cannot handle edit ${edit}`);
    }
  }
}

function test(src1, src2)
{
  const parser = new SchemeParser();
  const p1 = parser.parse(src1);
  const p2 = parser.parse(src2);
  const edits = diff(p1, p2);
  console.log(edits);
  const p1edit = apply(p1, edits);
}

test(`(let ((x 1)) x)`, `(let ((x 2)) x)`);

                           
// const p1 = parser.parse(`(let ((x 1)) x)`).car;
// const p2 = parser.parse(`(let ((x 2)) x)`).car;

// const p1 = parser.parse(`(foo f g h)`).car;
// const p2 = parser.parse(`(bar f g h)`).car;

// const p1 = parser.parse(`(lambda (x y) (+ x y))`).car;
// const p2 = parser.parse(`(lambda (x) x)`).car;

// const p1 = parser.parse(`(let ((x #t))
//                               (if x
//                                   'neg
//                                   'zeropos))`).car;
// const p2 = parser.parse(`(let ((x #f))
//                               (if x
//                                   'neg
//                                   'zeropos))`).car;


// const p1 = parser.parse(`(let ((find-extension
//   (lambda (url)
//     (let ((_ "Return the extension of the archive e.g. '.tar.gz' given a URL, or false if none is recognized"))
//       (let ((l (list ".tar.gz" ".tar.bz2" ".tar.xz" ".zip" ".tar" ".tgz" ".tbz" ".love")))
//         (find (lambda (x) (string-suffix? x url))
//               l)))))) find-extension)`).car;
// const p2 = parser.parse(`(let ((find-extension
//   (lambda (url)
//     (let ((_ "Return the extension of the archive e.g. '.tar.gz' given a URL, or false if none is recognized"))
//       (let ((l (list ".orig.tar.gz" ".tar.gz" ".tar.bz2" ".tar.xz" ".zip" ".tar" ".tgz" ".tbz" ".love")))
//         (find (lambda (x) (string-suffix? x url))
//               l)))))) find-extension)`).car;

        
                              


