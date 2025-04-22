; Python code for this function
;   def caesar_cipher(text, shift, decrypt=False):
;       alphabet = 'abcdefghijklmnopqrstuvwxyz'
;       shifted_alphabet = alphabet[shift:] + alphabet[:shift] if not decrypt else alphabet[-shift:] + alphabet[:-shift]
;       translation_table = str.maketrans(alphabet + alphabet.upper(), shifted_alphabet + shifted_alphabet.upper())
;       return text.translate(translation_table)

.section .data

msg: .string "message to encode"
offset: .byte 12
alphabet: .ascii "abcdefghijklmnopqrstuvwxyz"

.section .text
.global asm_function

asm_function:
; Z -> alphabet[0]
ldi r31, hi8(alphabet)
ldi r30, lo8(alphabet)

lds r16, offset ; r16 = offset

mod_26:
cpi r16, 26
brlo mod_done
subi r16, 26
rjmp mod_26

mod_done:
cpi r16, 0
breq move_letters_back

; shift the letters to the end
shift_loop:
ld r17, Z+
std Z+25, r17

dec r16
brne shift_loop ; check when offset left is 0

; move the letters back into the 26 spaces for they were before
move_letters_back:
; X -> alphabet[0]
ldi r27, hi8(alphabet)
ldi r26, lo8(alphabet)

ldi r16, 26

move_loop:
ld r17, Z+      ; load front letter
st X+, r17

dec r16
brne move_loop

;; after_move_loop

; X -> msg[0]
ldi r27, hi8(msg)
ldi r26, lo8(msg)

clr r0

msg_loop:
; Z -> alphabet[0]
ldi r31, hi8(alphabet)
ldi r30, lo8(alphabet)

ld r17, X+  ; get next msg element

cpi r17, 0
breq end

; if not letter go to the next one
cpi r17, 0x41
brlo msg_loop

; if it's upper case
clr r16 ; r16 = 0
cpi r17, 0x5b
brlo is_letter

; if before the lower case letters but after the upper case letters 
cpi r17, 0x61
brlo msg_loop

; if beyond the lower case letters
cpi r17, 0x7b
brsh msg_loop

ldi r16, 32

is_letter:
; convert letter to alphabet place
subi r17, 0x41
sub r17, r16

; Z += alphabet location
add r30, r17
adc r31, r0

ld r17, Z       ; get corresponding letter
sbrs r16, 5     ; skip if it's lower case (if r16 == 32)
subi r17, 32    ; subtract 32 to make upper case
st -X, r17
adiw r26, 1

rjmp msg_loop

end:
ret

.end