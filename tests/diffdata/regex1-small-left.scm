 
(letrec ((_regex-derivative45 (lambda (_re46 _c47) 
                                (let ((_$101 (_debug-trace0))) 
                                  (let ((_p102 (_regex-empty?15 _re46))) 
                                    (if _p102 
                                        _regex-NULL5 
                                        (let ((_p103 (_regex-null?13 _re46))) 
                                          (if _p103 
                                              _regex-NULL5 
                                              (let ((_p104 (eq? _c47 _re46))) 
                                                (if _p104 
                                                    _regex-BLANK6 
                                                    (let ((_p105 (_regex-atom?17 _re46))) 
                                                      (if _p105 
                                                          _regex-NULL5 
                                                          (let ((__t348 (_match-seq20 _re46 (lambda (_pat149 _pat250) 
                                                                                              (let ((_p106 (_regex-derivative45 _pat149 _c47))) 
                                                                                                (let ((_p107 (_seq29 _p106 _pat250))) 
                                                                                                  (let ((_p108 (_regex-empty37 _pat149))) 
                                                                                                    (let ((_p109 (_regex-derivative45 _pat250 _c47)))
                                                                                                      (let ((_p110 (_seq29 _p108 _p109))) 
                                                                                                        (_alt32 _p107 _p110)))))))))) 
                                                            (if __t348 
                                                                __t348 
                                                                (let ((__t451 (_match-alt23 _re46 (lambda (_pat152 _pat253) 
                                                                                                    (let ((_p111 (_regex-derivative45 _pat152 _c47))) 
                                                                                                      (let ((_p112 (_regex-derivative45 _pat253 _c47))) 
                                                                                                        (_alt32 _p111 _p112))))))) 
                                                                  (if __t451 
                                                                      __t451 
                                                                      (let ((__t554 (_match-rep26 _re46 (lambda (_pat55) 
                                                                                                          (let ((_p113 (_regex-derivative45 _pat55 _c47))) 
                                                                                                            (let ((_p114 (_rep35 _pat55))) (_seq29 _p113 _p114))))))) 
                                                                        (if __t554 __t554 _regex-NULL5)))))))))))))))))) 
  (let ((_d/dc56 _regex-derivative45)) 
    (letrec ((_regex-match57 (lambda (_pattern58 _data59) 
                               (let ((_p115 (null? _data59))) 
                                 (if _p115 
                                     (let ((_p116 (_regex-empty37 _pattern58))) 
                                       (_regex-empty?15 _p116)) 
                                     (let ((_p117 (car _data59))) 
                                       (let ((_p118 (_d/dc56 _pattern58 _p117))) 
                                         (let ((_p119 (cdr _data59))) 
                                           (_regex-match57 _p118 _p119))))))))) 
      (let ((_check-expect60 (lambda (_check61 _expect62) (equal? _check61 _expect62)))) 
        (let ((xx '(seq foo (rep bar))))
          (let ((yy '(foo bar)))
            (let ((_p120 (_regex-match57 xx yy))) 
              (_check-expect60 _p120 #t))))))))
