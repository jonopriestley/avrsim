;float q_rsqrt(float number)
;{
;  long i;
;  float x2, y;
;  const float threehalfs = 1.5F;
;
;  x2 = number * 0.5F;
;  y  = number;
;  i  = * ( long * ) &y;                       // evil floating point bit level hacking
;  i  = 0x5f3759df - ( i >> 1 );               // what the fuck?
;  y  = * ( float * ) &i;
;  y  = y * ( threehalfs - ( x2 * y * y ) );   // 1st iteration
;  // y  = y * ( threehalfs - ( x2 * y * y ) );   // 2nd iteration, this can be removed
;
;  return y;
;}




.section .data


.section .text
    .global asm_function


asm_function:
    ; calls the FISR

    ; push 100 to the stack from highest byte to lowest byte
    ldi r16, 0x42
    push r16
    ldi r16, 0xc8
    push r16
    ldi r16, 0x00
    push r16
    ldi r16, 0x00
    push r16
    clr r16

    call fisr

    ; r16:r19 contains the digits of 1/sqrt(100)
    pop r19
    pop r18
    pop r17
    pop r16

    ret

; the actual Fast Inverse Square Root function
fisr:
    ; expecting float number, 32 bits in Z+3:Z+6
    ; doesnt change the stack

    ; Z = SP
    in r30, 0x3d
    in r31, 0x3e

    ; the number
    ldd r8, Z+3
    ldd r9, Z+4
    ldd r10, Z+5
    ldd r11, Z+6

    ; return of the number is negative
    sbrc r11, 7
    ret

    ;;; x2 = 0.5 * number ;;;

    ; x2 = number
    mov r12, r8
    mov r13, r9
    mov r14, r10
    mov r15, r11

    ; r15 = exponent of number - 1
    lsl r15         ; r15 = exponent 7 - 1 and a zero in bit 0
    sbrs r14, 7     ; skip next instruction if exponent bit 0 is cleared
    dec r15

    ; move exponent(0) into r14(7)
    lsl r14 ; shift r14 left
    lsr r15 ; shift r15 right to get exponent bit 0 into C flag
    ror r14 ; shift exponent bit 0 into r14(7)

    
    ; r23:r20 = number = y
    ; r15:r12 = number * 0.5 = x2

    ; i  = * ( long * ) &y is not necessary. we have the bits

    ;;; i  = 0x5f3759df - ( i >> 1 )
    
    ;i >> 1
    asr r11
    ror r10
    ror r9
    ror r8

    ; r19:r16 = 0x5f3759df
    ldi r19, 0x5f
    ldi r18, 0x37
    ldi r17, 0x59
    ldi r16, 0xdf

    ; r19:r16 = 0x5f3759df - ( i >> 1 )
    sub r16, r8
    sbc r17, r9
    sbc r18, r10
    sbc r19, r11

    ; i  = 0x5f3759df - ( i >> 1 )
    mov r8, r16
    mov r9, r17
    mov r10, r18
    mov r11, r19

    ; y = r11:r8

    ;;;;; y  = y * ( threehalfs - ( x2 * y * y ) )
    
    ;;; calculate x2 * y
    ; push y
    push r11
    push r10
    push r9
    push r8

    ; push x2
    push r15
    push r14
    push r13
    push r12

    rcall float_mul

    ;;; calculate (x2 * y) * y
    rcall float_mul ; y should still be in the stack with (x2 * y) above it

    pop r16
    pop r17
    pop r18
    pop r19

    ; leave y on the stack
    ;pop r0
    ;pop r0
    ;pop r0
    ;pop r0

    ;;; calculate threehalfs - (x2 * y * y)
    ; r19:r16 = x2 * y * y

    ; 1.5 = 0 01111111 (1.)1000000 00000000 00000000
    ; r23:r20 = 1.5
    ldi r23, 0x7f ; exponent
    ldi r22, 0xc0 ; mantissa --> explicit 1
    ldi r21, 0x00 ; mantissa
    ldi r20, 0x00 ; mantissa 

    ; r27:r24 = r19:r16 = (x2 * y * y)
    mov r27, r19
    mov r26, r18
    mov r25, r17
    mov r24, r16

    ; r27 = exponent of (x2 * y * y)
    lsl r27         ; shift left
    sbrc r18, 7     ; skip if exponent(0) should be a 0
    sbr r27, 1      ; set exponent(0)

    ; r26:r24 = mantissa of (x2 * y * y) with explicit 1
    sbr r26, 0x80 ; explicit 1 for 


