import fs from 'fs';
import { compileToRsp, rsp2latex } from 'rulespace';
import { specification } from '../greval-rsp.js';

const rsp = compileToRsp(specification);
const latexRules = rsp2latex(rsp);

const latex = 
`
\\documentclass[9pt,a4paper]{article}
\\usepackage{amsmath,amssymb}
\\usepackage{mathpartir}

\\begin{document}
${latexRules}
\\end{document}
`

fs.writeFileSync('../compiled/greval.tex', latex);


