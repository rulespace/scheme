import { assertTrue } from './deps.ts';
import { Null, Pair, SchemeParser, Sym } from './sexp-reader.js';

export { diff, diff2edits, coarsifyEdits, diffAst, ast2tuples, nodeMap, diff2string };

// TODO: quote is handled as an application

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
      case MODIFY: sb += 'O'; break;
      case LEFT: sb += 'L'; break;
      case RIGHT: sb += 'R'; break;
    }
  }
  return sb;
}

function ast2tuples(ast)
{
  if (ast instanceof String)
  {
    return [['$lit', ast.tag, ast.toString()]];
  }
  if (ast instanceof Number)
  {
    return [['$lit', ast.tag, ast.valueOf()]];
  }
  if (ast instanceof Boolean)
  {
    return [['$lit', ast.tag, ast.valueOf()]];
  }
  if (ast instanceof Null)
  {
    return [['$lit', ast.tag, new Null().valueOf()]]; // TODO: improve
  }
  if (ast instanceof Sym)
  {
    return [['$id', ast.tag, ast.toString()]];
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
          const paramTuples = [...params].map(sym => ['$param', sym.tag, sym.toString()]);
          const body = ast.cdr.cdr.car; // only one body exp allowed (here, and elsewhere)
          const bodyTuples = ast2tuples(body);
          return [['$lam', ast.tag, ...[...params].map(t => t.tag), body.tag], ...paramTuples, ...bodyTuples];
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
          return [['$let', ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
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
          return [['$letrec', ast.tag, name.tag, init.tag, body.tag], ...nameTuples, ...initTuples, ...bodyTuples];
        }
        case "if":
        {
          const cond = ast.cdr.car;
          const cons = ast.cdr.cdr.car;
          const alt = ast.cdr.cdr.cdr.car;
          const condTuples = ast2tuples(cond);
          const consTuples = ast2tuples(cons);
          const altTuples = ast2tuples(alt);
          return [['$if', ast.tag, cond.tag, cons.tag, alt.tag], ...condTuples, ...consTuples, ...altTuples];
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
          return [['$set', ast.tag, name.tag, update.tag], ...nameTuples,  ...updateTuples];         
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
          return [['$app', ast.tag, car.tag, ...[...ast.cdr].map(t => t.tag)], ...ratorTuples, ...argTuples.flat()];
        }
      }
    }
    else // not a special form
    { // TODO: cloned from default (`app`) case above
      const ratorTuples = ast2tuples(car);
      const argTuples = [...ast.cdr].map(ast2tuples);
      return [['$app', ast.tag, car.tag, ...[...ast.cdr].map(t => t.tag)], ...ratorTuples, ...argTuples.flat()];
    }
  }
  throw new Error(`cannot handle expression ${ast} of type ${ast?.constructor?.name}`);
}