;;; shift the values
; if exponent(x2 * y * y) > 0x7f
if_x2yy_gt_0x7f:
    cp r23, r27
    brsh else_if_x2yy_lt_0x7f
    ; going to be a negative number

    ; increment exponent of 1.5 and shift mantissa until equal to r27
    inc r23
    lsr r22
    ror r21
    ror r20
    rjmp if_x2yy_gt_0x7f


; else if exponent(x2 * y * y) < 0x7f
else_if_x2yy_lt_0x7f:
    cp r27, r23
    brsh else_if_x2yy_eq_0x7f

    inc r27
    lsr r26
    ror r25
    ror r24
    rjmp else_if_x2yy_lt_0x7f


    ; else if exponent(x2 * y * y) == 0x7f
    ; r26:r24 = mantissa(x2 * y * y)
    ; r22:r20 = mantissa(1.5)
 
   

else_if_x2yy_eq_0x7f:

    

    cp r26, r22
    brlo if_1_5_gt_x2yy
    brne if_1_5_lt_x2yy
    cp r25, r21
    brlo if_1_5_gt_x2yy
    brne if_1_5_lt_x2yy
    cp r24, r20
    brlo if_1_5_gt_x2yy
    brne if_1_5_lt_x2yy
    rjmp if_1_5_eq_x2yy

if_1_5_gt_x2yy:
    ; if 1.5 > (x2 * y * y)
        ; do 1.5 - (x2 * y * y)
    ; r22:20 - r26:r24
    
    sub r20, r24
    sbc r21, r25
    sbc r22, r26

; shift until 1 in r22(7)
correct_1:
    sbrc r22, 7
    rjmp done_correct_1
    dec r23
    lsl r20
    rol r21
    rol r22
    rjmp correct_1

done_correct_1:
    ; mov bits into the correct location
    lsl r22
    lsr r23
    ror r22

    mov r16, r20
    mov r17, r21
    mov r18, r22
    mov r19, r23
    rjmp last_y_mul
    
if_1_5_lt_x2yy:
    ; if 1.5 < (x2 * y * y)
    ; - (r26:24 - r22:r20)
    sub r24, r20
    sbc r25, r21
    sbc r26, r22

; shift until 1 in r26(7)
correct_2:
    sbrc r26, 7
    rjmp done_correct_2
    dec r27
    lsl r24
    rol r25
    rol r26
    rjmp correct_2

done_correct_2:

    ; move bits into the correct location
    lsl r26
    lsr r27
    ror r26
    sbr r27, 0x80 ; negative number

    mov r16, r24
    mov r17, r25
    mov r18, r26
    mov r19, r27
    rjmp last_y_mul


if_1_5_eq_x2yy:
    ; if (x2 * y * y) == 1.5
        ; set y to 0
    clr r16
    clr r17
    clr r18
    clr r19

last_y_mul:
    ;;; calculate y * ( threehalfs - ( x2 * y * y ) )
    
    ; y is already on the stack
    ; push ( threehalfs - ( x2 * y * y ) ) onto the stack
    push r19
    push r18
    push r17
    push r16
    
    rcall float_mul

    ; pop result
    pop r16
    pop r17
    pop r18
    pop r19

    ; pop y
    pop r0
    pop r0
    pop r0
    pop r0

    in r31, 0x3e
    in r30, 0x3d

    std Z+3, r16
    std Z+4, r17
    std Z+5, r18
    std Z+6, r19

    ret


