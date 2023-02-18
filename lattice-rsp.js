export const lattice_conc = `

(rule [abst (lambda (c) c)])

(rule [is_true (lambda (x) x)])
(rule [is_false not])

(rule [prim_binding "+" + 2])
(rule [prim_binding "-" - 2])
(rule [prim_binding "*" * 2])
(rule [prim_binding "=" = 2])
(rule [prim_binding "<" < 2])
(rule [prim_binding "not" not 1])
(rule [prim_binding "even?" even? 1])

`


export const lattice_prim = `

(rule [abst (lambda (c) "prim")])

(rule [is_true (lambda (d) #t)])
(rule [is_false (lambda (d) #t)])

(rule [prim_binding "+" (lambda (x y) "prim") 2])
(rule [prim_binding "-" (lambda (x y) "prim") 2])
(rule [prim_binding "*" (lambda (x y) "prim") 2])
(rule [prim_binding "=" (lambda (x y) "prim") 2])
(rule [prim_binding "<" (lambda (x y) "prim") 2])
(rule [prim_binding "not" (lambda (x) "prim") 1])
(rule [prim_binding "even?" (lambda (x) "prim") 1])

`

