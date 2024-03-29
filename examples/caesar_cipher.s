;;; Data definitions go here
.section .data
to_encode:			; String to encode
	.string "AVR to encode\n"
positions:
	.byte 12		; Number of positions to add
	
;;; Code definition goes here
.section .text
	.global asm_function

asm_function:			; Main function

	;; Print the string before encoding
	LDI R18, hi8(to_encode)
	PUSH R18
	LDI R18, lo8(to_encode)
	PUSH R18
	CALL printf
	POP R0
	POP R0

	;;;;;; YOUR CODE HERE ;;;;;;

    ;; Loop until end or \n
    ldi r30, lo8(to_encode)
    ldi r31, hi8(to_encode)

loop:    
    ;;; Load each letter
    ld r20, Z

    ;;; Check if it's NULL
        ; break if null
    cpi r20, 0
    breq finish


    ; save Z
    push r30
    push r31

    push r20    ;; give letter value to as param
    call encode
    pop r20
    
    ; restore Z
    pop r31
    pop r30

    st Z+, r20

    jmp loop
    ; add "positions" to its value if it's a letter
    ; store each letter



    ;;;;;;;;;;;;;;;;;;;;;;;;;;;;
	
finish:
	;; Print the string AFTER encoding
	LDI R18, hi8(to_encode)
	PUSH R18
	LDI R18, lo8(to_encode)
	PUSH R18
	CALL printf
	POP R0
	POP R0
	
	ret
	
encode:				; Subroutine to encode one letter
    ; Z = SP
    in r30, 0x3d
    in r31, 0x3e

    ldd r20, Z+3	; r20 = letter value
	
	clr r16			; r16 = 0 -> lower case, r16 = 1 -> upper case

    ;; Jump to the end if the value is not a letter
    cpi r20, 0x41
    brlo do_nothing ;; do nothing if it's less than the capitals
    
	cpi r20, 0x5b
	brsh not_capital	;; skip to the next comparison if its not capital
	ldi r16, 1			;; set the upper case marker
    rjmp add_positions  ;; jump to add positions since it's capital
    
not_capital:
	cpi r20, 0x61
    brlo do_nothing ;; do nothing if it's between capitals and lower case
    cpi r20, 0x7b
    brsh do_nothing ;; do nothing if it's beyond lower case
    ;; else add positions cause it's lower case

    ; IF (letter + pos > z) THEN need to add -26

add_positions:
    lds r21, positions
    add r20, r21

    cpi r20, 0x5b    ; check if the value is within capitals
    brlo do_nothing
    cpi r20, 0x61    ; check if the value is beyond capitals
    brlo sub_26
	
	;; If it was lower case then skip this. If it was upper case then check if it's gone beyond Z (0x5a)
	cpi r16, 0
	breq was_lower_case ; skip to lower case if it was lower case
	
	cpi r20, 0x5b
	brsh sub_26
	rjmp do_nothing
	
was_lower_case:
    cpi r20, 0x7b    ; check if the value is within lower case
    brlo do_nothing
    ;; otherwise sub_26

sub_26:
    ldi r21, 26
    sub r20, r21

do_nothing:
    std Z+3, r20
	ret


	
.end