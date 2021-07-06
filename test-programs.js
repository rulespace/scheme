export default [

  [`123`, 123],
  [`(let ((x 10)) x)`, 10],
  [`(let ((x 10)) (let ((y 20)) y))`, 20],
  [`(let ((x 10)) (let ((y 20)) x))`, 10],
  [`(let ((x 10)) (let ((x 20)) x))`, 20],
  [`(let ((x 123)) (let ((u (let ((x #f)) "dummy"))) x))`, 123],
  [`(let ((x 123)) (let ((u (let ((y "dummy")) (let ((x #f)) "dummy2")))) x))`, 123],
  [`(let ((x (let ((z 3)) z))) x)`, 3],

  [`(let ((f (lambda () 123))) (f))`, 123],
  [`(let ((f (lambda (x) x))) (f 123))`, 123],
  [`(let ((x 123)) (let ((f (lambda () x))) (f)))`, 123],
  [`(let ((x 123)) (let ((f (lambda () x))) (let ((x 999)) (f))))`, 123],
  [`(let ((f (lambda (x) (let ((v x)) v)))) (f 123))`, 123],
  [`(let ((f (lambda (x) x))) (let ((v (f 999))) v))`, 999],
  [`(let ((f (lambda (x) x))) (let ((u (f 1))) (f 2)))`, 2],

  // [`(+ 1 1)`, 2],
  // [`(let ((x (+ 1 1))) x)`, 2],
  // [`(let ((f (lambda () (- 5 3)))) (f))`, 2]
];

// (test-rules ')
// (test-rules ')
// (test-rules ')
// (test-rules '(let ((f (lambda (x) (* x x)))) (f 4)) 16)
// (test-rules '((lambda (x) (* x x)) 4) 16)
// (test-rules '(let ((f (lambda (g) (g 4)))) (f (lambda (x) (* x x)))) 16)
// (test-rules '(let ((f (lambda (x) x))) (let ((v (+ 3 9))) v)) 12)

// (test-rules '(let ((g (lambda (v) v))) (let ((f (lambda (n) (let ((m (g 123))) (* m n))))) (f 2))) 246)
// (test-rules '(let ((f (lambda (y) (let ((x y)) x)))) (let ((z (f "foo"))) (f 1))) 1)
// (test-rules '(let ((f (lambda (x) (let ((i (lambda (a) a))) (i x))))) (let ((z1 (f 123))) (let ((z2 (f #t))) z2))) #t)
// (test-rules '(let ((f (lambda () (lambda (x) (* x x))))) (let ((g (f))) (g 4))) 16)

// (test-rules '(if #t 1 2) 1)
// (test-rules '(if #f 1 2) 2)
// (test-rules '(if #t (+ 3 5) (- 4 6)) 8)
// (test-rules '(if #f (+ 3 5) (- 4 6)) -2)
// (test-rules '(if #t (let ((x 1)) x) (let ((x 2)) x)) 1)
// (test-rules '(if #f (let ((x 1)) x) (let ((x 2)) x)) 2)
// (test-rules '(let ((x (if #t 1 2))) x) 1)
// (test-rules '(let ((x (if #f 1 2))) x) 2)
// (test-rules '(let ((f (lambda (x) (* x x)))) (let ((v (f 4))) (if v (f 5) (f 6)))) 25)

// (test-rules '(let ((f (lambda (x) (lambda (y) x)))) (let ((v (f 123))) (v 999))) 123)
// (test-rules '(let ((f (lambda (x) (lambda (x) x)))) (let ((v (f 123))) (v 999))) 999)
// (test-rules '(let ((f (lambda (g) (g 678)))) (let ((id (lambda (x) x))) (f id))) 678)
// (test-rules '(let ((f (lambda (g x) (g x)))) (let ((id (lambda (x) x))) (f id 789))) 789)
// (test-rules '(let ((f (lambda (g) (lambda (x) (g x))))) (let ((sq (lambda (x) (* x x)))) (let ((ff (f sq))) (ff 11)))) 121)
// (test-rules '(let ((f (lambda (n) (let ((x n)) (lambda () x))))) (let ((f0 (f 0))) (let ((f1 (f 1))) (let ((u (f1))) (f0))))) 0)

// (test-rules '(letrec ((f (lambda (x) (if x "done" (f #t))))) (f #f)) "done")
// (test-rules '(letrec ((f (lambda (x) (let ((v (= x 2))) (if v x (let ((u (+ x 1))) (f u))))))) (f 0)) 2)
// ; ^ 26s unoptimized naive; 10s semi-naive + opti
// ; (test-rules '(letrec ((count (lambda (n) (let ((t (= n 0))) (if t 123 (let ((u (- n 1))) (let ((v (count u))) v))))))) (count 1)) 123)
// ; (test-rules '(letrec ((fac (lambda (n) (let ((v (= n 0))) (if v 1 (let ((m (- n 1))) (let ((w (fac m))) (* n w)))))))) (fac 1)) 1)
// ; (test-rules '(letrec ((fac (lambda (n) (let ((v (= n 0))) (if v 1 (let ((m (- n 1))) (let ((w (fac m))) (* n w)))))))) (fac 3)) 6)
// ; (test-rules '(letrec ((fib (lambda (n) (let ((c (< n 2))) (if c n (let ((n1 (- n 1))) (let ((n2 (- n 2))) (let ((f1 (fib n1))) (let ((f2 (fib n2))) (+ f1 f2)))))))))) (fib 1)) 1)
// ; (test-rules '(letrec ((fib (lambda (n) (let ((c (< n 2))) (if c n (let ((n1 (- n 1))) (let ((f1 (fib n1))) (let ((n2 (- n 2))) (let ((f2 (fib n2))) (+ f1 f2)))))))))) (fib 1)) 1)
// ; (test-rules '(letrec ((fib (lambda (n) (let ((c (< n 2))) (if c n (let ((n1 (- n 1))) (let ((n2 (- n 2))) (let ((f1 (fib n1))) (let ((f2 (fib n2))) (+ f1 f2)))))))))) (fib 3)) 2)
// ; (test-rules '(letrec ((fib (lambda (n) (let ((c (< n 2))) (if c n (let ((n1 (- n 1))) (let ((f1 (fib n1))) (let ((n2 (- n 2))) (let ((f2 (fib n2))) (+ f1 f2)))))))))) (fib 3)) 2)
// ; ^ excluded

// (test-rules 'x 'FAIL)
// (test-rules '(let ((f (lambda () f))) (f)) 'FAIL)
// ; ^ full: 339.4 s unoptimized naive; 69.6 s semi-naive + opti

// ; set!
// ; (test-rules '(let ((g #f)) (let ((f (lambda (n) (let ((x n)) (let ((u (if g 123 (set! g (lambda (y) (set! x y)))))) (lambda () x))))))
// ;                                (let ((f0 (f 0)))
// ;                                  (let ((u (g 9)))
// ;                                    (let ((f1 (f 1)))
// ;                                      (let ((u (f1)))
// ;                                        (f0))))))) 9)


// ; cons car cdr
// ; (test-machine '(let ((x (if #t (cons 1 2) (cons 3 4)))) (car x)) 1)
// ; (test-machine '(let ((x (if #t (cons 1 2) (cons 3 4)))) (cdr x)) 2)
// ; (test-machine '(let ((x (if #f (cons 1 2) (cons 3 4)))) (car x)) 3)
// ; (test-machine '(let ((x (if #f (cons 1 2) (cons 3 4)))) (cdr x)) 4)
