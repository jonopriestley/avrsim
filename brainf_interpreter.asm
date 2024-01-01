
.section .data
; r31:r30 = pointer
.equ pH, 31
.equ pL, 30
; r29:r28 = i (index of character up to in the code)
.equ iH, 29
.equ iL, 28
; r27:r26 = pointer use for printing each cell
.equ printH, 27
.equ printL, 26
; r25:r24 = string length for code
.equ strlenH, 25
.equ strlenL, 24
; r16 = character up to
.equ char, 16

; actual brainfuck code to be read and run
input_str: .string "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++."

.section .text
.global asm_function

; t = text, a = 30000 array, p = pointer/position, i = text pointer, l = list/stack for loop tracking, n = len(t)
asm_function:

;;; Y = i = @input_string
ldi iL, lo8(input_str)
ldi iH, hi8(input_str)

;;; get str_len
get_strlen:
ld strlenL, Y+          ; strlenL = DMEM[Y]
cpi strlenL, 0          ; cpse strlenL, 0
breq after_get_strlen
rjmp get_strlen     ; go to top of loop

after_get_strlen:
mov strlenH, iH        ; r25:r24 = strlen
mov strlenL, iL
sbiw strlenL, 1 ; due to the \0 at the end of the string       

;;; Z = p = array pointer
mov pH, iH        
mov pL, iL
adiw pL, 2

; X = pointer for printing
mov printH, iH
mov printL, iL

; SP = l (list of "[" locations) pointer on the stack

;;; reset to  Y = i = @input_string
ldi iL, lo8(input_str)
ldi iH, hi8(input_str)

loop_check:
;;; while i < n:
cp iH, strlenH     ; if i(high) 
brlo loop
cp strlenH, iH
brlo after_loop
; therefore strlenH == iH
cp iL, strlenL
brsh after_loop

loop:
; c = t[i]
ld char, Y

; if c in '+-': a[p] = (a[p] + 44 - ord(c)) % 256
; if char in [43, 45] --> cell = cell + 44 - c
plus_minus_check:
cpi char, 43
breq plus_minus
cpi char, 45
brne left_right_check

plus_minus:

ldi r18, 44
sub r18, char    ; 44 - c
ld r17, Z       ; r17 = cell
add r17, r18    ; r17 = cell + 44 - c
st Z, r17       ; cell = cell + 44 - c
rjmp after_ifs

; elif c in '<>': p += ord(c) - 61
; elif char in [60, 62]: r31:r30 += c - 61
left_right_check:
cpi char, 60
breq left_right
cpi char, 62
brne dot_check

left_right:
cpi char, 60
brne 2
sbiw pL, 1
rjmp after_ifs
adiw pL, 1
rjmp after_ifs

; elif c == '.': print(chr(a[p]), end='')
dot_check:
cpi char, 46
brne lb_check

dot:
; store r25:r24
push strlenL
push strlenH
; store r31:r30
push pL
push pH

; r17 = cell
ld r17, Z
; put it right after the input string
st X, r17
; push that address to the stack high then low bite
push printH
push printL
; call printf
call printf
; pop from stack
pop printL
pop printH

; restore r31:r30
pop pH
pop pL
; restore r25:r24
pop strlenH
pop strlenL

rjmp after_ifs


; elif c == '[': l += [i]
; elif c == 91: push Y
lb_check:
cpi char, 91
brne rb_check

lb:
push iH
push iL
rjmp after_ifs

; elif c == ']':
rb_check:
cpi char, 93
brne after_ifs

;     if a[p]: i = l[-1]
;     else: l.pop(-1)
rb:
ld r17, Z       ; r17 = a[p] = cell

cpi r17, 0
breq else

;; copy l[-1] into Y
pop iL
pop iH

;; put l[-1] back onto the stack
push iH
push iL
rjmp after_ifs

else:
;; pop l[-1] into r1:r0 and clear them
pop r0
pop r1
;rjmp after_ifs

; elif c == ',': a[p] = ord(input() or '\n')

after_ifs:
; i += 1
adiw iL, 1

; go back to top
rjmp loop_check

after_loop:

ret

.end
