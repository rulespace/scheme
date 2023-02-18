export const specification = `

; params: lattice and kalloc (NOT IN THIS SPEC)
; lattice:
; (rule [abst <concrete value -> abstract value>])
; (rule [prim_binding <name> <fun args -> value> <arity>])
; e.g. (rule [prim_binding "+" (lambda (x y) "prim") 2])
; ...
; kalloc: (rule [kalloc <fun e-app κ-app -> address>])
; e.g. (rule [kalloc (lambda (e κ) e)])

; atoms
(rule [atom e] [$lit e _])
(rule [atom e] [$id e _])
(rule [atom e] [$lam e _])

; ast
(rule [ast e] [atom e])
(rule [ast e] [$let e _ _ _])
(rule [ast e] [$letrec e _ _ _])
(rule [ast e] [$if e _ _ _])
(rule [ast e] [$app e _])


(rule [parent e p] [$let p e _ _])
(rule [parent e p] [$let p _ e _])
(rule [parent e p] [$let p _ _ e])
(rule [parent e p] [$letrec p e _ _])
(rule [parent e p] [$letrec p _ e _])
(rule [parent e p] [$letrec p _ _ e])
(rule [parent e p] [$lam p e])
(rule [parent e p] [param e p _])
(rule [parent e p] [$app p e])
(rule [parent e p] [rand e p _])
(rule [parent e p] [$if p e _ _])
(rule [parent e p] [$if p _ e _])
(rule [parent e p] [$if p _ _ e])

(rule [has_parent e] [parent e _])
(rule [ast_root e] [ast e] (not [has_parent e]))

; state machine
(rule [initial_state [state e 0]] [ast_root e])
(rule [reachable s] [initial_state s])
(rule [reachable s’] [reachable s] [step s s’])

; transition relation
(rule [step [state e κ] s’] [atom e] [cont [state e κ] s’])
(rule [step [state e κ] [state e_init κ]] [$let e _ e_init _] [reachable [state e κ]])
(rule [step [state e κ] [state e_init κ]] [$letrec e _ e_init _] [reachable [state e κ]])
(rule [step [state e κ] [state e_body κ’]] [$app e e_rator] [greval e_rator [state e κ] [obj e_lam _]] [$lam e_lam e_body] [kalloc f] (:= κ’ (f e κ)))
(rule [step [state e κ] s’] [$app e e_rator] [greval e_rator [state e κ] [prim _ _]] [cont [state e κ] s’])
(rule [step [state e κ] [state e_then κ]] [$if e e_cond e_then _] [greval e_cond [state e κ] d] [is_true f] (f d))
(rule [step [state e κ] [state e_else κ]] [$if e e_cond _ e_else] [greval e_cond [state e κ] d] [is_false f] (f d))

(rule [cont [state e_init κ] [state e_body κ]] [$let p _ e_init e_body] [reachable [state e_init κ]])
(rule [cont [state e_init κ] [state e_body κ]] [$letrec p _ e_init e_body] [reachable [state e_init κ]])
(rule [cont [state e_body κ] s’] [$let p _ _ e_body] [cont [state p κ] s’])
(rule [cont [state e_body κ] s’] [$letrec p _ _ e_body] [cont [state p κ] s’])
(rule [cont [state e_then κ] s’] [$if p _ e_then _] [cont [state p κ] s’])
(rule [cont [state e_else κ] s’] [$if p _ _ e_else] [cont [state p κ] s’])
(rule [cont [state e_body κ] s’] [$lam _ e_body] [step [state e_app κ_app] [state e_body κ]] [cont [state e_app κ_app] s’])


; var-root lookup
(rule [binds e x] [param e_id e _] [$id e_id x])

(rule [binding e] [$let e _ _ _])
(rule [binding e] [$letrec e _ _ _])
(rule [binding e] [$app e _])

(rule [var_root x [state e_body κ] [root e_init [state e_init κ]]] [$let e e_id e_init e_body] [$id e_id x] [reachable [state e κ]])
(rule [var_root x [state e_init κ] r] [var_root x [state p κ] r] [$let p _ e_init _])
(rule [var_root x [state e_body κ] r] [var_root x [state p κ] r] [$let p e_id _ e_body] (not [$id e_id x]))
(rule [var_root x [state e_init κ] [root e_init [state e_init κ]]] [$letrec e e_id e_init _] [$id e_id x] [reachable [state e κ]])
(rule [var_root x [state e_body κ] [root e_init [state e_init κ]]] [$letrec e e_id e_init e_body] [$id e_id x] [reachable [state e κ]])
(rule [var_root x [state e_init κ] r] [var_root x [state p κ] r] [$letrec p e_id e_init _] (not [$id e_id x]))
(rule [var_root x [state e_body κ] r] [var_root x [state p κ] r] [$letrec p e_id _ e_body] (not [$id e_id x]))
(rule [var_root x [state e_body κ’] [root e_rand [state e κ]]] [$app e e_rator] [$lam e_lam e_body] [param e_id e_lam i] [$id e_id x] [rand e_rand e i] [step [state e κ] [state e_body κ’]])
(rule [var_root x [state e_body κ’] r] [$app e e_rator] [greval e_rator [state e κ] [obj e_lam [state e_obj κ_obj]]] [var_root x [state e_obj κ_obj] r] (not [binds e_lam x]) [step [state e κ] [state e_body κ’]])
(rule [var_root x [state e κ] r] [var_root x [state p κ] r] (not [binding p]) [parent e p])


; graph evaluator
;; ae in e position
(rule [atomic e e] [ast_root e] [atom e])
(rule [atomic e_then e_then] [$if _ _ e_then _] [atom e_then]) 
(rule [atomic e_else e_else] [$if _ _ _ e_else] [atom e_else]) 
(rule [atomic e_init e_init] [$let _ _ e_init _] [atom e_init]) 
(rule [atomic e_body e_body] [$let _ _ _ e_body] [atom e_body]) 
(rule [atomic e_init e_init] [$letrec _ _ e_init _] [atom e_init]) 
(rule [atomic e_body e_body] [$letrec _ _ _ e_body] [atom e_body]) 
(rule [atomic e_body e_body] [$lam _ e_body] [atom e_body]) 
;; ae in ae position
(rule [atomic e_rator e] [$app e e_rator])
(rule [atomic e_rand e] [rand e_rand e _])
(rule [atomic e_cond e] [$if e e_cond _ _])

(rule [greval e’ [state e κ] d] [$lit e’ c] [atomic e’ e] [reachable [state e κ]] [abst f] (:= d (f c)))
(rule [greval e’ [state e κ] d] [$id e’ x] [atomic e’ e] [var_root x [state e κ] [root e_r s_r]] [greval e_r s_r d])
(rule [greval e’ [state e κ] [prim proc arity]] [$id e’ x] [atomic e’ e] [reachable [state e κ]] [prim_binding x proc arity])
(rule [greval e’ [state e κ] [obj e’ [state e κ]]] [$lam e’ _] [atomic e’ e] [reachable [state e κ]])

(rule [greval e [state e κ] d] [$let e _ _ e_body] [greval e_body [state e_body κ] d])
(rule [greval e [state e κ] d] [$letrec e _ _ e_body] [greval e_body [state e_body κ] d])
(rule [greval e [state e κ] d] [$app e _] [step [state e κ] [state e_body κ’]] [$lam _ e_body] [greval e_body [state e_body κ’] d])
(rule [greval e [state e κ] d] [$app e e_rator] [greval e_rator [state e κ] [prim proc 1]] [rand e1 e 0] [greval e1 [state e κ] d1] (:= d (proc d1)))
(rule [greval e [state e κ] d] [$app e e_rator] [greval e_rator [state e κ] [prim proc 2]] [rand e1 e 0] [greval e1 [state e κ] d1] [rand e2 e 1] [greval e2 [state e κ] d2] (:= d (proc d1 d2)))
(rule [greval e [state e κ] d] [$if e _ _ _] [step [state e κ] [state e_branch κ]] [greval e_branch [state e_branch κ] d])

; evaluator
(rule [evaluate e d] [initial_state [state e 0]] [greval e [state e 0] d])
`