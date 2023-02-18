import { compileToConstructor, instance2dot } from '../deps.ts';
import { create_agreval, lattice_conc, kalloc_conc } from '../agreval.js';

const taintRsp = `

(rule [TupleReachable x y] [TupleLink x y])
(rule [TupleReachable x y] [TupleReachable x z] [TupleLink z y])

(rule [GrevalTuple x] [Tuple x "greval"])
(rule [NonGrevalTuple x] [Tuple x pred] (!= pred "greval"))

(rule [GrevalLink x y] [TupleLink x y] [GrevalTuple x] [GrevalTuple y])
(rule [GrevalLink x y] [NonGrevalLink x z] [TupleLink z y] [GrevalTuple x] [GrevalTuple y])
(rule [NonGrevalLink x y] [TupleLink x y] [NonGrevalTuple y])
(rule [NonGrevalLink x y] [NonGrevalLink x z] [TupleLink z y] [NonGrevalTuple y])


(rule [InformationFlow x y] [GrevalLink y x])
`

function transfer(tuple, targetInstance)
{
  if (targetInstance[tuple.constructor.name])
  {
    return new targetInstance[tuple.constructor.name](...tuple.values());
  }
  return null;
}

// function select1(arr)
// {
//   if (arr.length != 0)
//   {
//     throw new Error(`expected 1 result, got ${arr.length} results: ${arr}`)
//   }
//   return arr[0];
// }

function analyze(program)
{
  const agreval = create_agreval(lattice_conc + kalloc_conc);
  const evaluator = agreval(program);
  const resultValues = [...evaluator.result()];
  console.log(`evaluation results: ${resultValues}`);
  console.log(instance2dot(evaluator.evaluator));
  const metaTuples = [...evaluator.meta().tuples()];
  console.log(`${metaTuples.length} meta tuples`);
  const meta = compileToConstructor(taintRsp)();
  meta.addTuples(metaTuples.map(t => transfer(t, meta)).filter(x => x !== null));

  return {evaluator, meta};
  // const grevalLinks = taint.tuples().filter(t => t.constructor.name === 'GrevalLink');
  // console.log(grevalLinks.map(l => `${evaluator.expToString(l.t0.t0)} -> ${evaluator.expToString(l.t1.t0)}`).join('\n'));
}

function print(t, evaluator)
{
  if (t?.name instanceof Function)
  {
    switch (t.name())
    {
      case 'greval':
        return `[greval ${t.values()[0]} ${evaluator.expToString(t.values()[0])}]`;
      default:
        return t.toString();
    }  
  }
  else
  {
    return String(t);
  }
}

// criterion has to be name of a unique reference
function slice(program, criterion)
{
  const {evaluator, meta} = analyze(program);
  const criterionGrevalNodes = evaluator.tuples().filter(t => t.name() === 'greval' && (astTuple => astTuple.name() === '$id' && astTuple.values()[1] === criterion)(evaluator.astTuple(t.values()[0])));
  console.log(`criterion nodes: ${criterionGrevalNodes}`);

  const ifLinks = meta.tuples().filter(t => t.name() === 'InformationFlow');
  console.log("if links:");
  console.log(ifLinks.map(l => `${evaluator.expToString(l.t0.t0)} -> ${evaluator.expToString(l.t1.t0)}`).join('\n'));
  console.log("---");

  function nextFlow(tuple)
  {
    const result = [];
    for (const l of ifLinks)
    {
      if (l.values()[0] === tuple)
      {
        console.log(`${print(l.values()[0], evaluator)} -> ${print(l.values()[1], evaluator)}`);
        result.push(l.values()[1]);
      }
    }
    return result;
  }

  function trace(path)
  {
    const acc = [];
    function helper(path)
    {
      const nf = nextFlow(path[path.length -1]);
      if (nf.length === 0)
      {
        acc.push(path);
        return;
      }
      nf.forEach(n => helper([...path, n]));  
    }
    helper(path);
    return acc;
  }

  console.log(`traces: ${criterionGrevalNodes.flatMap(t => trace([t])).map(tr => tr.map(t => print(t, evaluator))).join('\n\n')}`);
}


// slice(`
// (let ((x 123))
//   x)
// `, 'x');


// slice(`
// (let ((y 123))
//   (let ((x y))
//     x))
// `, 'x');

slice(`
(let ((f (lambda () 123)))
  (let ((x (f)))
    x))
`, 'x');