function subtreeMatches(t1, n1map, t2, n2map)
{
  if (((t1[0] === '$id' || t1[0] === '$param' || t1[0] === '$lit')) && t1[0] === t2[0])
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

function diffAst(p1, p2)
{
  const n1s = ast2tuples(p1);
  const n2s = ast2tuples(p2);

  console.log(`p1 exploded tuples\n${n1s.join('\n')}`);

  return diff(n1s, n2s);
}

function step1(n1s, n1map, n2s, n2map, returnAllSolutions, keepSuboptimalSolutions)
{
  const initial = [[], 0, 0, 0];  // choices i j cost
  const leafs = [];
  const todo = [initial];

  let minCost = 9007199254740991; // of solution

  function push(choice)
  {
    const cost = choice[3];
    if (todo.length > 0 && cost >= todo.at(-1)[3])
    {
      todo.unshift(choice);
    }
    else
    {
      todo.push(choice);
    }
  }

  while (todo.length > 0)
  {

    // if (leafs.length > 0) // DEBUG
    // {
    //   leafs.sort((a, b) => a[1] - b[1]);
    //   console.log(`${leafs.length} solutions, current top ${leafs[0].join(' ')}`);  
    // }

    const [choices, i, j, cost] = todo.pop();
    
    if (cost >= minCost) // IMPORTANT
    {
      // console.log(`minCost ${minCost} killing ${cost}`);
      continue;
    }

    if (i === n1s.length && j === n2s.length)
    {
      console.log(`solution ${cost} (todo ${todo.length})`);
      // console.log(choices);
      leafs.push([choices, cost]);
      if (!keepSuboptimalSolutions)
      {
        minCost = Math.min(minCost, cost); // TODO: check: actually minCost = cost (because of earlier test)
      }
      continue;
    }

    if (i === n1s.length)
    {
      push([choices.concat([[RIGHT, 1]]), i, j+1, cost + 100]);
      continue;
    }
    
    if (j === n2s.length)
    {
      push([choices.concat([[LEFT, 1]]), i+1, j, cost + 100]);
      continue;
    }

    if (Math.round(performance.now()) % 1000 === 0) // DEBUG
    {
      // todo.sort((a, b) => a[1] - b[1]); // b-a => high to low
      // todo.splice(0, todo.length % 2);
      console.log(i, n1s.length, j, n2s.length, todo.length, cost, minCost);    
      // console.log(`cheapest i ${todo.at(-1)[1]} j ${todo.at(-1)[2]} cost ${todo.at(-1)[3]}`);
    }

    const left = n1s[i];
    const right = n2s[j];

    const matches = subtreeMatches(left, n1map, right, n2map);
    if (matches > 0)
    {
      // // pushMatch
      // const prevChoice = choices.at(-1);
      // if (prevChoice !== undefined && prevChoice[0] === MATCH)
      // {
      //   const newChoices = choices.slice(0, -1);
      //   newChoices.push([MATCH, prevChoice[1] + matches]);
      //   todo.push([newChoices, i + matches, j + matches, cost]);
      // }
      // else
      {
        push([choices.concat([[MATCH, matches]]), i+matches, j+matches, cost]);
      }
      //
    }
    else
    {
      // SHOULD THIS BE EXCLUSIVE (in the 'else' part) WITH MATCH? e.g. (f *a b) -> (f *a a b) should not be M by default (can also be R)
      { 
        // const prevChoice = choices.at(-1);

        // if (prevChoice !== undefined && prevChoice[0] === LEFT)
        // {
        //   const newChoices = choices.slice(0, -1);
        //   newChoices.push([LEFT, prevChoice[1] + 1]);
        //   todo.push([newChoices, i + 1, j, cost + 100]);
        // }
        // else

        {
          push([choices.concat([[LEFT, 1]]), i+1, j, cost + 100]);
        }

        // if (prevChoice !== undefined && prevChoice[0] === RIGHT)
        // {
        //   const newChoices = choices.slice(0, -1);
        //   newChoices.push([RIGHT, prevChoice[1] + 1]);
        //   todo.push([newChoices, i, j + 1, cost + 100]);
        // }
        // else
        {
          push([choices.concat([[RIGHT, 1]]), i, j+1, cost + 100]);
        }

        if (left[0] === '$id' && left[0] === right[0] && left[2] !== right[2])
        {
          push([choices.concat([[MODIFY]]), i+1, j+1, cost + 1]);
        }
        else if (left[0] === '$lit' && left[0] === right[0] && left[2] !== right[2])
        {
          push([choices.concat([[MODIFY]]), i+1, j+1, cost + 1]);
        }
        else if (left[0] === '$param' && left[0] === right[0] && left[2] !== right[2])
        {
          push([choices.concat([[MODIFY]]), i+1, j+1, cost + 1]);
        }
        else if (left[0] === right[0])
        {
          if (left[0] === '$let' || left[0] === '$letrec' || left[0] === '$if' || left[0] === '$lam' || left[0] === '$app')
          {
            // pushMatch
            // const prevChoice = choices.at(-1);
            // if (prevChoice !== undefined && prevChoice[0] === MATCH)
            // {
            //   const newChoices = choices.slice(0, -1);
            //   newChoices.push([MATCH, prevChoice[1] + 1]);
            //   todo.push([newChoices, i + 1, j + 1, cost]);
            // }
            // else
            {
              push([choices.concat([[MATCH, 1]]), i+1, j+1, cost]);
            }
            //
          }
        }
      }
    }
  }

  leafs.sort((a, b) => a[1] - b[1]); // TODO: dynamically track shortest instead of post-sort
  // console.log(leafs.slice(0, 100).join('\n'));

  console.log(`solutions: ${leafs.length}`);  
  const [topChoices, cost] = leafs[0];
  // console.log(`top choices (cost ${cost}):\n${topChoices.join('\n')}`);  
  return returnAllSolutions ? leafs.map(l => l[0]) : [topChoices];
}

function diff2edits(diff, n1s, n2s) // step2
{
  const EXP = 0;
  const ORIG = 1;
  const POS = 2;
  const LEN = 3;

  const LPOS = 4;
  const LLEN = 5;

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

  function modifyVal(tag, pos, val)
  {
    const edit = ['modifyVal', tag, pos, val];
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function modifyTag(tag, pos, newTag)
  {
    const edit = ['modifyTag', tag, pos, newTag];
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function add(el)
  {
    const edit = ['add', el]; 
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function remove(el)
  {
    const edit = ['remove', el];
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  function genericEdit(edit)
  {
    console.log(`\t\t${edit}`);
    edits.push(edit);
  }

  while (c < diff.length)
  {
    const choice = consumeChoice();
    console.log(`${n1s[i]} %c${['MATCH', 'MODIFY', 'LEFT', 'RIGHT'][choice[0]] + (choice[1] === 1 ? '' : `(${choice[1]})`)}%c ${n2s[j]}`, 'color:blue', 'color:default');

    if (choice[0] === MATCH) // with a match TYPE n1s[i] === n2s[j] always
    {
      if (sc.length > 0)
      {
        const exp = sc.at(-1)[EXP];
        const orig = sc.at(-1)[ORIG];
        const pos = sc.at(-1)[POS];
        const len = sc.at(-1)[LEN];
        
        const comesFromRight = (orig === 'R');
        if (comesFromRight)
        {
          console.log(`\t${exp} ${orig} ${pos}/${len}`);
          // when comeFromRight then a match means "prefer left" somewhere in a right el, so we always overwrite
          console.log(`\t\tmatch overwrite ${exp} ${pos} ${n1s[i][TAG]}`); 
          exp[pos+2] = n1s[i][TAG]; // overwrite pos in current
        }
        else // comesFromLeft: with a match, this means el is already there???
        {
          const lpos = sc.at(-1)[LPOS];
          const llen = sc.at(-1)[LLEN];
          console.log(`\t${exp} ${orig} ${pos}/${len} left ${lpos}/${llen}`);
          // when comesFromLeft then a match means potentially rewriting a tag in an existing element, so we use modify
          // check whether a match is actually necessary
          if (exp[pos+2] !== n1s[i][TAG]) // both notEq and not in range (i.e. insertTag)??
          {
            modifyTag(exp[TAG], pos, n1s[i][TAG]); // modify pos in left (left===current when comeFromLeft)
          }

          if (exp[TYPE] === '$app')
          {
            if (pos === len - 1)
            {
              const remainingArgsOnLeft = llen - lpos - 1;
              console.log(`\tadded final argument, removing ${remainingArgsOnLeft} left args`);
              for (let q = 0; q < remainingArgsOnLeft; q++)
              {
                genericEdit(['removeSimple', exp[TAG], pos + 1]);
              }
            }
          }
          sc.at(-1)[LPOS]++;
        }
        sc.at(-1)[POS]++;
      }
      
      if (n1s[i][TYPE] === '$id' || n1s[i][TYPE] === '$lit' || n1s[i][TYPE] === '$param')
      {
        // nothing
      }
      else if (choice[1] > 1) // subexpression match: no push, treat it as atomic match
      {
        // nothing
      }
      else
      {
        sc.push([n1s[i], 'L', 0, n2s[j].length-2, 0, n1s[i].length-2]); // not mutated when comesFromLeft
      }
      i += choice[1];
      j += choice[1];
    }
    else if (choice[0] === MODIFY) // with a modify TYPE n1s[i] === n2s[j] always; 'modify' acts like 'match' wrt. subexp pos
    {
      modifyVal(n1s[i][TAG], 0, n2s[j][VAL]);
      if (sc.length > 0)
      {
        const exp = sc.at(-1)[EXP];
        const orig = sc.at(-1)[ORIG];
        const pos = sc.at(-1)[POS];
        const len = sc.at(-1)[LEN];
        
        const comesFromRight = (orig === 'R');
        if (comesFromRight)
        {
          console.log(`\t${exp} ${orig} ${pos}/${len}`);
          console.log(`\t\tmodify overwrite ${exp} ${pos} ${n1s[i][TAG]}`); 
          exp[pos+2] = n1s[i][TAG]; // overwrite pos in current
        }
        else // comesFromLeft
        {
          const lpos = sc.at(-1)[LPOS];
          const llen = sc.at(-1)[LLEN];
          console.log(`\t${exp} ${orig} ${pos}/${len} left ${lpos}/${llen}`);
          // when comesFromLeft then a modify means potentially rewriting a tag in an existing element, so we use modify
          if (exp[pos+2] !== n1s[i][TAG])
          {
            modifyTag(exp[TAG], pos, n1s[i][TAG]); // modify pos in left (left===current when comeFromLeft)        
          }

          if (exp[TYPE] === '$app')
          {
            if (pos === len - 1)
            {
              const remainingArgsOnLeft = llen - lpos - 1;
              console.log(`\tadded final argument, removing ${remainingArgsOnLeft} left args`);
              for (let q = 0; q < remainingArgsOnLeft; q++)
              {
                genericEdit(['removeSimple', exp[TAG], pos + 1]);
              }
            }
          }
          sc.at(-1)[LPOS]++;
        }
        sc.at(-1)[POS]++;  
      }
      i++;
      j++;      
    }
    else if (choice[0] === LEFT) // tactic: don't push subexps (don't increase left pos, delete 'in-place)
    {
      remove(n1s[i]);
      if (sc.length > 0)
      {
        const exp = sc.at(-1)[EXP];
        const orig = sc.at(-1)[ORIG];
        const pos = sc.at(-1)[POS];
        const len = sc.at(-1)[LEN];
        
        const comesFromRight = (orig === 'R');
        if (comesFromRight)
        {
          console.log(`\t${exp} ${orig} ${pos}/${len}`);
          // nothing    
        }
        else // comesFromLeft
        {
          const lpos = sc.at(-1)[LPOS];
          const llen = sc.at(-1)[LLEN];
          console.log(`\t${exp} ${orig} ${pos}/${len} left ${lpos}/${llen}`);

          if (sc.at(-1)[EXP][TYPE] === '$lam')
          {
            if (n1s[i][TYPE] === '$param')
            {
              genericEdit(['removeSimple', exp[TAG], pos]);
            }
            else // removing body
            {
              // nothing
            }
          }
          else if (exp[TYPE] === '$app')
          {
            genericEdit(['removeSimple', exp[TAG], pos]);
          }
          else if (exp[TYPE] === '$let' || exp[TYPE] === '$if')
          {
            // nothing
          }
          else
          {
            throw new Error(exp[TYPE]);
          }
          if (exp[lpos+2] === n1s[i][TAG])
          {
            sc.at(-1)[LPOS]++;
          }
        }
      }
      else
      {
        // nothing
      }
      i++;      
    }
    else if (choice[0] === RIGHT)
    {
      if (sc.length > 0)
      {
        const exp = sc.at(-1)[EXP];
        const orig = sc.at(-1)[ORIG];
        const pos = sc.at(-1)[POS];
        const len = sc.at(-1)[LEN];
        
        const comesFromRight = (orig === 'R');
        if (comesFromRight)
        {
          console.log(`\t${exp} ${orig} ${pos}/${len}`);
          sc.at(-1)[POS]++;
        }
        else // comesFromLeft
        {
          const lpos = sc.at(-1)[LPOS];
          const llen = sc.at(-1)[LLEN];
          console.log(`\t${exp} ${orig} ${pos}/${len} left ${lpos}/${llen}`);

          if (exp[TYPE] === '$lam')
          {
            if (n2s[j][TYPE] === '$param')
            {
              genericEdit(['insertSimple', exp[TAG], pos, n2s[j][TAG]]);
              sc.at(-1)[POS]++;
            }
            else // adding new body (could also use pos and len as for $app)
            {
              console.log(`\tadding body`);
              modifyTag(exp[TAG], pos, n2s[j][TAG]);
              const numParamsToRemove = llen - lpos - 1; // num params remaining on left
              if (numParamsToRemove > 0)
              {
                console.log(`\tremoving ${numParamsToRemove} params`);
                for (let q = 0; q < numParamsToRemove; q++)
                {
                  genericEdit(['removeSimple', exp[TAG], pos + 1]);
                  sc.at(-1)[LPOS]++;  
                }
              }
              sc.at(-1)[POS]++;
            }
          }
          else if (exp[TYPE] === '$app')
          {
            if (n2s[j][TYPE] === '$id' || n2s[j][TYPE] === '$lit')
            {
              genericEdit(['insertSimple', exp[TAG], pos, n2s[j][TAG]]);
              if (pos === len - 1)
              {
                const remainingArgsOnLeft = llen - lpos;
                console.log(`\tadded final argument, removing ${remainingArgsOnLeft} left args`);
                for (let q = 0; q < remainingArgsOnLeft; q++)
                {
                  genericEdit(['removeSimple', exp[TAG], pos]);
                }
              }
              sc.at(-1)[POS]++;
            }
            else
            {
              throw new Error(`unexpected argument expression type ${n2s[j]}`);
            }
          }
          else if (exp[TYPE] === '$let' || exp[TYPE] === '$if')
          {
            modifyTag(exp[TAG], pos, n2s[j][TAG]);
            sc.at(-1)[POS]++;
          }
          else
          {
            throw new Error(exp[TYPE]);
          }
        }
      }
      else // nothing on stack
      {
        // nothing
      }

      if (n2s[j][TYPE] === '$id' || n2s[j][TYPE] === '$lit' || n2s[j][TYPE] === '$param')
      {
        add(n2s[j]);
      }
      else
      {
        sc.push([n2s[j].slice(0), 'R', 0, n2s[j].length-2]);
        // adding will happen on pop
      }
      j++;      
    }
    else
    {
      throw new Error(choice[0]);
    }

    while (sc.length > 0)
    {
      const exp = sc.at(-1)[EXP];
      const orig = sc.at(-1)[ORIG];
      const pos = sc.at(-1)[POS];
      const len = sc.at(-1)[LEN];

      const comesFromRight = (orig === 'R');
      
      if (comesFromRight)
      {
        if (pos === len)
        {    
          console.log(`\t${exp} ${orig} ${pos}/${len}`)
          console.log(`\tpopping`);
          const topc = sc.pop();
          add(topc[EXP]);
        }
        else
        {
          break;
        }
      }
      else // comesFromLeft
      {
        const lpos = sc.at(-1)[LPOS];
        const llen = sc.at(-1)[LLEN];
        if (pos === len)
        {
          console.log(`\t${exp} ${orig} ${pos}/${len} left ${lpos}/${llen}`);
          console.log(`\tlr exhausted: popping`);
          sc.pop();
        }
        else
        {
          break;
        }
      }
    }
  }

  console.log(`\nedits:\n${edits.join('\n')}`);
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

  console.log(`\nedits2:\n${edits2.join('\n')}`);
  return edits2;
}

function diff(n1s, n2s, options)
{
  const n1map = nodeMap(n1s);
  const n2map = nodeMap(n2s);

  const returnAllSolutions = options?.returnAllSolutions;
  const keepSuboptimalSolutions = options?.keepSuboptimalSolutions;

  const solutions = step1(n1s, n1map, n2s, n2map, returnAllSolutions, keepSuboptimalSolutions);
  return solutions;
}

// function modify2addremove(n1s, edits)
// {
// }

// const parser = new SchemeParser();
// // const p1 = parser.parse(`(let ((f (lambda (x y) (+ x y)))) (f 1 2))`);
// // const p2 = parser.parse(`(let ((f (lambda (x z y) (+ x y)))) (f 1 99 2))`);

// interesting case: match,2 modify newR,2 match,1 newR,1 (captures intent?) vs. match,2 newR,4 match,1 newL,1
// const p1 = parser.parse(`(let ((x 1)) x)`);
// const p2 = parser.parse(`(let ((x 2)) (+ x 1))`);

// const p1 = parser.parse(`(lambda (x) (+ 1 2))`);
// const p2 = parser.parse(`(lambda (x y) z)`);

// console.log(diff(p1.car, p2.car));