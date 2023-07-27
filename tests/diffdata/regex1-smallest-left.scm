(lambda (_pattern58 _data59) 
                               (let ((_p115 (null? _data59))) 
                                 (if _p115 
                                     (let ((_p116 (_regex-empty37 _pattern58))) 
                                       (_regex-empty?15 _p116)) 
                                     (let ((_p117 (car _data59))) 
                                       (let ((_p118 (_d/dc56 _pattern58 _p117))) 
                                         (let ((_p119 (cdr _data59))) 
                                           (_regex-match57 _p118 _p119)))))))
