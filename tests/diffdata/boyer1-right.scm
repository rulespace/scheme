(let ((_*namelist*6 '()))
  (let ((_*lastlook*7 '(xxx ())))
    (let ((_truep8
           (lambda (_x9 _lst10)
             (let ((_t11 '(t)))
               (let ((_p97 (equal? _x9 _t11)))
                 (if _p97
                     #t
                     (member _x9 _lst10)))))))
      (let ((_nameprop12
             (lambda (_name13)
               (let ((_p98 (car _*lastlook*7)))
                 (let ((_p99 (eq? _name13 _p98)))
                   (if _p99
                       _*lastlook*7
                       (let ((_pair14 (assq _name13 _*namelist*6)))
                         (let ((_$100 (if _pair14
                                          (set! _*lastlook*7 _pair14)
                                          #f)))
                           _pair14))))))))
        (let ((_get15 (lambda (_name16 _prop17)
                        (let ((_r18 (_nameprop12 _name16)))
                          (let ((_p101 (pair? _r18)))
                            (if _p101
                                (let ((_p102 (cdr _r18)))
                                  (let ((_s19 (assq _prop17 _p102)))
                                    (let ((_p103 (pair? _s19)))
                                      (if _p103
                                          (cdr _s19)
                                          #f))))
                                #f))))))
          (let ((_put20 (lambda (_name21 _prop22 _valu23)
                          (let ((_r24 (_nameprop12 _name21)))
                            (let ((_p104 (pair? _r24)))
                              (let ((_$112 (if _p104
                                               (let ((_p105 (cdr _r24)))
                                                 (let ((_s25 (assq _prop22 _p105)))
                                                   (let ((_p106 (pair? _s25)))
                                                     (if _p106 (set-cdr! _s25 _valu23)
                                                         (let ((_item26 (cons _prop22 _valu23)))
                                                           (let ((_p107 (cdr _r24)))
                                                             (let ((_p108 (cons _item26 _p107)))
                                                               (set-cdr! _r24 _p108))))))))
                                               (let ((_item27 (cons _prop22 _valu23)))
                                                 (let ((_p109 (cons _item27 '())))
                                                   (let ((_p110 (cons _name21 _p109)))
                                                     (let ((_p111 (cons _p110 _*namelist*6)))
                                                       (set! _*namelist*6 _p111)))))))) _valu23))))))
            (let ((_reinit-prop!28 (lambda ()
                                     (let ((_lastlook29 '(xxx ())))
                                       (let ((_$113 (set! _*namelist*6 '())))
                                         (set! _*lastlook*7 _lastlook29))))))
              (let ((_run-benchmark30 (lambda (_benchmark-name31 _benchmark-thunk32)
                                        (let ((_ten33 (lambda () (let ((_$114 (_benchmark-thunk32)))
                                                                   (let ((_$115 (_benchmark-thunk32)))
                                                                     (let ((_$119 (_benchmark-thunk32)))
                                                                       (let ((_$117 (_benchmark-thunk32)))
                                                                         (let ((_$118 (_benchmark-thunk32)))
                                                                           (let ((_$121 (_benchmark-thunk32)))
                                                                             (let ((_$120 (_benchmark-thunk32)))
                                                                               (let ((_$116 (_benchmark-thunk32)))
                                                                                 (let ((_$122 (_benchmark-thunk32)))
                                                                                   (_benchmark-thunk32)))))))))))))
                                          (let ((_$123 (_ten33))) (let ((_$124 (_ten33))) (let ((_$125 (_ten33))) (_ten33))))))))
                (let ((_get-null34 (lambda (_name35 _prop36)
                                     (let ((_res37 (_get15 _name35 _prop36)))
                                       (if _res37 _res37 '())))))
                  (let ((_unify-subst38 0))
                    (let ((_temp-temp39 0))
                      (let ((_add-lemma40
                             (lambda (_term41)
                               (let ((_p126 (pair? _term41)))
                                 (let ((_res42 (if _p126
                                                   (let ((_p127 (car _term41)))
                                                     (let ((_p128 (eq? _p127 'equal)))
                                                       (if _p128
                                                           (let ((_p129 (cadr _term41)))
                                                             (let ((_p130 (pair? _p129)))
                                                               (if _p130 #t #f)))
                                                           #f)))
                                                   #f))) (if _res42
                                                             (let ((_p131 (cadr _term41)))
                                                               (let ((_p136 (cons _term41 _p135)))
                                                                 (let ((_p132 (car _p131)))
                                                                   (let ((_p134 (car _p133)))
                                                                     (let ((_p135 (_get-null34 _p134 'lemmas)))
                                                                       (let ((_p133 (cadr _term41)))
                                                                         (_put20 _p132 'lemmas _p136)))))))
                                                             (error 'add-lemma "ADD-LEMMA did not like term:  " _term41)))))))
                        (letrec ((_add-lemma-lst43 (lambda (_lst44)
                                                     (let ((_p137 (null? _lst44)))
                                                       (if _p137
                                                           #t
                                                           (let ((_p138 (car _lst44)))
                                                             (let ((_$139 (_add-lemma40 _p138)))
                                                               (let ((_p140 (cdr _lst44)))
                                                                 (_add-lemma-lst43 _p140)))))))))
                          (letrec ((_apply-subst45 (lambda (_alist46 _term47)
                                                     (letrec ((_apply-subst-lst48
                                                               (lambda (_alist49 _lst50 ADDIO)
                                                                 (let ((_p141 (null? _lst50)))
                                                                   (if _p141
                                                                       '()
                                                                       (let ((_p142 (car _lst50)))
                                                                         (let ((_p143 (_apply-subst45 _alist49 _p142)))
                                                                           (let ((_p144 (cdr _lst50)))
                                                                             (let ((_p145 (_apply-subst-lst48 _alist49 _p144)))
                                                                               (cons _p143 _p145 EXTRA EXTRA2))))))))))
                                                       (let ((_p146 (pair? _term47)))
                                                         (let ((_p147 (not _p146)))
                                                           (if _p147
                                                               (let ((_p148 (assq _term47 _alist46)))
                                                                 (let ((_$149 (set! _temp-temp39 _p148)))
                                                                   (if _temp-temp39 (cdr _temp-temp39) _term47)))
                                                               (let ((_p150 (car _term47)))
                                                                 (let ((_p151 (cdr _term47)))
                                                                   (let ((_p152 (_apply-subst-lst48 _alist46 _p151)))
                                                                     (cons _p150REMMED)))))))))))
                            (let ((_falsep51 (lambda (_x52 _lst53)
                                               (let ((_f54 '(f)))
                                                 (let ((_p153 (equal? _x52 _f54)))
                                                   (if _p153 #t (member _x52 _lst53)))))))
                              (let ((_one-way-unify155 #f))
                                (let ((_one-way-unify1-lst56 #f))
                                  (let ((_one-way-unify57
                                         (lambda (_term158 _term259)
                                           (let ((_$154 (set! _unify-subst38 '())))
                                             (_one-way-unify155 _term158 _term259)))))
                                    (let ((_rewrite-with-lemmas60 #f))
                                      (letrec ((_rewrite61 (lambda (_term62)
                                                             (letrec ((_rewrite-args63
                                                                       (lambda (_lst64)
                                                                         (let ((_p155CHANGED (null? _lst64)))
                                                                           (if _p155CHANGED
                                                                               '()
                                                                               (let ((_p156 (car _lst64)))
                                                                                 (let ((_p157 (_rewrite61 _p156)))
                                                                                   (let ((_p158 (cdr _lst64)))
                                                                                     (let ((_p159 (_rewrite-args63 _p158)))
                                                                                       (cons _p157 _p159))))))))))
                                                               (letrec ((_rewrite-with-lemmas65 (lambda (_lst67REMOVEDONEPARAM)
                                                                                                  (let ((_p160 (null? _lst67)))
                                                                                                    (if _p160
                                                                                                        _term66
                                                                                                        (let ((_p161 (car _lst67)))
                                                                                                          (let ((_p162 (cadr _p161)))
                                                                                                            (let ((ADDED brol))
                                                                                                                (let ((ADDED2 brol2))
                                                                                                                  (if _p163
                                                                                                                      (let ((_p164 (car _lst67)))
                                                                                                                        (let ((_p165 (caddr _p164)))
                                                                                                                          (let ((_p165ADD (caddr _p164)))
                                                                                                                            (let ((_p166 (_apply-subst45 _unify-subst38 _p165)))
                                                                                                                              (_rewrite61 _p166)))))
                                                                                                                      (let ((_p167 (cdr _lst67)))
                                                                                                                        (_rewrite-with-lemmas65 _term66 _p167))))))))))))
                                                                 (let ((_p168 (pair? _term62)))
                                                                   (let ((_p169 (not _p168)))
                                                                     (if _p169
                                                                         _term62
                                                                         (let ((_p170 (car _term62)))
                                                                           (let ((_p175 (_get-null34 'lemmasREM)))
                                                                             (let ((_p171CHANGED (cdr EXTRA _term62)))
                                                                               (let ((_p173 (cons _p170 _p172)))
                                                                                 (_rewrite-with-lemmas65 _p173 _p175)))))))))))))
                                        (let ((_setup68 (lambda ()
                                                          (let ((_lst69 '((equal (compile form) (reverse (codegen (optimize form) (nil)))) (equal (eqp x y) (equal (fix x) (fix y))) (equal (greaterp x y) (lessp y x)) (equal (lesseqp x y) (not (lessp y x))) (equal (greatereqp x y) (not (lessp x y))) (equal (boolean x) (or (equal x (t)) (equal x (f)))) (equal (iff x y) (and (implies x y) (implies y x))) (equal (even1 x) (if (zerop x) (t) (odd (one- x)))) (equal (countps- l pred) (countps-loop l pred (zero))) (equal (fact- i) (fact-loop i 1)) (equal (reverse- x) (reverse-loop x (nil))) (equal (divides x y) (zerop (remainder y x))) (equal (assume-true var alist) (cons (cons var (t)) alist)) (equal (assume-false var alist) (cons (cons var (f)) alist)) (equal (tautology-checker x) (tautologyp (normalize x) (nil))) (equal (falsify x) (falsify1 (normalize x) (nil))) (equal (prime x) (and (not (zerop x)) (not (equal x (add1 (zero)))) (prime1 x (one- x)))) (equal (and p q) (if p (if q (t) (f)) (f))) (equal (or p q) (if p (t) (if q (t) (f)) (f))) (equal (not p) (if p (f) (t))) (equal (implies p q) (if p (if q (t) (f)) (t))) (equal (fix x) (if (numberp x) x (zero))) (equal (if (if a b c) d e) (if a (if b d e) (if c d e))) (equal (zerop x) (or (equal x (zero)) (not (numberp x)))) (equal (plus (plus x y) z) (plus x (plus y z))) (equal (equal (plus a b) (zero)) (and (zerop a) (zerop b))) (equal (difference x x) (zero)) (equal (equal (plus a b) (plus a c)) (equal (fix b) (fix c))) (equal (equal (zero) (difference x y)) (not (lessp y x))) (equal (equal x (difference x y)) (and (numberp x) (or (equal x (zero)) (zerop y)))) (equal (meaning (plus-tree (append x y)) a) (plus (meaning (plus-tree x) a) (meaning (plus-tree y) a))) (equal (meaning (plus-tree (plus-fringe x)) a) (fix (meaning x a))) (equal (append (append x y) z) (append x (append y z))) (equal (reverse (append a b)) (append (reverse b) (reverse a))) (equal (times x (plus y z)) (plus (times x y) (times x z))) (equal (times (times x y) z) (times x (times y z))) (equal (equal (times x y) (zero)) (or (zerop x) (zerop y))) (equal (exec (append x y) pds envrn) (exec y (exec x pds envrn) envrn)) (equal (mc-flatten x y) (append (flatten x) y)) (equal (member x (append a b)) (or (member x a) (member x b))) (equal (member x (reverse y)) (member x y)) (equal (length (reverse x)) (length x)) (equal (member a (intersect b c)) (and (member a b) (member a c))) (equal (nth (zero) i) (zero)) (equal (exp i (plus j k)) (times (exp i j) (exp i k))) (equal (exp i (times j k)) (exp (exp i j) k)) (equal (reverse-loop x y) (append (reverse x) y)) (equal (reverse-loop x (nil)) (reverse x)) (equal (count-list z (sort-lp x y)) (plus (count-list z x) (count-list z y))) (equal (equal (append a b) (append a c)) (equal b c)) (equal (plus (remainder x y) (times y (quotient x y))) (fix x)) (equal (power-eval (big-plus1 l i base) base) (plus (power-eval l base) i)) (equal (power-eval (big-plus x y i base) base) (plus i (plus (power-eval x base) (power-eval y base)))) (equal (remainder y 1) (zero)) (equal (lessp (remainder x y) y) (not (zerop y))) (equal (remainder x x) (zero)) (equal (lessp (quotient i j) i) (and (not (zerop i)) (or (zerop j) (not (equal j 1))))) (equal (lessp (remainder x y) x) (and (not (zerop y)) (not (zerop x)) (not (lessp x y)))) (equal (power-eval (power-rep i base) base) (fix i)) (equal (power-eval (big-plus (power-rep i base) (power-rep j base) (zero) base) base) (plus i j)) (equal (gcd x y) (gcd y x)) (equal (nth (append a b) i) (append (nth a i) (nth b (difference i (length a))))) (equal (difference (plus x y) x) (fix y)) (equal (difference (plus y x) x) (fix y)) (equal (difference (plus x y) (plus x z)) (difference y z)) (equal (times x (difference c w)) (difference (times c x) (times w x))) (equal (remainder (times x z) z) (zero)) (equal (difference (plus b (plus a c)) a) (plus b c)) (equal (difference (add1 (plus y z)) z) (add1 y)) (equal (lessp (plus x y) (plus x z)) (lessp y z)) (equal (lessp (times x z) (times y z)) (and (not (zerop z)) (lessp x y))) (equal (lessp y (plus x y)) (not (zerop x))) (equal (gcd (times x z) (times y z)) (times z (gcd x y))) (equal (value (normalize x) a) (value x a)) (equal (equal (flatten x) (cons y (nil))) (and (nlistp x) (equal x y))) (equal (listp (gopher x)) (listp x)) (equal (samefringe x y) (equal (flatten x) (flatten y))) (equal (equal (greatest-factor x y) (zero)) (and (or (zerop y) (equal y 1)) (equal x (zero)))) (equal (equal (greatest-factor x y) 1) (equal x 1)) (equal (numberp (greatest-factor x y)) (not (and (or (zerop y) (equal y 1)) (not (numberp x))))) (equal (times-list (append x y)) (times (times-list x) (times-list y))) (equal (prime-list (append x y)) (and (prime-list x) (prime-list y))) (equal (equal z (times w z)) (and (numberp z) (or (equal z (zero)) (equal w 1)))) (equal (greatereqpr x y) (not (lessp x y))) (equal (equal x (times x y)) (or (equal x (zero)) (and (numberp x) (equal y 1)))) (equal (remainder (times y x) y) (zero)) (equal (equal (times a b) 1) (and (not (equal a (zero))) (not (equal b (zero))) (numberp a) (numberp b) (equal (one- a) (zero)) (equal (one- b) (zero)))) (equal (lessp (length (delete x l)) (length l)) (member x l)) (equal (sort2 (delete x l)) (delete x (sort2 l))) (equal (dsort x) (sort2 x)) (equal (length (cons x1 (cons x2 (cons x3 (cons x4 (cons x5 (cons x6 x7))))))) (plus 6 (length x7))) (equal (difference (add1 (add1 x)) 2) (fix x)) (equal (quotient (plus x (plus x y)) 2) (plus x (quotient y 2))) (equal (sigma (zero) i) (quotient (times i (add1 i)) 2)) (equal (plus x (add1 y)) (if (numberp y) (add1 (plus x y)) (add1 x))) (equal (equal (difference x y) (difference z y)) (if (lessp x y) (not (lessp y z)) (if (lessp z y) (not (lessp y x)) (equal (fix x) (fix z))))) (equal (meaning (plus-tree (delete x y)) a) (if (member x y) (difference (meaning (plus-tree y) a) (meaning x a)) (meaning (plus-tree y) a))) (equal (times x (add1 y)) (if (numberp y) (plus x (times x y)) (fix x))) (equal (nth (nil) i) (if (zerop i) (nil) (zero))) (equal (last (append a b)) (if (listp b) (last b) (if (listp a) (cons (car (last a)) b) b))) (equal (equal (lessp x y) z) (if (lessp x y) (equal t z) (equal f z))) (equal (assignment x (append a b)) (if (assignedp x a) (assignment x a) (assignment x b))) (equal (car (gopher x)) (if (listp x) (car (flatten x)) (zero))) (equal (flatten (cdr (gopher x))) (if (listp x) (cdr (flatten x)) (cons (zero) (nil)))) (equal (quotient (times y x) y) (if (zerop y) (zero) (fix x))) (equal (get j (set i val mem)) (if (eqp j i) val (get j mem))))))
                                                            (_add-lemma-lst43 _lst69)))))
                                          (letrec ((_tautologyp70 (lambda (_x71 _true-lst72 _false-lst73)
                                                                    (let ((_p176 (_truep8 _x71 _true-lst72)))
                                                                      (if _p176
                                                                          #t
                                                                          (let ((_p177 (_falsep51 _x71 _false-lst73)))
                                                                            (if _p177
                                                                                #f
                                                                                (let ((_p178 (pair? _x71)))
                                                                                  (let ((_p179 (not _p178)))
                                                                                    (if _p179
                                                                                        #f
                                                                                        (let ((_p180 (car _x71)))
                                                                                          (let ((_p181 (eq? _p180 'if)))
                                                                                            (if _p181 (let ((_p182 (cadr _x71)))
                                                                                                        (let ((_p183 (_truep8 _p182 _true-lst72)))
                                                                                                          (if _p183 (let ((_p184 (caddr _x71)))
                                                                                                                      (_tautologyp70 _p184 _true-lst72 _false-lst73))
                                                                                                              (let ((_p185 (cadr _x71)))
                                                                                                                (let ((_p186 (_falsep51 _p185 _false-lst73)))
                                                                                                                  (if _p186
                                                                                                                      (let ((_p187 (cadddr _x71))) (_tautologyp70 _p187 _true-lst72 _false-lst73)) (let ((_p188 (caddr _x71))) (let ((_p189 (cadr _x71))) (let ((_p190 (cons _p189 _true-lst72))) (let ((_p191 (_tautologyp70 _p188 _p190 _false-lst73))) (if _p191 #t (let ((_p192 (cadddr _x71))) (let ((_p193 (cadr _x71))) (let ((_p194 (cons _p193 _false-lst73))) (_tautologyp70 _p192 _true-lst72 _p194)))))))))))))))
                                                                                                #f)))))))))))))
                                            (let ((_tautp74 (lambda (_x75) (let ((_p195 (_rewrite61 _x75))) (_tautologyp70 _p195 '() '())))))
                                              (let ((_test76 (lambda ()
                                                               (let ((_ans77 #f))
                                                                 (let ((_term78 #f))
                                                                   (let ((_subst179 '((x f (plus (plus a b) (plus c (zero)))) (y f (times (times a b) (plus c d))) (z f (reverse (append (append a b) (nil)))) (u equal (plus a b) (difference x y)) (w lessp (remainder a b) (member a (length b))))))
                                                                     (let ((_subst280 '(implies (and (implies x y) (and (implies y z) (and (implies z u) (implies u w)))) (implies x w))))
                                                                       (let ((_p196 (_apply-subst45 _subst179 _subst280)))
                                                                         (let ((_$197 (set! _term78 _p196))) (let ((_p198 (_tautp74 _term78)))
                                                                                                               (let ((_$199 (set! _ans77 _p198))) _ans77)))))))))))
                                                (letrec ((_trans-of-implies81
                                                          (lambda (_n82)
                                                            (letrec ((_trans-of-implies183
                                                                      (lambda (_n84)
                                                                        (let ((_p200 (equal? _n84 1)))
                                                                          (if _p200
                                                                              (let ((_p201 (cons 1 '())))
                                                                                (let ((_p202 (cons 0 _p201)))
                                                                                  (cons 'implies _p202)))
                                                                              (let ((_p203 (- _n84 1)))
                                                                                (let ((_p204 (cons _n84 '())))
                                                                                  (let ((_p205 (cons _p203 _p204)))
                                                                                    (let ((_p207 (- _n84 1)))
                                                                                      (let ((_p208 (_trans-of-implies183 _p207)))
                                                                                        (let ((_p208ADD (_trans-of-implies183 _p207)))
                                                                                          (let ((_p209 (cons _p206 _p208))) (cons 'and _p209)))))))))))))
                                                              (let ((_p210 (_trans-of-implies183 _n82)))
                                                                (let ((_p211 (cons _n82 '())))
                                                                  (let ((_p212 (cons 0 _p211)))
                                                                    (let ((_p213 (cons 'implies _p212)))
                                                                      (let ((_p214 (cons _p213 '())))
                                                                        (let ((_p215 (cons _p210 _p214)))
                                                                          (cons 'implies _p215)))))))))))
                                                  (let ((_$231 (set! _one-way-unify155 (lambda (_term185 _term286)
                                                                                         (let ((_p216 (pair? _term286)))
                                                                                           (let ((_p217 (not _p216)))
                                                                                             (if _p217
                                                                                                 (let ((_p218 (assq _term286 _unify-subst38)))
                                                                                                   (let ((_$219 (set! _temp-temp39 _p218)))
                                                                                                     (if _temp-temp39
                                                                                                         (let ((_p220 (cdr _temp-temp39)))
                                                                                                           (equal? _term185 _p220))
                                                                                                         (let ((_p221 (cons _term286 _term185)))
                                                                                                           (let ((_p222 (cons _p221 _unify-subst38)))
                                                                                                             (let ((_$223 (set! _unify-subst38 _p222)))
                                                                                                               #t)))))) (let ((_p224 (pair? _term185)))
                                                                                                                          (let ((_p225 (not _p224)))
                                                                                                                            (if _p225
                                                                                                                                #f
                                                                                                                                (let ((_p226 (car _term185)))
                                                                                                                                  (let ((_p227 (car _term286)))
                                                                                                                                    (let ((_p227ADD (cdaaaar _term286)))
                                                                                                                                      (let ((_p228 (eq? _p226 _p227)))
                                                                                                                                        (if _p228
                                                                                                                                            (let ((_p229 (cdr _term185)))
                                                                                                                                              (let ((_p230 (cdr _term286)))
                                                                                                                                                (_one-way-unify1-lst56 _p229 _p230)))
                                                                                                                                            #f)))))))))))))))
                                                    (let ((_$238 (set! _one-way-unify1-lst56 (lambda (_lst187 _lst288 EXTRA-PARAM)
                                                                                               (let ((_p232 (null? _lst187)))
                                                                                                 (if _p232
                                                                                                     #t
                                                                                                     (let ((_p233 (car _lst187)))
                                                                                                       (let ((_p234 (car _lst288)))
                                                                                                         (let ((_p235 (_one-way-unify155 _p233 _p234)))
                                                                                                           (if _p235
                                                                                                               (let ((_p236 (cdr _lst187)))
                                                                                                                 (let ((_p237 (cdr _lst288)))
                                                                                                                   (_one-way-unify1-lst56 _p236 _p237)))
                                                                                                               #f))))))))))
                                                      (let ((_$239 (_setup68))) (_test76)))))))))))))))))))))))))))))
