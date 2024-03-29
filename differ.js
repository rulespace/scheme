import { assertTrue } from './deps.ts';
import { Null, Pair, SchemeParser, Sym } from './sexp-reader.js';

export { nodeStream, nodeMap, diff, diff2edits, coarsifyEdits, applyEdits, tuples2string, tuple2shortString, diff2string };

// TODO: quote is handled as an application

// ast
const $lit = 0;
const $id = 1;
const $param = 2;
const $let = 3;
const $letrec = 4;
const $if = 5;
const $set = 6;
const $lam = 7;
const $app = 8;

// progress
const CHOICES = 0;
const I = 1;
const J = 2
const COST = 3;

// edits
const MATCH = 0;
const MODIFY = 1;
const LEFT = 2;
const RIGHT = 3;

function diff2string(diff)
{
  let sb = "";
  for (const [d, l] of diff)
  {
    switch (d)
    {
      case MATCH: l === 1 ? sb += 'M' : sb += `M(${l})`; break;
      case LEFT: l === 1 ? sb += 'L' : sb += `L(${l})`; break;
      case RIGHT: l === 1 ? sb += 'R' : sb += `R(${l})`; break;
      default: throw new Error(d);
    }
  }
  return sb;
}

function progressEq(d1, d2)
{
  return d1[COST] === d2[COST] && d1[I] === d2[I] && d1[J] === d2[J];
}


