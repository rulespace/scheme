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
                                                      _p105))))))))))) 
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
