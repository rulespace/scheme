import { assertTrue, analyzeProgram, compileToRsp } from '../deps.ts';
import { create_igreval, instance2dot, semantics_scheme } from '../igreval.js';
import { kalloc_conc } from '../kalloc-rsp.js';
import { lattice_conc } from '../lattice-rsp.js';
import { Null, Pair, SchemeParser, Sym } from '../sexp-reader.js';
import { diff } from '../differ.js';

const section = s => `\n\n=== ${s}`;

const p1 = `(let ((x 10)) (let ((f (lambda (a b) (+ a b )))) (f x 20)))`;

const parser = new SchemeParser();
const ast1 = parser.parse(p1).car;
const initialEval = create_igreval(lattice_conc + kalloc_conc);
const eval1 = initialEval(ast1);

console.log(section("Labeling of expressions and encoding in tuples"))
console.log(eval1.tuples().filter(eval1.isAstTuple).join('\n'));

console.log(section("Parents and AST Root"))
console.log(eval1.tuples().filter(t => t.name() === 'parent').join('\n'));
console.log(eval1.tuples().filter(t => t.name() === 'ast_root').join('\n'));

console.log(section("Atomic Evaluation Contexts"))
console.log(eval1.tuples().filter(t => t.name() === 'atomic').join('\n'));

//////
const program = compileToRsp(semantics_scheme);
const analysis = analyzeProgram(program);
const predLabel = label => label.name.replace('$', '').replaceAll('_', '\\-');

// console.log(section("Dependency Graph"))
// let sb = "digraph G {\nnode [style=filled,fontname=\"Roboto Condensed\"];\n";
// analysis.preds.forEach(pred => {
//   sb += `${predLabel(pred)} [label="${predLabel(pred)}" color="0.650 0.200 1.000"];\n`;
//   pred.posDependsOn.forEach(posDep => sb += `${predLabel(posDep)} -> ${predLabel(pred)};\n`);
// } );
// sb += `}`;
// console.log(sb);

console.log(section("Topological Sort"));
const filterPreds = ['abst', 'is_false', 'is_true', 'kalloc', 'setcxr', 'sets'];
console.log(analysis.strata().map(stratum =>
  `(${stratum.preds.filter(pred => !pred.edb).filter(pred => filterPreds.indexOf(pred.name) < 0).map(pred => `$\\rel{${predLabel(pred)}}$`).join(", ")})`)
    .filter(stratumString => stratumString !== "()").join(", "));





console.log(section("Evaluation"));