function ast2tuples(ast)
{
  if (ast instanceof String)
  {
    return [[$lit, ast.tag, ast.toString()]];
  }
  if (ast instanceof Number)
  {
    return [[$lit, ast.tag, ast.valueOf()]];
  }
  if (ast instanceof Boolean)
  {
    return [[$lit, ast.tag, ast.valueOf()]];
  }
  if (ast instanceof Null)
  {
    return [[$lit, ast.tag, new Null().valueOf()]]; // TODO: improve
  }
  if (ast instanceof Sym)
  {
    return [[$id, ast.tag, ast.toString()]];
  }
  if (ast instanceof Pair)
  {
    const car = ast.car;
    if (car instanceof Sym)
    {
      switch (car.name)
      {
        case "lambda":
        {
          const params = ast.cdr.car;
          const paramTuples = [...params].map(sym => [$param, sym.tag, sym.toString()]);
          const body = ast.cdr.cdr.car; // only one body exp allowed (here, and elsewhere)
          const bodyTuples = ast2tuples(body);
          return [[$lam, ast.tag, ...[...params].map(t => t.tag), body.tag], ...paramTuples, ...bodyTuples];
        }
        case "let":
        {
          const binding = ast.cdr.car;
          const name = binding.car.car;
          const init = binding.car.cdr.car;
          const body = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const initTuples = ast2tuples(init);
          const bodyTuples = ast2tuples(body);
          return [[$let, ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
        }
        case "letrec":
        {
          const binding = ast.cdr.car;
          const name = binding.car.car;
          const init = binding.car.cdr.car;
          const body = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const initTuples = ast2tuples(init);
          const bodyTuples = ast2tuples(body);
          return [[$letrec, ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
        }
        case "if":
        {
          const cond = ast.cdr.car;
          const cons = ast.cdr.cdr.car;
          const alt = ast.cdr.cdr.cdr.car;
          const condTuples = ast2tuples(cond);
          const consTuples = ast2tuples(cons);
          const altTuples = ast2tuples(alt);
          return [[$if, ast.tag, cond.tag, cons.tag, alt.tag], ...condTuples, ...consTuples, ...altTuples];
        }
        // case "cons":
        // {
        //   const car = ast.cdr.car;
        //   const cdr = ast.cdr.cdr.car;
        //   const carTuples = ast2tuples(car);
        //   const cdrTuples = ast2tuples(cdr);
        //   return [['$cons', ast.tag, car.tag, cdr.tag], ...carTuples, ...cdrTuples];
        // }
        // case "car":
        // {
        //   const pair = ast.cdr.car;
        //   const pairTuples = ast2tuples(pair);
        //   return [['$car', ast.tag, pair.tag], ...pairTuples];
        // }
        // case "cdr":
        // {
        //   const pair = ast.cdr.car;
        //   const pairTuples = ast2tuples(pair);
        //   return [['$cdr', ast.tag, pair.tag], ...pairTuples];
        // }
        case "set!":
        {
          const name = ast.cdr.car;
          const update = ast.cdr.cdr.car;
          const nameTuples = ast2tuples(name);
          const updateTuples = ast2tuples(update);
          return [[$set, ast.tag, name.tag, update.tag], ...nameTuples,  ...updateTuples];         
        }
        // case "set-car!":
        // {
        //   const name = ast.cdr.car;
        //   const update = ast.cdr.cdr.car;
        //   const nameTuples = ast2tuples(name);
        //   const updateTuples = ast2tuples(update);
        //   return [['$setcar', ast.tag, name.tag, update.tag], ...nameTuples, ...updateTuples];         
        // }
        // case "set-cdr!":
        // {
        //   const name = ast.cdr.car;
        //   const update = ast.cdr.cdr.car;
        //   const nameTuples = ast2tuples(name);
        //   const updateTuples = ast2tuples(update);
        //   return [['$setcdr', ast.tag, name.tag, update.tag], ...nameTuples, ...updateTuples];         
        // }

        default: // app
        {
          const ratorTuples = ast2tuples(car);
          const argTuples = [...ast.cdr].map(ast2tuples);
          return [[$app, ast.tag, car.tag, ...[...ast.cdr].map(t => t.tag)], ...ratorTuples, ...argTuples.flat()];
        }
      }
    }
    else // not a special form
    { // TODO: cloned from default (`app`) case above
      const ratorTuples = ast2tuples(car);
      const argTuples = [...ast.cdr].map(ast2tuples);
      return [[$app, ast.tag, car.tag, ...[...ast.cdr].map(t => t.tag)], ...ratorTuples, ...argTuples.flat()];
    }
  }
  throw new Error(`cannot handle expression ${ast} of type ${ast?.constructor?.name}`);
}


function subtreeMatches(t1, n1map, t2, n2map)
{
  if (((t1[0] < 3)) && t1[0] === t2[0])
  {
    if (t1[2] === t2[2])
    {
      return 1;
    }
    return 0;
  }
  else
  {
    if (t1[0] !== t2[0] || t1.length !== t2.length)
    {
      return 0;
    }
    let intermediateN = 1;
    for (let i = 2; i < t1.length; i++)
    {
      const nn = subtreeMatches(n1map[t1[i]], n1map, n2map[t2[i]], n2map);
      if (nn === 0)
      {
        return 0;
      }
      else
      {
        intermediateN += nn;
      }
    }
    return intermediateN;  
  }
}

function nodeMap(ts)
{
  const m = [];
  for (const t of ts)
  {
    m[t[1]] = t;
  }
  return m;
}

function step1(n1s, n1map, n2s, n2map, returnAllSolutions, keepSuboptimalSolutions)
{
  const initial = [[], 0, 0, 0];  // choices i j cost
  const leafs = [];
  const todo = [initial];

  let globalSuboptimal = 0;
  let globalMinCost = 9007199254740991;

  const minCost = [];
  function isProgress(progress)
  {
    const [choices, i, j, cost] = progress;
    const jbucket = minCost[i];
    if (jbucket === undefined)
    {
      const jb = [];
      jb[j] = cost;
      minCost[i] = jb;
      return true;
    }
    else
    {
      if (jbucket[j] === undefined)
      {
        jbucket[j] = cost;
        return true;
      }
      return cost < jbucket[j];
    }
  }

  // function progressSuboptimal(existing, proposed)
  // {
  //   return existing[I] === proposed[I] && existing[J] === proposed[J] && existing[COST] <= proposed[COST];
  // }


  // const node2hash1 = node2hash(n1s, n1map);
  // const node2hash2 = node2hash(n2s, n2map);

  let localSuboptimal = 0;
  function pushProgress(progress)
  {
    if (isProgress(progress))
    {
      todo.push(progress);
    }
    else
    {
      localSuboptimal++;
      // console.log(`not adding duplicate progress ${progress}`);
    }
  }

  function unshiftProgress(progress)
  {
    if (isProgress(progress))
    {
      todo.unshift(progress);
    }
    else
    {
      localSuboptimal++;
      // console.log(`not adding duplicate progress ${progress}`);
    }
  }

  function rightProgress(choices, i, j, cost)
  {
    unshiftProgress([choices.concat([[RIGHT, 1]]), i, j+1, cost + 1]);
  }

  function leftProgress(choices, i, j, cost)
  {
    unshiftProgress([choices.concat([[LEFT, 1]]), i + 1, j, cost + 1]);
  }

  // const stmatches = [];

  while (todo.length > 0)
  {

    // if (leafs.length > 0) // DEBUG
    // {
    //   leafs.sort((a, b) => a[1] - b[1]);
    //   console.log(`${leafs.length} solutions, current top ${leafs[0].join(' ')}`);  
    // }

    // let same = 0; // DEBUG
    // for (let yy = 0; yy < todo.length; yy++)
    // {
    //   for (let yyy = yy + 1; yyy < todo.length; yyy++)
    //   {
    //     if (progressEq(todo[yy], todo[yyy]))
    //     {
    //       same++;
    //     }
    //   }
    // }
    // console.log(`same ${same}`);

    // const [choices, i, j, cost] = todo.length % 2 === 0 ? todo.pop() : todo.shift();
    const [choices, i, j, cost] = todo.pop();
    
    // console.log(diff2string(choices)); // DEBUG

    if (cost >= globalMinCost)
    {
      // console.log(`minCost ${globalMinCost} killing ${cost}`);
      globalSuboptimal++;
      continue;
    }

    if (i === n1s.length && j === n2s.length)
    {
      console.log(`solution ${cost} ${diff2string(choices)} (todo ${todo.length})`);
      // console.log(choices);
      leafs.push([choices, cost]);
      if (!keepSuboptimalSolutions)
      {
        globalMinCost = cost; // because of earlier test always cost < minCost
      }
      continue;
    }

    if (i === n1s.length)
    {
      rightProgress(choices, i, j, cost);
      continue;
    }
    
    if (j === n2s.length)
    {
      leftProgress(choices, i, j, cost);
      continue;
    }

    // if (Math.round(performance.now()) % 1000 === 0) // DEBUG
    // {
    //   // todo.sort((a, b) => a[1] - b[1]); // b-a => high to low
    //   // todo.splice(0, todo.length % 2);
    //   console.log(i, n1s.length, j, n2s.length, todo.length, cost, minCost);    
    //   // console.log(`cheapest i ${todo.at(-1)[1]} j ${todo.at(-1)[2]} cost ${todo.at(-1)[3]}`);
    // }

    const left = n1s[i];
    const right = n2s[j];
    
    if (left[0] === right[0])
    {
      const matches = subtreeMatches(left, n1map, right, n2map);
      if (matches > 0)
      {
        pushProgress([choices.concat([[MATCH, matches]]), i+matches, j+matches, cost]);
      }
      else
      {
        if (left[0] < 3)
        {
          // no M for simple (non-compound) here (possible M from subtree matches higher up)
        }
        else // always compound, no full match
        {
          // if (left[0] === '$let' || left[0] === '$letrec' || left[0] === '$if' || left[0] === '$lam' || left[0] === '$app') || ...
          pushProgress([choices.concat([[MATCH, 1]]), i+1, j+1, cost]);
        }  
      }
    }
    leftProgress(choices, i, j, cost);
    rightProgress(choices, i, j, cost);
  }

  leafs.sort((a, b) => a[1] - b[1]); // TODO: dynamically track shortest instead of post-sort
  // console.log(leafs.slice(0, 100).join('\n'));

  console.log(`solutions: ${leafs.length}; localSuboptimal: ${localSuboptimal} globalSuboptimal: ${globalSuboptimal}`); 
  const [topChoices, cost] = leafs[0];
  // console.log(`top choices (cost ${cost}):\n${topChoices.join('\n')}`);  
  return returnAllSolutions ? leafs.map(l => l[0]) : [topChoices];
}


function diff2edits(diff, n1s, n2s) // step2
{
  //stack
  const EXP = 0;
  const RPOS = 1;
  const RLEN = 2;
  const WPOS = 3;
  const WLEN = 4;
  const ORIG = 5;

  // ast (TODO: move to top-level)
  const TYPE = 0;
  const TAG = 1;
  const VAL = 2; // $lit $id

  let c = 0;
  let i = 0;
  let j = 0;

  const sc = [];
  const edits = [];

  function consumeChoice()
  {
    return diff[c++];
  }

  // function modifyVal(tag, pos, val)
  // {
  //   const edit = ['modifyVal', tag, pos, val];
  //   // console.log(`\t\t${edit}`); DEBUG
  //   edits.push(edit);
  // }

  function modifyTag(tag, pos, newTag)
  {
    const edit = ['modifyTag', tag, pos, newTag];
    // console.log(`\t\t${edit}`); DEBUG
    edits.push(edit);
  }

  function add(el)
  {
    const edit = ['add', el]; 
    console.log(`\t\t${edit}`); // DEBUG
    edits.push(edit);
  }

  function remove(el)
  {
    const edit = ['remove', el];
    console.log(`\t\t${edit}`); // DEBUG
    edits.push(edit); 
  }

  function genericEdit(edit)
  {
    console.log(`\t\t${edit}`); // DEBUG
    edits.push(edit);
  }

  function frame2string(frame)
  {
    return `${tuple2shortString(frame[EXP])} R ${frame[RPOS]}/${frame[RLEN]} W ${frame[WPOS]}/${frame[WLEN]} |${frame[ORIG]}|`;
  }

  function stack2string(stack)
  {
    return stack.map(frame2string).toReversed().join(" ");
  }

  function findMatchPos()
  {
    for (let s = sc.length - 2; s >= 0; s--)
    {
      // console.log(`\t\tinspecting ${s}/${sc.length - 1}`); // DEBUG
      // const pos = sc.at(s)[POS];
      // const len = sc.at(s)[LEN];
      // if (pos < len)
      {
        const orig = sc.at(s)[ORIG];
        if (orig === 'M')
        {
          // console.log(`\t\t\tmatch frame ${frame2string(sc.at(s))}`) // DEBUG
          return s;
        }
      }
    }
    return false; // no higher-up match
  }

  while (c < diff.length)
  {
    const choice = consumeChoice();
    console.log(`\n${n1s[i] && tuple2shortString(n1s[i])} %c${['MATCH', 'MODIFY', 'LEFT', 'RIGHT'][choice[0]] + (choice[1] === 1 ? '' : `(${choice[1]})`)}%c ${n2s[j] && tuple2shortString(n2s[j])}`, 'color:blue', 'color:default');
    console.log(`\tstack ${stack2string(sc)}`);

    if (choice[0] === MATCH) // with a match TYPE n1s[i] === n2s[j] always
    {
      if (sc.length > 0)
      {
        const exp = sc.at(-1)[EXP];
        const pos = sc.at(-1)[WPOS];
        const orig = sc.at(-1)[ORIG];
        
        if (orig === 'M')
        {
          sc.at(-1)[WPOS]++;
          sc.at(-1)[RPOS]++;
        }
        else if (orig === 'R')
        {
          console.log(`\t\toverwrite ${tuple2shortString(exp)} ${pos} ${n1s[i][TAG]}`); 
          exp[pos+2] = n1s[i][TAG]; // overwrite
          const matchPos = findMatchPos();
          if (matchPos !== false)
          {
            genericEdit(['removeSimple', sc.at(matchPos)[EXP][TAG], sc.at(matchPos)[WPOS]]); // remove attr
          }
          sc.at(-1)[WPOS]++;
        }
        else if (orig === 'L')
        {
          const matchPos = findMatchPos();
          if (matchPos !== false)
          {
            genericEdit(['insertSimple', sc.at(matchPos)[EXP][TAG], sc.at(matchPos)[WPOS], n1s[i][TAG]]); // insert attr
            sc.at(matchPos)[WPOS]++;
          }
          sc.at(-1)[RPOS]++;
        }
      }
      
      if (n1s[i][TYPE] < 3) // if not compound exp
      {
        // nothing
      }
      else if (choice[1] > 1) // subexpression match: no push, treat it as atomic match
      {
        // nothing
      }
      else
      {
        sc.push([n1s[i], 0, n1s[i].length - 2, 0, n2s[j].length - 2, 'M']); 
      }
      i += choice[1];
      j += choice[1];
    }
    else if (choice[0] === LEFT)
    {
      remove(n1s[i]);
      if (sc.length > 0)
      {
        const exp = sc.at(-1)[EXP];
        const pos = sc.at(-1)[WPOS];
        const orig = sc.at(-1)[ORIG];
        
        if (orig === 'M')
        {
          genericEdit(['removeSimple', exp[TAG], pos]);
          sc.at(-1)[RPOS]++;
        }
        else if (orig === 'L')
        {
          // old stuff in old stuff
          sc.at(-1)[RPOS]++;
        }
        else if (orig === 'R')
        {
          throw new Error("TODO");
        }
      }
      else
      {
        // nothing
      }

      if (n1s[i][TYPE] < 3)
      {
        // nothing
      }
      else
      {
        sc.push([n1s[i], 0, n1s[i].length - 2, -99, -99, 'L']); 
      }
      i++;
    }
    else if (choice[0] === RIGHT)
    {
      // add happens on pop for compound exps (due to possible overwrites) 
      if (sc.length > 0)
      {
        const exp = sc.at(-1)[EXP];
        const pos = sc.at(-1)[WPOS];
        const orig = sc.at(-1)[ORIG];
        
        if (orig === 'M')
        {
          genericEdit(['insertSimple', exp[TAG], pos, n2s[j][TAG]]);
          sc.at(-1)[WPOS]++;
        }
        else if (orig === 'L')
        {
          const matchPos = findMatchPos();
          if (matchPos !== false)
          {
            genericEdit(['insertSimple', sc.at(matchPos)[EXP][TAG], sc.at(matchPos)[WPOS], n2s[j][TAG]]); // insert attr
            sc.at(matchPos)[WPOS]++;
          }
        }
        else if (orig === 'R')
        {
          // new stuff in new stuff
          sc.at(-1)[WPOS]++;
        }
      }

      if (n2s[j][TYPE] < 3)
      {
        add(n2s[j]);
      }
      else
      {
        sc.push([n2s[j].slice(0), -99, -99, 0, n2s[j].length - 2, 'R']);
      }
      j++;      
    }
    else
    {
      throw new Error(choice[0]);
    }

    console.log(`\t=> stack ${stack2string(sc)}`);

    while (sc.length > 0)
    {
      const rpos = sc.at(-1)[RPOS];
      const rlen = sc.at(-1)[RLEN];
      const wpos = sc.at(-1)[WPOS];
      const wlen = sc.at(-1)[WLEN];
      const orig = sc.at(-1)[ORIG];
      
      if (rpos === rlen && wpos === wlen)
      {    
        const topr = sc.pop();
        console.log(`\t\t\tpopping ${frame2string(topr)}`);
        if (orig === 'R')
        {
          add(topr[EXP]);
        }
      }
      else
      {
        break;
      }
    }
  }
  // console.log(`\nedits:\n${edits.join('\n')}`); // DEBUG
  return edits;
}

function coarsifyEdits(edits, n1s) // step 3: turn modify etc. into add/remove 
{
  const n1map = nodeMap(n1s);

  const modifs = [];
  const edits2 = [];
  for (const edit of edits)
  {
    if (edit[0] === 'modifyVal' || edit[0] === 'modifyTag')
    {
      const [_, tag, pos, newTag] = edit;
      if (modifs[tag] === undefined)
      {
        modifs[tag] = n1map[tag].slice(0);
      }
      modifs[tag][pos + 2] = newTag;
    }
    else if (edit[0] === 'insertSimple')
    {
      const [_, tag, pos, newTag] = edit;
      if (modifs[tag] === undefined)
      {
        modifs[tag] = n1map[tag].slice(0);
      }
      modifs[tag].splice(pos + 2, 0, newTag);
    }
    else if (edit[0] === 'removeSimple' || edit[0] === 'removeNonSimple')
    {
      const [_, tag, pos] = edit;
      if (modifs[tag] === undefined)
      {
        modifs[tag] = n1map[tag].slice(0);
      }
      modifs[tag].splice([pos + 2], 1);
    }
    else
    {
      edits2.push(edit);
    }
  }
  for (const modif of modifs)
  {
    if (modif)
    {
      edits2.push(['replace', n1map[modif[1]], modif]); 
    }
  }

  // console.log(`\nedits2:\n${edits2.join('\n')}`);  // DEBUG
  return edits2;
}

function nodeStream(src, parser)
{
  const p = parser.parse(src).car;
  const ns = ast2tuples(p);
  return ns;
}

function diff(n1s, n2s, options)
{
  const n1map = nodeMap(n1s);
  const n2map = nodeMap(n2s);

  // const hash2node1 = hash2node(n1s, n1map);
  // const hash2node2 = hash2node(n2s, n2map);

  const returnAllSolutions = options?.returnAllSolutions;
  const keepSuboptimalSolutions = options?.keepSuboptimalSolutions;

  const solutions = step1(n1s, n1map, n2s, n2map, returnAllSolutions, keepSuboptimalSolutions);
  return solutions;
}

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

function tuple2shortString(t)
{
  let str;
  switch (t[0])
  {
    case $lit: str = '$lit'; break;
    case $id: str = '$id'; break;
    case $param: str = '$param'; break;
    case $let: str = '$let'; break;
    case $letrec: str = '$letrec'; break;
    case $if: str = '$if'; break;
    case $set: str = '$set'; break;
    case $lam: str = '$lam'; break;
    case $app: str = '$app'; break;
    default: throw new Error(`cannot handle ${t[0]}`);
  }
  return `(${str}-${t[1]} ${t.slice(2).join(' ')})`;
}

function tuple2string(tuple, tuples)
{

  const m = nodeMap(tuples);

  function lookupTag(tag)
  {
    if (m[tag])
    {
      return m[tag];
    }
    throw new Error(`cannot find tag ${tag} in ${tuples.map(tuple2shortString)}`);
  }

  function stringify(t)
  {
      switch (t[0])
      {
        case $lit:
        case $id:
        case $param:
          {
            return t[2];
          }
        case $let:
          {
            return `(let ((${stringify(m[t[2]])} ${stringify(m[t[3]])})) ${stringify(m[t[4]])})`;
          }
        case $letrec:
          {
            return `(letrec ((${stringify(m[t[2]])} ${stringify(m[t[3]])})) ${stringify(m[t[4]])})`;
          }
        case $if:
          {
            return `(if ${stringify(lookupTag(t[2]))} ${stringify(lookupTag(t[3]))} ${stringify(lookupTag(t[4]))})`;
          }
        case $set:
          {
            return `(set! ${stringify(m[t[2]])} ${stringify(m[t[3]])})`;
          }
        case $lam:
        {
          return `(lambda (${t.slice(2, -1).map(x => stringify(m[x])).join(' ')}) ${stringify(m[t.at(-1)])})`;
        }
        case $app:
          {
            return `(${stringify(lookupTag(t[2]))} ${t.slice(3).map(x => stringify(lookupTag(x))).join(' ')})`;
          }
        default: throw new Error(`cannot handle ${t}`);
      }
    }

  return stringify(tuple, m);
}

function tuples2string(tuples)
{
  return tuple2string(tuples[0], tuples);
}

// *** hashing
// const R = 31;
// const M = 127;
// function hash2node(ns, nmap)
// {
//   const table = [[], [] ,[], [], [], [], [], [], []]; // bucket per ast type 

//   function hashName(s)
//   {
//     let h = 0;
//     for (let i = 0; i < s.length; i++)
//     {
//       h = (R * h + s.charCodeAt(i)) % M;
//     }
//     return h;
//   }

//   function doHash(n)
//   {
//     if (n[0] === '$id' || n[0] === '$param')
//     {
//       return hashName(n[2]);
//     }
//     else if (n[0] === '$lit')
//     {
//       if (typeof n[2] === 'string')
//       {
//         return hashName(n[2]);
//       }
//       else if (typeof n[2] === 'number')
//       {
//         return n[2] % M;
//       }
//       else if (n[2] === true)
//       {
//         return 1;
//       }
//       else if (n[2] === false)
//       {
//         return 0;
//       }
//       else
//       {
//         throw new Error();
//       }
//     }
//     else
//     {
//       let h = 0;
//       for (let i = 2; i < n.length; i++)
//       {
//         h = (R * h + hash(nmap[n[i]])) % M;
//       }
//       return h;
//     }
//   }

//   function hash(n)
//   {
//     const h = doHash(n);

//     let b = table[n[0]][h];
//     if (b === undefined)
//     {
//       b = [];
//       table[n[0]][h] = b;
//     }
//     b.push(n);
//     return h;
//   }

//   hash(ns[0]);
//   return table;
// }

// function node2hash(ns, nmap)
// {
//   const table = [];

//   function hashName(s)
//   {
//     let h = 0;
//     for (let i = 0; i < s.length; i++)
//     {
//       h = (R * h + s.charCodeAt(i)) % M;
//     }
//     return h;
//   }

//   function doHash(n)
//   {
//     if (n[0] === $id || n[0] === $param)
//     {
//       return hashName(n[2]);
//     }
//     else if (n[0] === $lit)
//     {
//       if (typeof n[2] === 'string')
//       {
//         return hashName(n[2]);
//       }
//       else if (typeof n[2] === 'number')
//       {
//         return n[2] % M;
//       }
//       else if (n[2] === true)
//       {
//         return 127;
//       }
//       else if (n[2] === false)
//       {
//         return 113;
//       }
//       else if (n[2] instanceof Null)
//       {
//         return 109;
//       }
//       else
//       {
//         throw new Error();
//       }
//     }
//     else
//     {
//       let h = 0;
//       for (let i = 2; i < n.length; i++)
//       {
//         h = (R * h + hash(nmap[n[i]])) % M;
//       }
//       return h;
//     }
//   }

//   function hash(n)
//   {
//     const h = doHash(n);
//     table[n[1]] = h;
//     return h;
//   }

//   hash(ns[0]);
//   return table;
// }


// ***
// push/unsh according to cost
  // function push(choice)
  // {
  //   const cost = choice[3];
  //   if (todo.length > 0 && cost >= todo.at(-1)[3])
  //   {
  //     todo.unshift(choice);
  //   }
  //   else
  //   {
  //     todo.push(choice);
  //   }
  // }

  // push/unsh according to lr advancement
  // function push(choice)
  // {
  //   if (todo.length > 0 && ((choice[1] + choice[2]) < (todo.at(-1)[1] + todo.at(-1)[2])))
  //   {
  //     todo.unshift(choice);
  //   }
  //   else
  //   {
  //     todo.push(choice);
  //   }
  // }

  // push/unsh according to l advancement
  // function push(choice)
  // {
  //   if (todo.length > 0 && choice[1] < todo.at(-1)[1])
  //   {
  //     todo.unshift(choice);
  //   }
  //   else
  //   {
  //     todo.push(choice);
  //   }
  // }

  // *** memoizing subtreeMatch

    // let matches;
    // const m = stmatches[left[1]];
    // if (m === undefined)
    // {
    //   matches = subtreeMatches(left, n1map, right, n2map);
    //   stmatches[left[1]] = [[right[1], matches]];
    //   // console.log(`1) ${left[1]} ${right[1]} ${matches}`);
    // }
    // else
    // {
    //   for (const [r, mm] of m)
    //   {
    //     if (right[1] === r)
    //     {
    //       matches = mm;
    //       break;
    //     }
    //   }
    //   if (matches === undefined)
    //   {
    //     matches = subtreeMatches(left, n1map, right, n2map);
    //     stmatches[left[1]].push([right[1], matches]);
    //     // console.log(`2) ${left[1]} ${right[1]} ${matches}`);
    //   }
    // }


    // *** accumulating push
    // function pushRightProgress(choices, i, j, cost)
    // {
    //   // const prevChoice = choices.at(-1);
    //   // if (prevChoice !== undefined && prevChoice[0] === RIGHT)
    //   // {
    //   //   const newChoices = choices.slice(0, -1);
    //   //   newChoices.push([RIGHT, prevChoice[1] + 1]);
    //   //   pushProgress([newChoices, i, j + 1, cost + 99]);
    //   // }
    //   // else
    //   {
    //     pushProgress([choices.concat([[RIGHT, 1]]), i, j+1, cost + 100]);
    //   }
    // }
  