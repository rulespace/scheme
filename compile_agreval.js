import { specification } from './agreval-rsp.js';
import { compileToModuleSrc } from 'rulespace';
import fs from 'fs';

const evaluatorModuleSrc = compileToModuleSrc(specification, {debug:false, profile:false});
fs.writeFileSync('./compiled/agreval_module.mjs', evaluatorModuleSrc);
