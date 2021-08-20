export const specification = `

; ast
(rule [ast e] [$lit e _])
(rule [ast e] [$id e _])
(rule [ast e] [$lam e _])
(rule [ast e] [$let e _ _ _])
(rule [ast e] [$letrec e _ _ _])
(rule [ast e] [$if e _ _ _])
(rule [ast e] [$app e _])
; cons car cdr
(rule [ast e] [$cons e _ _])
(rule [ast e] [$car e _])
(rule [ast e] [$cdr e _])
; set!
(rule [ast e] [$set e _ _])
; set-cxr!
(rule [ast e] [$setcar e _ _])
(rule [ast e] [$setcdr e _ _])


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
; cons car cdr
(rule [parent e p] [$cons p e _])
(rule [parent e p] [$cons p _ e])
(rule [parent e p] [$car p e])
(rule [parent e p] [$cdr p e])
; set!
(rule [parent e p] [$set p e _])
(rule [parent e p] [$set p _ e])
; set-cxr!
(rule [parent e p] [$setcar p e _])
(rule [parent e p] [$setcar p _ e])
(rule [parent e p] [$setcdr p e _])
(rule [parent e p] [$setcdr p _ e])

(rule [has_parent e] [parent e _])
(rule [ast_root e] [ast e] (not [has_parent e]))

; state machine
(rule [initial_state [state e 0]] [ast_root e])
(rule [reachable s] [initial_state s])
(rule [reachable s’] [reachable s] [step s s’])

; (rule [steps s] [step s _])
; (rule [final s] [reachable s] (not [steps s]))

; transition relation
(rule [step [state e κ] s’] [$lit e _] [cont [state e κ] s’])
(rule [step [state e κ] s’] [$id e _] [cont [state e κ] s’])
(rule [step [state e κ] s’] [$lam e _] [cont [state e κ] s’])
(rule [step [state e κ] [state e_init κ]] [$let e _ e_init _] [reachable [state e κ]])
(rule [step [state e κ] [state e_init κ]] [$letrec e _ e_init _] [reachable [state e κ]])
(rule [step [state e κ] [state e_body [call e κ]]] [$app e e_rator] [greval e_rator [state e κ] [obj e_lam _]] [$lam e_lam e_body])
(rule [step [state e κ] s’] [$app e e_rator] [greval e_rator [state e κ] [prim _ _]] [cont [state e κ] s’])
(rule [step [state e κ] [state e_then κ]] [$if e e_cond e_then _] [greval e_cond [state e κ] d] (!= d #f))
(rule [step [state e κ] [state e_else κ]] [$if e e_cond _ e_else] [greval e_cond [state e κ] #f])
; cons car cdr
(rule [step [state e κ] s’] [$cons e _ _] [cont [state e κ] s’])
(rule [step [state e κ] s’] [$car e _ ] [cont [state e κ] s’])
(rule [step [state e κ] s’] [$cdr e _ ] [cont [state e κ] s’])
; set!
(rule [step [state e κ] s’] [$set e _ _] [cont [state e κ] s’])
; set-cxr!
(rule [step [state e κ] s’] [$setcar e _ _] [cont [state e κ] s’])
(rule [step [state e κ] s’] [$setcdr e _ _] [cont [state e κ] s’])

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

(rule [lookup_var_root x [state e_body κ] [root e_init [state e_init κ]]] [$let e e_id e_init e_body] [$id e_id x] [reachable [state e κ]])
(rule [lookup_var_root x [state e_init κ] r] [lookup_var_root x [state p κ] r] [$let p _ e_init _])
(rule [lookup_var_root x [state e_body κ] r] [lookup_var_root x [state p κ] r] [$let p e_id _ e_body] (not [$id e_id x]))
(rule [lookup_var_root x [state e_init κ] [root e_init [state e_init κ]]] [$letrec e e_id e_init _] [$id e_id x] [reachable [state e κ]])
(rule [lookup_var_root x [state e_body κ] [root e_init [state e_init κ]]] [$letrec e e_id e_init e_body] [$id e_id x] [reachable [state e κ]])
(rule [lookup_var_root x [state e_init κ] r] [lookup_var_root x [state p κ] r] [$letrec p e_id e_init _] (not [$id e_id x]))
(rule [lookup_var_root x [state e_body κ] r] [lookup_var_root x [state p κ] r] [$letrec p e_id _ e_body] (not [$id e_id x]))
(rule [lookup_var_root x [state e_body κ’] [root e_rand [state e κ]]] [$app e e_rator] [$lam e_lam e_body] [param e_id e_lam i] [$id e_id x] [rand e_rand e i] [step [state e κ] [state e_body κ’]])
(rule [lookup_var_root x [state e_body κ’] r] [$app e e_rator] [greval e_rator [state e κ] [obj e_lam [state e_obj κ_obj]]] [lookup_var_root x [state e_obj κ_obj] r] (not [binds e_lam x]) [step [state e κ] [state e_body κ’]])
(rule [lookup_var_root x [state e κ] r] [lookup_var_root x [state p κ] r] (not [binding p]) [parent e p])

; eval var root (only for set!)
(rule [var_root e] [$let _ _ e _])
(rule [var_root e] [$letrec _ _ e _])
(rule [var_root e] [rand e _ _])

(rule [sets e] [$set e _ _])

(rule [eval_var_root [root e_r s_r] s_r d]
  [greval e_r s_r d] [var_root e_r])
(rule [eval_var_root r [state e κ] d]
  [$set e e_id e_upd] [greval e_upd [state e κ] d] [$id e_id x] [lookup_var_root x [state e κ] r])
(rule [eval_var_root r [state e κ] d]
  [eval_var_root r s’ d] [step s’ [state e κ]] [$set e e_id _] [$id e_id x] [lookup_var_root x [state e κ] r’] (!= r r’))
(rule [eval_var_root r [state e κ] d]
  [eval_var_root r s’ d] [step s’ [state e κ]] (not [sets e]))
        
        

; path roots
(rule [lookup_path_root e_id "car" s [root e_car s_r]]
          [$id e_id _] [greval e_id s [obj e_cons s_r]] [$cons e_cons e_car _])
(rule [lookup_path_root e_id "cdr" s [root e_cdr s_r]]
          [$id e_id _] [greval e_id s [obj e_cons s_r]] [$cons e_cons _ e_cdr])

; eval path root (only for set-cxr!)
(rule [setcxr e] [$setcar e _ _])
(rule [setcxr e] [$setcdr e _ _])

(rule [path_root e] [$cons _ e _])
(rule [path_root e] [$cons _ _ e])

(rule [eval_path_root [root e_r s_r] s_r d]
  [greval e_r s_r d] [path_root e_r]) 
(rule [eval_path_root r [state e κ] d]
  [$setcar e e_id e_upd] [greval e_upd [state e κ] d] [lookup_path_root e_id "car" [state e κ] r])
(rule [eval_path_root r [state e κ] d]
  [$setcdr e e_id e_upd] [greval e_upd [state e κ] d] [lookup_path_root e_id "cdr" [state e κ] r])  
(rule [eval_path_root r [state e κ] d]
  [eval_path_root r s’ d] [step s’ [state e κ]] [$setcar e e_id _] [lookup_path_root e_id "car" [state e κ] r’] (!= r r’))
(rule [eval_path_root r [state e κ] d]
  [eval_path_root r s’ d] [step s’ [state e κ]] [$setcdr e e_id _] [lookup_path_root e_id "cdr" [state e κ] r’] (!= r r’))
(rule [eval_path_root r [state e κ] d]
  [eval_path_root r s’ d] [step s’ [state e κ]] (not [setcxr e]))

        
; graph evaluator
(rule [prim_binding "+" + 2])
(rule [prim_binding "-" - 2])
(rule [prim_binding "*" * 2])
(rule [prim_binding "=" = 2])
(rule [prim_binding "<" < 2])
(rule [prim_binding "even?" even? 1])

(rule [atomic e e] [$lit e _])
(rule [atomic e e] [$id e _])
(rule [atomic e e] [$lam e _])
(rule [atomic e_rator e] [$app e e_rator])
(rule [atomic e_rand e] [rand e_rand e _])
(rule [atomic e_cond e] [$if e e_cond _ _])
; cons car cdr
(rule [atomic e_car e] [$cons e e_car _])
(rule [atomic e_cdr e] [$cons e _ e_cdr])
(rule [atomic e_id e] [$car e e_id])
(rule [atomic e_id e] [$cdr e e_id])
; set!
(rule [atomic e_upd e] [$set e _ e_upd])
; set-cxr!
(rule [atomic e_id e] [$setcar e e_id _])
(rule [atomic e_upd e] [$setcar e _ e_upd])
(rule [atomic e_id e] [$setcdr e e_id _])
(rule [atomic e_upd e] [$setcdr e _ e_upd])

(rule [greval e’ [state e κ] d] [$lit e’ d] [atomic e’ e] [reachable [state e κ]])
; without set!
; (rule [greval e’ [state e κ] d] [$id e’ x] [atomic e’ e] [lookup_var_root x [state e κ] [root e_r s_r]] [greval e_r s_r d])
; with set!
(rule [greval e’ [state e κ] d] [$id e’ x] [atomic e’ e] [lookup_var_root x [state e κ] [root e_r s_r]] [eval_var_root [root e_r s_r] [state e κ] d])
(rule [greval e’ [state e κ] [prim proc arity]] [$id e’ x] [atomic e’ e] [reachable [state e κ]] [prim_binding x proc arity])
(rule [greval e’ [state e κ] [obj e’ [state e κ]]] [$lam e’ _] [atomic e’ e] [reachable [state e κ]])
(rule [greval e [state e κ] d] [$let e _ _ e_body] [greval e_body [state e_body κ] d])
(rule [greval e [state e κ] d] [$letrec e _ _ e_body] [greval e_body [state e_body κ] d])
(rule [greval e [state e κ] d] [$app e _] [step [state e κ] [state e_body κ’]] [$lam _ e_body] [greval e_body [state e_body κ’] d])
(rule [greval e [state e κ] d] [$app e e_rator] [greval e_rator [state e κ] [prim proc 1]] [rand e1 e 0] [greval e1 [state e κ] d1] (:= d (proc d1)))
(rule [greval e [state e κ] d] [$app e e_rator] [greval e_rator [state e κ] [prim proc 2]] [rand e1 e 0] [greval e1 [state e κ] d1] [rand e2 e 1] [greval e2 [state e κ] d2] (:= d (proc d1 d2)))
(rule [greval e [state e κ] d] [$if e _ _ _] [step [state e κ] [state e_branch κ]] [greval e_branch [state e_branch κ] d])
; cons car cdr
(rule [greval e_cons s [obj e_cons s]] [$cons e_cons _ _] [reachable s])
; without set-cxr!
;(rule [greval e_car [state e_car κ] d]
;        [$car e_car e_id] 
;        [lookup_path_root e_id "car" [state e_car κ] [root e_r s_r]] [greval e_r s_r d])
;(rule [greval e_cdr [state e_cdr κ] d]
;        [$cdr e_cdr e_id] 
;        [lookup_path_root e_id "cdr" [state e_cdr κ] [root e_r s_r]] [greval e_r s_r d])
; with set-cxr!
(rule [greval e_car [state e_car κ] d]
        [$car e_car e_id] [lookup_path_root e_id "car" [state e_car κ] r] [eval_path_root r [state e_car κ] d])
(rule [greval e_cdr [state e_cdr κ] d]
        [$cdr e_cdr e_id] [lookup_path_root e_id "cdr" [state e_cdr κ] r] [eval_path_root r [state e_cdr κ] d])
; set!
(rule [greval e [state e κ] "unspecified"] [$set e _ _] [reachable [state e κ]]) ; TODO symbol support: 'unspecified iso. "unspecified"

; evaluator
;(rule [evaluate e d] [final [state e κ]] [greval e [state e κ] d])
(rule [evaluate e d] [initial_state [state e 0]] [greval e [state e 0] d])
`