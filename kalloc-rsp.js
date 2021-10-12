export const kalloc_conc = `
(rule [kalloc (lambda (e κ) [call e κ])])
`

export const kalloc_0cfa = `
(rule [kalloc (lambda (e κ) 0)]) ; 0-CFA
`

export const kalloc_1cfa = `
(rule [kalloc (lambda (e κ) e)]) ; k=1-CFA
`

