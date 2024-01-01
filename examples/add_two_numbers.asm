;;; Data definitions go here
.section .data
nums: .byte 53, 79		; Numbers to add
sum: .space 1			; Leave 1 space to store the sum
	
;;; Code definition goes here
.section .text
	.global asm_function

asm_function:			; Main function
	
	; Load the address of the first number into Y
	ldi r29, hi8(nums)
	ldi r28, lo8(nums)
	
	; Load the two numbers into r18 and r19
	ld r18, Y+
	ld r19, Y
	
	; Do the addition
	add r18, r19 		; r18 = r18 + r19
	
	; Load the address of 'sum' into Y
	ldi r29, hi8(sum)
	ldi r28, lo8(sum)
	
	; Store the sum into this address
	st Y, r18
	
	; Return from the function
	ret ; this should always be the final line

.end