float_mul:
    ; expecting two 4 byte numbers with bytes in 'little endian'
    ; doesnt change the stack

    ; Convert these numbers in scientific notation, so that we can explicitly represent hidden 1.
    ; Let ‘a’ be the exponent of x and ‘b’ be the exponent of y.
    ; Assume resulting exponent c = a+b. It can be adjusted after the next step.
    ; Multiply mantissa of x to mantissa of y. Call this result m.
    ; If m does not have a single 1 left of radix point, then adjust radix point so it does, and adjust exponent c to compensate.
    ; Add sign bits, mod 2, to get sign of resulting multiplication.
    ; Convert back to one byte floating point representation, truncating bits if needed.
    push r16
    push r17

    in r30, 0x3d
    in r31, 0x3e

    ; a = r19:r16
    ldd r16, Z+5
    ldd r17, Z+6
    ldd r18, Z+7
    ldd r19, Z+8

    ; b = r23:r20
    ldd r20, Z+9
    ldd r21, Z+10
    ldd r22, Z+11
    ldd r23, Z+12

    ; get exponents
    ; get mantissas

    ;;; bit shift exponent into r19 and r23 and set implicit 1
    lsl r19
    sbrc r18, 7
    sbr r19, 1
    sbr r18, 0x80 ; set bit 7 in r18 (implicit 1 set)

    lsl r23
    sbrc r22, 7
    sbr r23, 1
    sbr r22, 0x80 ; set bit 7 in r22 (implicit 1 set)
    
    ; r23 & r19 = exponent
    ; r22:20 & r18:16 = mantissa and explicit 1

    subi r19, 127 ; remove the bias from r19
    add r23, r19 ; r23 = sum of exponents

    ;;; multiply mantissas

    clr r19 ; r19 = 0 for ADC

    ; put the values of r1:r0 onto the stack
    push r1
    push r0

    mul r22, r18
    mov r30, r0
    mov r31, r1

    mul r22, r17
    mov r27, r0
    add r30, r1
    adc r31, r19

    mul r21, r18
    add r27, r0
    adc r30, r1
    adc r31, r19

    mul r22, r16
    mov r26, r0
    add r27, r1
    adc r30, r19
    adc r31, r19

    mul r20, r18
    add r26, r0
    adc r27, r1
    adc r30, r19
    adc r31, r19

    mul r21, r17
    add r26, r0
    adc r27, r1
    adc r30, r19
    adc r31, r19

    mul r21, r16
    mov r25, r0
    add r26, r1
    adc r27, r19
    adc r30, r19
    adc r31, r19

    mul r20, r17
    add r25, r0
    adc r26, r1
    adc r27, r19
    adc r30, r19
    adc r31, r19

    mul r20, r16
    mov r24, r0
    add r25, r1
    adc r26, r19
    adc r27, r19
    adc r30, r19
    adc r31, r19

    ; restore the values of r1:r0
    pop r0
    pop r1

    ; r31:r30 & r27:r24 = r22:r20 * r18:r16
    mov r22, r31
    mov r21, r30
    mov r20, r27
    ; r22:r20 & r26:r24 = r22:r20 * r18:r16

    ; if MSB == 1, bit shift once to the right and add 1 to the exponent
    ; else if MSB(2) == 1, no adjustments needed
    ; else until MSB(2) == 1, bit shift to the left and sub 1 from the exponent

if_msb_1_is_1:
    ; IF MSB(1) == 1
    sbrs r22, 7
    rjmp else_if_msb_2_is_1
    cbr r22, 0x80 ; clear the explicit 1 to make it implicit
    inc r23 ; exponent += 1
    rjmp after_adjust

else_if_msb_2_is_1: ; loop until bit 6 == 1
    ; shift left until MSB(2) == 1
    lsl r24
    rol r25
    rol r26
    rol r20
    rol r21
    rol r22

    dec r23 ; exponent -= 1
    sbrc r22, 6
    rjmp after_adjust ; no adjustment needed
    rjmp else_if_msb_2_is_1


after_adjust:
    ; move exponent(0) into r22(7) and shift r23 down to correct spot
    sbrc r23, 0
    sbr r22, 0x80
    lsr r23

    ; get and set the sign
    in r30, 0x3d
    in r31, 0x3e

    ldd r24, Z+8
    ldd r25, Z+12

    eor r24, r25    ; XOR all the bits
    sbrc r24, 7     ; skip next if sign = 0
    sbr r23, 0x80   ; set sign to 1

store_result:
    std Z+5, r20
    std Z+6, r21
    std Z+7, r22
    std Z+8, r23

    pop r17
    pop r16

    ret

.end