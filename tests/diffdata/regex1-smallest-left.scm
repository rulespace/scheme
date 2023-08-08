(lambda (_pattern58 _data59) 
          (let ((_p115 (null? _data59))) 
            (if _p115 
                (let ((_p116 (_regex-empty37 _pattern58))) 
                  (_regex-empty?15 _p116)) 
                (let ((_p117 (car _data59))) 
                  (let ((_p118 (_d/dc56 _pattern58 _p117))) 
                    (let ((_p119 (cdr _data59))) 
                      (_regex-match57 _p118 _p119)))))))


;; l->r solution MMMMMM(3)MMML(8)MM(3)M(15)R(8)
;; r->l solution MMMMMM(3)MMMR(8)MM(3)M(15)L(8) OR(???) MMMMMM(3)MMR(8)M(20)L(8)