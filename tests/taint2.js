import { instance2graph as instance2pgraph, pgraph2dot } from '../deps.ts';
import { specification } from '../agreval-func-rsp.js';
import { create_agreval, lattice_conc, kalloc_conc } from '../agreval.js';

const taint_rsp = `

(rule [prim_binding "source" (lambda (n) n) 1])
(rule [prim_binding "sink" (lambda (x) "<undefined>") 1])


`;

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
  const agreval = create_agreval(specification, lattice_conc + kalloc_conc + taint_rsp);
  const evaluator = agreval(program);
  const resultValues = [...evaluator.result()];
  console.log(`evaluation results: ${resultValues}`);
  const g = instance2pgraph(evaluator.evaluator);
  g.nodeSmooth(n => n.type !== 'tuple' || n.name === 'ast' || n.name === 'atomic'  || n.name === 'atom' || n.name === 'has_parent' || n.name === 'parent' || n.name === 'binding');
  // console.log(g.toDot(pnodeLabeler(evaluator)));
  g.nodeSmooth(n => n.name !== 'greval');
  console.log(g.toDot(pnodeLabeler(evaluator)));

  return evaluator;
  // const grevalLinks = taint.tuples().filter(t => t.constructor.name === 'GrevalLink');
  // console.log(grevalLinks.map(l => `${evaluator.expToString(l.t0.t0)} -> ${evaluator.expToString(l.t1.t0)}`).join('\n'));
}

function pnodeLabeler(evaluator)
{
  return pnode => printPnode(pnode, evaluator);
}

function printPnode(node, evaluator)
{
  if (node.type === 'tuple')
  {
    switch (node.name)
    {
      case 'greval':
        return `[greval ${evaluator.expToString(node.values[0])}#${node.values[0]} ${printPnode(node.values[1], evaluator)} ${node.values[2]}]`;
      // case 'state':
      //   return`[state ${evaluator.expToString(node.values[0])}#${node.values[0]} ${node.values[1]}]`;
      default:
        return `[${node.name} ${node.values.map(value => printPnode(value, evaluator)).join(' ')}]`;
    }  
  }
  else if (node.type === 'product')
  {
    return 'X';
  }
  else
  {
    return String(node);
  }
}


// criterion has to be name of a unique reference
function slice(program, criterion)
{
  const evaluator = analyze(program);
  const criterionGrevalNodes = evaluator.tuples().filter(t => t.name() === 'greval' && (astTuple => astTuple.name() === '$id' && astTuple.values()[1] === criterion)(evaluator.astTuple(t.values()[0])));
  console.log(`criterion nodes: ${criterionGrevalNodes}`);

  // const edges = [];
  // const wl = criterionGrevalNodes.map(t => [t, t]);

  // console.log(`traces: ${criterionGrevalNodes.flatMap(t => trace([t])).map(tr => tr.map(t => print(t, evaluator))).join('\n\n')}`);
}


// slice(`
// (let ((x (source 1)))
//   x)
// `, 'x');


// slice(`
// (let ((y (source 1)))
//   (let ((x y))
//     x))
// `, 'x');

// slice(`
// (let ((x (source 1)))
//   (let ((y 456))
//     x))
// `, 'x');

// slice(`
// (let ((f (lambda () (source 1))))
//   (let ((x (f)))
//     x))
// `, 'x');

// slice(`
// (let ((f (lambda () (source 1))))
//   (let ((g (lambda () 123)))
//     (let ((x (if #f
//               (f)
//               (g))))
//       x)))
// `, 'x');

slice(`
(let ((f (lambda () (source 1))))
  (let ((y (f)))
    (let ((x (if y
                 11
                 22)))
      x)))
`, 'x');
