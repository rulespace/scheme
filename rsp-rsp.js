export const specification = `

; [Rule rid aid arity]
; [Body rid pos aid]
; [PosAtom aid pred]
; [NegAtom aid pred]
; [Arg aid pos [Val 123]] [Arg aid pos [Var "x"]]

(rule [Atom aid pred arity] [PosAtom aid pred arity])
(rule [Atom aid pred arity] [NegAtom aid pred arity])

(rule [PartialMatchR rid 1 env’]
    [Body rid 0 aid]
    [FullMatchA aid [Null] aid’ env])

(rule [PartialMatchR rid n env’]
    [PartialMatchR rid m env]
    (= m (- n 1))
    [Body rid n aid]
    [FullMatchA aid env aid’ env’])

(rule [FullMatchR rid env]
    [PartialMatchR rid n env]
    [Rule rid _ m]
    (= n (- m 1)))

(rule [Atom [Prov rid env] pred arity]
    [FullMatchR rid _]
    [Rule rid aid _]
    [Atom aid pred arity])

(rule [Arg [Prov rid env] pos val]
    [FullMatchR rid env]
    [Rule rid aid _]
    [Arg aid pos [Var name]]
    (:= val (lookup-binding name env))
    val)

    ; functions >> (or explode env into facts after FullMatch)
(function (lookup-binding name [Binding name val _])
  val)
(function (lookup-binding name [Binding name’ _ env]))
  (!= name name’)
  (lookup-binding name env))
`;
