class Token {
    constructor(type_, value = null, location = null) {
        this.type = type_;
        this.value = value;
        this.location = location;
        this.line = (location === null) ? 'NULL' : parseInt(location.split(':')[0]);
        this.start = (location === null) ? 'NULL' : location.split(':')[1];
    }
    getType() {
        return this.type;
    }
    getValue() {
        return this.value;
    }
    setType(type_) {
        this.type = type_;
    }
    setValue(value) {
        this.value = value;
    }
    getLocation() {
        return this.location;
    }
    setLocation(location) {
        this.location = location;
    }
    getLine() {
        return this.line;
    }
    getStart() {
        return this.start;
    }
    toString() {
        let space1 = ' '.repeat(11 - this.location.length);
        let space2 = ' '.repeat(10 - this.type.toLowerCase().length);
        return `Loc=<${this.location}>${space1}${this.type.toLowerCase()}${space2}\'${this.value}\'`;
        //return `${this.type.toLowerCase()}\t\'${this.value}\'\tLoc=<${this.location}>`;
    }
}

class Register {
    constructor(name, value = 0, changed = 0) {
        this.name = name;
        this.value = value;
        this.changed = changed;
        this.bits_changed = 0;
    }
    toString() {
        return `${this.name}: ${this.value}`
    }
    clearChange() {
        `To be done at the start of
        every new instruction.`

        this.changed = 0;
        this.bits_changed = 0;
    }
    setChange() {
        this.changed = 1;
    }
    getChange() {
        return this.changed;
    }
    getBitsChanged() {
        return this.bits_changed;
    }
    setValue(new_value) {
        this.value = new_value & 0xff;
        this.setChange();
    }
    getValue() {
        return this.value;
    }
    updateBit(value, bit) {
        // Set the bit to 0 then OR it with the new value bit shifted
        this.setValue( (this.value & (0xff - (1 << bit))) | ((value * 1) << bit) );
        this.bits_changed |= (1 << bit);
    }
    getBit(bit) {
        // returns the value of a bit in a number
        return ((this.getValue() >> bit) & 1);
    }
    inc() {
        this.setValue(this.getValue() + 1);
    }
    dec() {
        this.setValue(this.getValue() - 1);
    }
}

class Argument {
    constructor(token_type, min_val = null, max_val = null, options_list = null, exact_value = null) {
        this.token_type = token_type; // the token you're expecting for the argument
        this.min_val = min_val; // the min value you're expecting for that token
        this.max_val = max_val;
        this.options_list = options_list;
        this.exact_value = exact_value;
    }
    isLegalToken(tok, line_num) {
        // Takes a token and checks if it matches with the argument.
        const legal_token_types = this.getTokenType(); // the legal token types for this argument

        // CHECK IF IT'S A LEGAL ARGUMENT
        if (!legal_token_types.includes(tok.getType())) {
            if (tok.getType() !== 'REG') {
                this.newError(`Illegal token '${tok.getValue()}' on line ${line_num}.`);
            }
            else {
                this.newError(`Illegal token 'R${tok.getValue()}' on line ${line_num}.`);
            }
        }
        // CHECK ITS LEGAL TOKEN TYPE AND WITHIN THE LEGAL BOUNDS
        if (this.hasValueRange()) {
            let val = tok.getValue(); // value of the token
            if (tok.getType() === 'WORDPLUSQ') {
                val = parseInt(val.substring(2)); // get rid of the Z+ or Y+ part
            }   
            if (tok.getType() !== 'REF' && !(this.getMinVal() <= val && val <= this.getMaxVal())) {
                if (tok.getType() === 'REG') {
                    tok.setValue(`R${tok.getValue()}`); // set it to register
                }
                this.newError(`Illegal argument '${tok.getValue()}' on line ${line_num}.`);
            }
        }
        // CHECK ITS LEGAL TOKEN TYPE AND IN THE LEGAL LIST
        if (this.hasOptionsList() && !this.getOptionsList().includes(tok.getValue())) {
            if (tok.getType() === 'REG') {
                this.newError(`Illegal argument 'R${tok.getValue()}' on line ${line_num}.`);
            }
            else if (tok.getType() !== 'INT') {
                this.newError(`Illegal argument '${tok.getValue()}' on line ${line_num}.`);
            }
        }
        // CHECK ITS LEGAL TOKEN TYPE AND IN THE LEGAL LIST
        if (this.hasExactValue() && tok.getValue() !== this.getExactValue()) {
            this.newError(`Illegal argument '${tok.getValue()}' on line ${line_num}.`);
        }
    }
    getTokenType() {
        return this.token_type;
    }
    getMinVal() {
        return this.min_val;
    }
    getMaxVal() {
        return this.max_val;
    }
    getOptionsList() {
        return this.options_list;
    }
    getExactValue() {
        return this.exact_value;
    }
    hasValueRange() {
        return this.min_val !== null && this.max_val !== null;
    }
    hasOptionsList() {
        return this.options_list !== null;
    }
    hasExactValue() {
        return this.exact_value !== null;
    }
    newError(text) {
        document.getElementById('error').innerHTML = text;
        document.getElementById('output').innerHTML = null;
        document.getElementById('status').innerHTML = null;
        throw new SyntaxError(text);
    }
}

class Instruction {
    constructor(tokens) {
        this.inst = tokens[0];
        this.args = tokens.slice(1);
        // Most op codes can be easily obtained from this
        this.all_opcodes = {
            'ADC': ['d', 'r', '000111rdddddrrrr'],
            'ADD': ['d', 'r', '000011rdddddrrrr'],
            'ADIW': null,
            'AND': ['d', 'r', '001000rdddddrrrr'],
            'ANDI': ['d', 'K', '0111KKKKddddKKKK'],
            'ASR': ['d', '1001010ddddd0101'],
            'BCLR': ['s', '100101001sss1000'],
            'BLD': ['d', 'b', '1111100ddddd0bbb'],
            'BRBC': ['s', 'k', '111101kkkkkkksss'],
            'BRBS': ['s', 'k', '111100kkkkkkksss'],
            'BRCC': ['k', '111101kkkkkkk000'],
            'BRCS': ['k', '111100kkkkkkk000'],
            'BREQ': ['k', '111100kkkkkkk001'],
            'BRGE': ['k', '111101kkkkkkk100'],
            'BRHC': ['k', '111101kkkkkkk101'],
            'BRHS': ['k', '111100kkkkkkk101'],
            'BRID': ['k', '111101kkkkkkk111'],
            'BRIE': ['k', '111100kkkkkkk111'],
            'BRLO': ['k', '111100kkkkkkk000'],
            'BRLT': ['k', '111100kkkkkkk100'],
            'BRMI': ['k', '111100kkkkkkk010'],
            'BRNE': ['k', '111101kkkkkkk001'],
            'BRPL': ['k', '111101kkkkkkk010'],
            'BRSH': ['k', '111101kkkkkkk000'],
            'BRTC': ['k', '111101kkkkkkk110'],
            'BRTS': ['k', '111100kkkkkkk110'],
            'BRVC': ['k', '111101kkkkkkk011'],
            'BRVS': ['k', '111100kkkkkkk011'],
            'BSET': ['s', '100101000sss1000'],
            'BST': ['d', 'b', '1111101ddddd0bbb'],
            'CALL': ['k', '1001010kkkkk111kkkkkkkkkkkkkkkkk'],
            'CBI': ['A', 'b', '10011000AAAAAbbb'],
            'CBR': null,
            'CLC': ['1001010010001000'],
            'CLH': ['1001010011011000'],
            'CLI': ['1001010011111000'],
            'CLN': ['1001010010101000'],
            'CLR': null,
            'CLS': ['1001010011001000'],
            'CLT': ['1001010011101000'],
            'CLV': ['1001010010111000'],
            'CLZ': ['1001010010011000'],
            'COM': ['d', '1001010ddddd0000'],
            'CP': ['d', 'r', '000101rdddddrrrr'],
            'CPC': ['d', 'r', '000001rdddddrrrr'],
            'CPI': ['d', 'K', '0011KKKKddddKKKK'],
            'CPSE': ['d', 'r', '000100rdddddrrrr'],
            'DEC': ['d', '1001010ddddd1010'],
            'EOR': ['d', 'r', '001001rdddddrrrr'],
            'FMUL': ['d', 'r', '000000110ddd1rrr'],
            'FMULS': ['d', 'r', '000000111ddd0rrr'],
            'FMULSU': ['d', 'r', '000000111ddd1rrr'],
            'ICALL': ['1001010100001001'],
            'IJMP': ['1001010000001001'],
            'IN': ['d', 'A', '10110AAdddddAAAA'],
            'INC': ['d', '1001010ddddd0011'],
            'JMP': ['k', '1001010kkkkk110kkkkkkkkkkkkkkkkk'],
            'LD': null,
            'LDD': null,
            'LDI': ['d', 'K', '1110KKKKddddKKKK'],
            'LDS': ['d', 'k', '1001000ddddd0000kkkkkkkkkkkkkkkk'],
            'LPM': null,
            'LSL': null,
            'LSR': ['d', '1001010ddddd0110'],
            'MOV': ['d', 'r', '001011rdddddrrrr'],
            'MOVW': null,
            'MUL': ['d', 'r', '100111rdddddrrrr'],
            'MULS': ['d', 'r', '00000010ddddrrrr'],
            'MULSU': ['d', 'r', '000000110ddd0rrr'],
            'NEG': ['d', '1001010ddddd0001'],
            'NOP': ['0000000000000000'],
            'OR': ['d', 'r', '001010rdddddrrrr'],
            'ORI': ['d', 'K', '0110KKKKddddKKKK'],
            'OUT': ['A', 'r', '10111AArrrrrAAAA'],
            'POP': ['d', '1001000ddddd1111'],
            'PUSH': ['r', '1001001rrrrr1111'],
            'RCALL': ['k', '1101kkkkkkkkkkkk'], // this one needs 2's comp too
            'RET': ['1001010100001000'],
            'RJMP': ['k', '1100kkkkkkkkkkkk'], // this one needs 2's comp too
            'ROL': null,
            'ROR': ['d', '1001010ddddd0111'],
            'SBC': ['d', 'r', '000010rdddddrrrr'],
            'SBCI': ['d', 'K', '0100KKKKddddKKKK'],
            'SBI': ['A', 'b', '10011010AAAAAbbb'],
            'SBIW': null,
            'SBR': ['d', 'K', '0110KKKKddddKKKK'],
            'SBRC': ['r', 'b', '1111110rrrrr0bbb'],
            'SBRS': ['r', 'b', '1111111rrrrr0bbb'],
            'SEC': ['1001010000001000'],
            'SEH': ['1001010001011000'],
            'SEI': ['1001010001111000'],
            'SEN': ['1001010000101000'],
            'SER': ['d', '11101111dddd1111'],
            'SES': ['1001010001001000'],
            'SET': ['1001010001101000'],
            'SEV': ['1001010000111000'],
            'SEZ': ['1001010000011000'],
            'ST': null,
            'STD': null,
            'STS': ['k', 'r', '1001001rrrrr0000kkkkkkkkkkkkkkkk'],
            'SUB': ['d', 'r', '000110rdddddrrrr'],
            'SUBI': ['d', 'K', '0101KKKKddddKKKK'],
            'SWAP': ['d', '1001010ddddd0010'],
            'TST': null,
            'XCH': ['Z', 'd', '1001001ddddd0100']
        };

        this.operands = new Operands();
        this.inst_set = new InstructionSet();
        this.opcode = this.makeOpcode();
    }

    twosComp(number, digits) {

        if (number >= 0) return this.binLenDigits(number, digits);

        let b = (1 << (digits - 1)) + number;   // 2 ** (digits - 1) + number
        b = b.toString(2);

        // Remove digits from the front if it's too long
        if (b.length >= digits) return b.slice(b.length - digits);

        // Add digits to the front if it's too short
        const ones = digits - b.length;
        return '1'.repeat(ones) + b;
    }

    binLenDigits(number, digits) {
        let b = number.toString(2);
        // Remove digits from the front if it's too long
        if (b.length >= digits) return b.slice(b.length - digits);
        const zeros = digits - b.length; // Add digits to the front if it's too short
        return '0'.repeat(zeros) + b;
    }

    countElements(string, symbol) {
        return string.split(symbol).length - 1;
    }

    makeOpcode() {
        const inst = this.inst.getValue();
        const opcode_requirements = this.all_opcodes[inst];
        // If it's a simple opcode
        if (opcode_requirements !== null) {
            // Return the opcode if it's always the same opcode
            if (opcode_requirements.length === 1) return opcode_requirements[0];

            let opcode = opcode_requirements[opcode_requirements.length - 1];

            // GO THROUGH EACH ARGUMENT AND SYMBOL ASSOCIATED WITH IT AND REPLACE THEM IN THE GIVEN OPCODE
            for (let arg_num = 0; arg_num < this.args.length; arg_num++) {
                const symbol = opcode_requirements[arg_num];                //  the symbol for replacing in the opcode e.g. 'd'
                const digit_count = this.countElements(opcode, symbol);     // number of digits the argument takes up in the opcode
                
                if (digit_count === 0) continue;                            // skip if it's an argument that doesnt matter (like Z in XCH)

                const arg = this.args[arg_num].getValue();                  // the argument value
                const is_relative = this.inst_set.isRelativeControlFlowInstruction(this.inst.getValue());
                
                // either 2's comp, in functions, or just normal
                const functions = new Functions();
                const var_value = is_relative ? this.twosComp(arg, digit_count) : functions.isFunction(arg) ? '1111111111111111111111' : this.binLenDigits(arg, digit_count);

                for (let i = 0; i < digit_count; i++) {
                    opcode = opcode.replace(symbol, var_value[i], 1);
                }
            }

            return opcode;
        }

        // Else if it's a more tricky opcode

        let d, r, K, w, q;

        if (inst === 'ADIW') {
            d = this.binLenDigits(((this.args[0].getValue() / 2) - 12), 2);
            K = this.binLenDigits(this.args[1].getValue(), 6);
            return `10010110${K.slice(0, 2)}${d}${K.slice(2)}`;
        } else if (inst === 'CBR') {
            d = this.binLenDigits(this.args[0].getValue(), 4);
            K = this.binLenDigits((0xff - this.args[1].getValue()), 8);
            return `0111${K.slice(0, 4)}${d}${K.slice(4)}`;
        } else if (inst === 'CLR') {
            d = this.binLenDigits(this.args[0].getValue(), 5);
            return `001001${d.slice(0, 1)}${d}${d.slice(1)}`
        } else if (inst === 'LD') {
            d = this.binLenDigits(this.args[0].getValue(), 5);
            w = this.args[1].getValue();
            if (w === 'X') {
                return `1001000${d}1100`;
            } else if (w === 'X+') {
                return `1001000${d}1101`;
            } else if (w === '-X') {
                return `1001000${d}1110`;
            } else if (w === 'Y') {
                return `1000000${d}1000`;
            } else if (w === 'Y+') {
                return `1001000${d}1001`;
            } else if (w === '-Y') {
                return `1001000${d}1010`;
            } else if (w === 'Z') {
                return `1000000${d}0000`;
            } else if (w === 'Z+') {
                return `1001000${d}0001`;
            } else if (w === '-Z') {
                return `1001000${d}0010`;
            }
        } else if (inst === 'LDD') {
            d = this.binLenDigits(this.args[0].getValue(), 5);
            w = this.args[1].getValue().slice(0, 1);
            q = this.binLenDigits(parseInt(this.args[1].getValue().slice(2)), 6);
            if (w === 'Y') {
                return `10${q.slice(0, 1)}0${q.slice(1, 3)}0${d}1${q.slice(3)}`;
            } else if (w === 'Z') {
                return `10${q.slice(0, 1)}0${q.slice(1, 3)}0${d}0${q.slice(3)}`;
            }
        } else if (inst === 'LPM') {
            if (this.getArgs().length === 0) {
                return '1001010111001000';
            }
            w = this.args[1].getValue();
            d = this.binLenDigits(this.args[0].getValue(), 5);
            if (w === 'Z') {
                return `1001000${d}0100`;
            } else if (w === 'Z+') {
                return `1001000${d}0101`;
            }
        } else if (inst === 'LSL') {
            d = this.binLenDigits(this.args[0].getValue(), 5);
            return `000011${d.slice(0, 1)}${d}${d.slice(1)}`
        } else if (inst === 'MOVW') {
            d = this.binLenDigits((this.args[0].getValue() / 2), 4);
            r = this.binLenDigits((this.args[1].getValue() / 2), 4);
            return `00000001${d}${r}`;
        } else if (inst === 'ROL') {
            d = this.binLenDigits(this.args[0].getValue(), 5);
            return `000111${d.slice(0, 1)}${d}${d.slice(1)}`
        } else if (inst === 'SBIW') {
            d = this.binLenDigits(((this.args[0].getValue() / 2) - 12), 2);
            K = this.binLenDigits(this.args[1].getValue(), 6);
            return `10010111${K.slice(0, 2)}${d}${K.slice(2)}`;
        } else if (inst === 'ST') {
            r = this.binLenDigits(this.args[1].getValue(), 5);
            w = this.args[0].getValue();
            if (w === 'X') {
                return `1001001${r}1100`;
            } else if (w === 'X+') {
                return `1001001${r}1101`;
            } else if (w === '-X') {
                return `1001001${r}1110`;
            } else if (w === 'Y') {
                return `1000001${r}1000`;
            } else if (w === 'Y+') {
                return `1001001${r}1001`;
            } else if (w === '-Y') {
                return `1001001${r}1010`;
            } else if (w === 'Z') {
                return `1000001${r}0000`;
            } else if (w === 'Z+') {
                return `1001001${r}0001`;
            } else if (w === '-Z') {
                return `1001001${r}0010`;
            }
        } else if (inst === 'STD') {
            r = this.binLenDigits(this.args[1].getValue(), 5);
            w = this.args[0].getValue().slice(0, 1);
            q = this.binLenDigits(parseInt(this.args[0].getValue().slice(2)), 6);
            if (w === 'Y') {
                return `10${q.slice(0, 1)}0${q.slice(1, 3)}1${r}1${q.slice(3)}`;
            } else if (w === 'Z') {
                return `10${q.slice(0, 1)}0${q.slice(1, 3)}1${r}0${q.slice(3)}`;
            }
        } else if (inst === 'TST') {
            d = this.binLenDigits(this.args[0].getValue(), 5);
            return `001000${d.slice(0, 1)}${d}${d.slice(1)}`
        }
    }

    toString(base) {
        // Always display numbers in base 10
        const inst = this.inst.getValue();
        const argsLen = this.args.length;

        
        if (argsLen === 0) {
            return inst;
        }

        
        let arg1 = this.args[0].getValue();

        if (this.operands.getInstructionArg(inst, 0).getTokenType().includes('REG')) {
            arg1 = `R${arg1}`;
        }

        else if (this.args[0].getType() === 'INT') {
            arg1 = arg1.toString(base);
        }

        if (argsLen === 1) {
            return `${inst} ${arg1}`;
        }

        let arg2 = this.args[1].getValue();

        if (this.operands.getOperands(inst)[1].getTokenType().includes('REG')) {
            arg2 = `R${arg2}`;
        }

        else if (this.args[1].getType() === 'INT') {
            arg2 = arg2.toString(base);
        }

        return `${inst} ${arg1}, ${arg2}`;
    }

    getOpcode() {
        return this.opcode;
    }

    getInst() {
        return this.inst;
    }

    getArgs() {
        return this.args
    }

}

class Lexer {
    constructor() {
        this.math = new MathTokens();
        this.directives = new Directives();
        this.patterns = [
            [/^;.*$/, null],                    // comments
            [/^\s+/, null],                     // whitespace
            [/^\.(section|text|data|global|end)/, 'DIR'],      // directives
            [/^\.(byte|word|string|ascii|asciz|space|equ|set)/, 'DIR'],      // directives
            [/^[\w_\.]{1}[^;\s,\.]*:/, 'LABEL'],    // labels
            [/^lo8(?=[(])/, 'LO8'],             // lo8
            [/^LO8(?=[(])/, 'LO8'],             // lo8
            [/^hi8(?=[(])/, 'HI8'],             // hi8
            [/^HI8(?=[(])/, 'HI8'],             // hi8
            [/^[rR]\d+(?=[,;\s])/, 'REG'],      // registers
            [/^-{0,1}0[xX][\dA-Fa-f]+/, 'INT'], // numbers CAN BE EXPRESSIONS?
            [/^-{0,1}\$[\dA-Fa-f]+/, 'INT'],    // numbers
            [/^-{0,1}0[oO][0-7]+/, 'INT'],      // numbers
            [/^-{0,1}0[bB][01]+/, 'INT'],       // numbers
            [/^-{0,1}\d+/, 'INT'],              // numbers
            [/^[a-zA-Z]{2,6}/, 'INST'],         // instructions → CAN TURN REFS USED IN AN INSTRUCTION INTO INST TYPE
            [/^\".*?\"/, 'STR'],                // string
            [/^\'.*?\'/, 'STR'],                // string
            [/^“.*?”/, 'STR'],                  // string
            [/^‘.*?’/, 'STR'],                  // string
            // [/^\.[^\.\s]+/, 'DIR'],          // directives. .ORG WORKS WHAT OTHER DIRECTIVES? NO DEF no UNDEF
            // [/^\.[\w\.]+(?=[;\s])/, 'DIR'],      // directives
            [/^[YZ][ \t]*\+[ \t]*\d{1,2}/, 'WORDPLUSQ'],        // word+q
            [/^[X][ \t]*\+[ \t]*\d{1,2}/, 'XPLUSQ'],            // X+q
            [/^[XYZ]\+/, 'WORDPLUS'],           // word+
            [/^-[XYZ]/, 'MINUSWORD'],           // -word
            [/^[XYZ]/, 'WORD'],                 // word
            [/^,/, 'COMMA'],                    // comma
            [/^\(/, 'LPAR'],                    // left parenthesis
            [/^\)/, 'RPAR'],                    // right parenthesis
            [/^\+/, 'PLUS'],                    // plus
            [/^-/, 'MINUS'],                    // minus
            [/^\*/, 'TIMES'],                   // times
            [/^\//, 'DIV'],                     // div
            [/^\&{2}/, 'LOGAND'],               // logical and
            [/^\&{1}/, 'BITAND'],               // bitwise and
            [/^\|{2}/, 'LOGOR'],                // logical or
            [/^\|{1}/, 'BITOR'],                // bitwise or
            [/^\^/, 'BITXOR'],                  // bitwise xor
            [/^~/, 'BITNOT'],                   // bitwise not
            [/^!=/, 'NEQ'],                     // not equal
            [/^!/, 'LOGNOT'],                   // logical not
            [/^>=/, 'GEQ'],                     // greater than or equal to
            [/^<=/, 'LEQ'],                     // greater than or equal to
            [/^==/, 'DEQ'],                     // double equal
            [/^>{2}/, 'RSHIFT'],                // right shift
            [/^<{2}/, 'LSHIFT'],                // left shift
            [/^>{1}/, 'GT'],                    // greater than
            [/^<{1}/, 'LT'],                    // less than
            [/^=/, 'EQ'],                       // equal (assignment)
            [/^[^\w\s;\.]+/, 'SYMBOL'],         // symbols
            [/^[^\s\d]{1}[\w\d_]*/, 'REF']      // references (like labels used in an instruction)
        ];
    }

    newData(text) {
        this.text = text;
        this.code_arr = text.split('\n');
        this.tokens = [];
        this.line_tokens = [];
        this.line_number = 0;
        this.line = '';
        this.pos = 0;
        this.match = null;
        this.current_tok = null;
        this.current_type = null;
        this.current_value = null;

        this.tokenize();
    }

    tokenize() {
        /**
         * Takes the code as raw text and returns the tokens as a list of
         * lists where each list is a single line as its tokens.
         */

        // TODO: = does the same as .equ
        // TODO: can use variables as int or reg

        // Go over every line of code and move through the line making tokens
        for (this.line_number = 0; this.line_number < this.code_arr.length; this.line_number++) {
            this.tokenizeLine();
            this.fixBadTokens();

            if (this.line_tokens.length !== 0) {           // Add to the tokens list if the line isnt empty
                this.tokens.push(this.line_tokens);
            }

        }

    }

    tokenizeLine() {
        // Creates tokens from a line

        this.pos = 0;
        this.line = this.code_arr[this.line_number] + ' ';
        this.line_tokens = [];

        // Iterate over the input code, finding matches for each token type
        while (this.pos < this.line.length) {
            this.getMatch();
            this.pos += this.match[0].length;
        }
    }

    getMatch() {
        // Check all the valid regex token patterns to see if a token can be made

        this.match = null;

        for (let i = 0; i < this.patterns.length; i++) {
            const [regex, tag] = this.patterns[i];
            this.match = regex.exec(this.line.slice(this.pos));

            if (!this.match) continue;

            this.createNewToken(tag);
            return;
        }

        if (!this.match) {
            this.newError(`Invalid syntax on line ${this.line_number + 1} starting at position ${this.pos}.`);
        }
    }

    createNewToken(tag) {
        if (!tag) return;

        const token = new Token(tag, this.match[0], `${this.line_number + 1}:${this.pos + 1}`);
        this.line_tokens.push(token);
    }

    fixBadTokens() {
        // Fixes any bad tokens (like REFs being INST tokens)

        let i = 0;
        while (i < this.line_tokens.length) {
            this.getCurrentToken(i);

            // Turn REG:Rn into REG:n
            if (this.current_type === 'REG') {
                this.setCurrentTokenValue(parseInt(this.current_value.substring(1)));
            }

            // Turn bad 'INST' back into 'REF' (unless it's actually an instruction behind a label)
            else if (i > 0 && this.current_type === 'INST' && !(i === 1 && this.line_tokens[i - 1].getType() === 'LABEL')) {
                this.setCurrentTokenType('REF');
            }

            if (this.current_type === 'LABEL') {
                this.setCurrentTokenValue(this.current_value.slice(0, (this.current_value.length - 1)).trim()); // remove the colon at the end
            }

            else if (this.current_type === 'DIR') {
                if (!this.directives.isDirective(this.current_value.toUpperCase())) {
                    this.newError(`Invalid directive \'${this.current_value}\'.`);
                }
                this.setCurrentTokenValue(this.current_value.toUpperCase());
            }

            // If both the current and previous tokens should be 1 REF token combine them
            if (i > 0 && !['COMMA', 'SYMBOL'].includes(this.current_type) && !this.math.isValidSymbol(this.current_type) && this.line_tokens[i - 1].getType() === 'REF') {
                this.line_tokens[i - 1].setValue(this.line_tokens[i - 1].getValue() + this.current_value);
                this.line_tokens.splice(i, 1); // Virtually advancing
                i -= 1;
                this.getCurrentToken(i);
            }

            // Check INST and make upper case
            if (this.current_type === 'INST') {
                this.setCurrentTokenValue(this.current_value.toUpperCase()); // make all directives upper case
            }

            // Check REG are valid numbers
            else if (this.current_type === 'REG') {
                if (this.current_value > 31) {
                    this.newError(`Illegal register \'R${this.current_value}\' on line ${this.current_tok.getLine()}.`);
                }
            }

            // Convert integers to base 10
            else if (this.current_type === 'INT') {

                let int_value = 0;

                // Remove negative and store as multiplier for down the bottom of the function
                let neg = 1;
                if (this.current_value.includes('-')) {
                    neg = -1;
                    this.setCurrentTokenValue(this.current_value.slice(1));
                }

                // this line is technically irrelevant since parseInt deals with 0x already
                if (this.current_value.includes('x') || this.current_value.includes('X')) {
                    int_value = parseInt(this.current_value.slice(2), 16);
                }

                else if (this.current_value.includes('$')) {
                    int_value = parseInt(this.current_value.slice(1), 16);
                }

                else if (this.current_value.includes('o') || this.current_value.includes('O')) {
                    int_value = parseInt(this.current_value.slice(2), 8);
                }

                else if (this.current_value.includes('b') || this.current_value.includes('B')) {
                    int_value = parseInt(this.current_value.slice(2), 2);
                }

                else {
                    int_value = parseInt(this.current_value);
                }

                this.setCurrentTokenValue(neg * int_value);
            }

            i += 1;
        }
    }

    getCurrentToken(n) {
        this.current_tok = this.line_tokens[n];
        this.current_type = this.current_tok.getType();
        this.current_value = this.current_tok.getValue();
    }

    setCurrentTokenValue(v) {
        this.current_tok.setValue(v);
        this.current_value = v;
    }

    setCurrentTokenType(t) {
        this.current_tok.setType(t);
        this.current_type = t;
    }

    getText() {
        return this.text;
    }

    getTokens() {
        return this.tokens;
    }
    
    toString() {
        let s = '';
        let line;
        for (let l = 0; l < this.tokens.length; l++) {
            line = this.tokens[l];
            for (let tok = 0; tok < line.length; tok++) {
                s += line[tok].toString() + '\n';
            }
        }
        return s;
    }

    newError(text) {
        document.getElementById('error').innerHTML = text;
        document.getElementById('output').innerHTML = null;
        document.getElementById('status').innerHTML = null;
        throw new SyntaxError(text);
    }

}

class ExpressionEvaluator {
    constructor() {
        this.line = null;
        this.evaluation = null;
        this.expression = '';
        this.expression_start = null;
        this.current_tok = null;
        this.last_tok = null;
        this.tok_type = null;
        this.tok_value = null;
        this.index = 0;
        this.math = new MathTokens();
    }

    evaluateNewLine(line) {
        this.line = line;
        this.expression = '';
        this.evaluateLineExpressions();
        return this.line;
    }

    evaluateLineExpressions() {
        // Evaluate all expressions in the line
        
        this.index = 0;
        while (this.index < this.line.length) {
            this.setCurrentToken();

            // Add the the expression
            if (this.math.isValidType(this.tok_type)) {
                this.addTokenToExpression();
            }

            // Evaluate then reset expression to empty
            else if (this.expression.length > 0) {
                this.evaluateExpression();
                this.resetExpression();
            }

            this.last_tok = this.line[this.index];
            this.index += 1;
        }

        if (this.expression.length == 0) return;
        
        // Evaluate final expression
        this.evaluateExpression();
    }

    setCurrentToken() {
        this.current_tok = this.line[this.index];
        this.tok_type = this.current_tok.getType();
        this.tok_value = this.current_tok.getValue();
    }

    addTokenToExpression() {
        if (this.expression.length === 0) this.expression_start = this.index;

        else if (this.last_tok.getType() === 'INT' && this.tok_type === 'INT' && this.tok_value >= 0) {
            this.newError(`Cannot evaluate expression on line ${current_tok.getLine()} beginning at position ${this.line[this.expression_start].getStart()}`);
        }

        this.expression += this.tok_value;
    }

    resetExpression() {
        this.expression = '';       // reset the expression
        this.index = this.expression_start;
    }

    evaluateExpression() {
        try {
            this.evaluation = eval(this.expression);    // evaluate
        } catch (error) {
            this.newError(`${error.message} on line ${this.current_tok.getLine()} beginning at position ${this.line[this.expression_start].getStart()}`);
        }

        if (this.evaluation === true) this.evaluation = 1;

        this.evaluation = Math.floor(this.evaluation);
        this.simplifyLine();
    }

    simplifyLine() {
        const new_tok = new Token('INT', this.evaluation, this.line[this.expression_start].getLocation());     // make new token
        this.line.splice(this.expression_start, this.index - this.expression_start, new_tok);                  // replace the expression with the token
    }

    newError(text) {
        document.getElementById('error').innerHTML = text;
        document.getElementById('output').innerHTML = null;
        document.getElementById('status').innerHTML = null;
        throw new SyntaxError(text);
    }
}

class Parser {
    
    constructor() {
        this.token_lines = [];
        this.pmem = [];
        this.dmem = [];

        // DEFINING THE SIZE OF DMEM AND PMEM
        this.ramend = 0x8FF;
        this.flashend = 0x3FFF;
        this.evaluator = new ExpressionEvaluator();
        this.operands = new Operands();
        this.inst_set = new InstructionSet();
        this.functions = new Functions();

    }

    newData(token_lines, txt) {
        this.token_lines = token_lines;
        this.txt = txt;
        this.lines = this.txt.split('\n');

        this.labels = Object.create(null);
        this.defs = Object.create(null);
        this.equs = Object.create(null);

        this.break_point = null;    // for stopping the interpreter run() method at
        this.break_point_line = parseInt(document.getElementById('break_point').value);

        this.text_section_start = null;
        this.line = null;
        this.line_in_file = null;
        this.line_length = null;
        this.current_tok = null;
        this.line_num = 0;
        this.tok_num = 0;
        this.pc = 0;

        this.dmem = [];
        // Add registers to dmem
        for (let i = 0; i < 256; i++) {
            let reg = new Register(`R${i}`);
            this.dmem.push(reg);
        }

        this.pmem = [];

        this.parse();

        // FILLING IN DMEM WITH 0s
        for (let i = this.dmem.length; i < (this.ramend + 1); i++) {
            this.dmem.push(0);
        }

        // FILLING IN PMEM WITH NOP INSTRUCTIONS
        for (let i = this.pmem.length; i < (this.flashend + 1); i++) {
            this.pmem.push(new Instruction([new Token('INST', 'NOP')]));
        }
        
    }

    parse() {
        /*
        * Parses the tokens given in the initialization of
        * the parser. The parser raises an error if there
        * is invalid syntax, otherwise it prepares the tokens
        * to be read by an interpreter and returns None.
        */

        //////////////////////////////////////////////
        ////////// CHECK SECTION DIRECTIVES //////////
        //////////////////////////////////////////////

        this.checkSectionDirectives();

        //////////////////////////////////////////////
        //////////////// CHECK TOKENS ////////////////
        //////////////////////////////////////////////

        // Check all instructions are valid instructions
        this.validateInstructions();

        //////////////////////////////////////////////
        //////////////// DATA SECTION ////////////////
        //////////////////////////////////////////////

        // Check data section exists

        this.defineVars();

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Fill in text section info and nulls, etc
        
        
        /* // Add 83 NOPs to pmem, since that's where the file starts
        const pmem_initial_value = 0; // can set to 83 for "realistic" location
        for (let i = 0; i < pmem_initial_value; i++) {
            this.pmem.push(new Instruction([new Token('INST', 'NOP')]));
        }
        */
        
        this.checkGlobalAtStart();
        
        this.createPMEM(); // create PMEM andget the label locations
        
        this.checkGlobalFunctions();

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        this.checkDataSection();

        // Should be at .SECTION .text line now

        //////////////////////////////////////////////
        //////////////// TEXT SECTION ////////////////
        //////////////////////////////////////////////

        this.checkInstructionSyntax();
    }

    newLabel(label, value, line_in_file) {
        if ( this.labels[label] !== undefined ) {
            this.newError(`Previous definition of \'${label}\'. Duplicate label \'${label}\' on line ${line_in_file}.`);
        }

        if ( this.equs[label] !== undefined ) {
            this.newError(`Previous definition of \'${label}\'. Illegal attempt to re-use \'${label}\' as label on line ${line_in_file}.`);
        }

        if ( this.defs[label] !== undefined ) {
            this.newError(`Previous definition of \'${label}\'. Illegal use of register \'${label}\' as label on line ${line_in_file}.`);
        }
        
        if (this.inst_set.isInstruction(this.labels[label])) {
            this.newError(`Illegal re-use of instruction \'${label}\' as label on line ${line_in_file}.`);
        }

        this.labels[label] = value;
    }

    newEqu(label, value, line_in_file) {
        if ( this.labels[label] !== undefined ) {
            this.newError(`Previous definition of \'${label}\'. Invalid redefinition of label \'${label}\' as variable on line ${line_in_file}.`);
        }

        // Allow redefinition of variables already in this.equs

        if ( this.defs[label] !== undefined ) {
            this.newError(`Previous definition of \'${label}\'. Illegal use of register \'${label}\' as variable on line ${line_in_file}.`);
        }
        
        if (this.inst_set.isInstruction(this.labels[label])) {
            this.newError(`Attempt to redefine keyword \'${label}\' on line ${line_in_file}.`);
        }

        this.equs[label] = value;
    }

    newDef(label, value, line_in_file) {
        // If its already a label or .equ
        if ( this.labels[label] !== undefined || this.equs[label] !== undefined ) {
            this.newError(`Previous definition of \'${label}\'. Cannot use .def: ${label} redefinition on line ${line_in_file}.`);
        }

        // Allow redefinition of defs already in this.defs

        // Dont allow definitions that are already instructions
        
        if (this.inst_set.isInstruction(this.labels[label])) {
            this.newError(`Illegal re-use of instruction \'${label}\' as definition on line ${line_in_file}.`);
        }

        this.defs[label] = value;
    }

    replaceRefs(line) {
        let current_tok;
        // Go through the tokens once first and replace refs with ints
        for (let i = 0; i < line.length; i++) {
            current_tok = line[i];
            if (current_tok.getType() === 'REF') this.setRefToInt(current_tok);
        }
    }

    replaceDirectiveRefs() {
        if (['.BYTE','.WORD', '.SPACE'].includes(this.line_directive)) this.replaceRefs(this.line);
        else if (['.SET','.EQU'].includes(this.line_directive)) this.replaceRefs(this.line.slice(2));        
        else return;

        this.evaluateCurrentLine(); 
    }

    setRefToInt(current_tok) {
        // Replace it in the line
        if (this.labels[current_tok.getValue()] !== undefined) current_tok.setValue(this.labels[current_tok.getValue()]);
        else if (this.equs[current_tok.getValue()] !== undefined) current_tok.setValue(this.equs[current_tok.getValue()]);
        else this.newError(`Invalid reference \'${current_tok.getValue()}\' on line ${this.line_in_file}.`);

        current_tok.setType('INT');
    }

    evaluateCurrentLine() {
        this.line = this.evaluator.evaluateNewLine(this.line);
    }

    getTokenLines() {
        return this.token_lines;
    }

    hi8(val) {
        return (val >> 8) & 0xff;
        // return parseInt((val - (val % 0x100)) / 0x100);
    }

    lo8(val) {
        return val & 0xff;
        // return (val % 0x100);
    }

    getLine(line_num) {
        // sets the relevant line parameters
        this.line = this.token_lines[line_num];
        this.line_length = this.line.length;
        this.line_in_file = this.line[0].getLine();
    }

    checkSectionDirectives() {
        this.checkFirstLine();
        this.checkLastLine();
        this.findTextSectionStart();
    }

    checkFirstLine() {
        const first_line = this.token_lines[0];

        // Check if first line is a .SECTION directive
        if (first_line[0].getType() !== 'DIR' || first_line[0].getValue() !== '.SECTION') {
            this.newError("First line must be a '.section' directive");
        }

        // Check if the first line is correct length and directives
        if (first_line.length !== 2 || first_line[1].getType() !== 'DIR' || !['.DATA', '.TEXT'].includes(first_line[1].getValue())) {
            this.newError("First line must be '.section .data' or '.section .text'");
        }
    }

    checkLastLine() {
        // Check if last line is .end
        const last_line = this.token_lines[this.token_lines.length - 1];
        if (last_line.length > 1 || last_line[0].getType() !== 'DIR' || last_line[0].getValue() !== '.END') {
            this.newError("Final line must be '.end'");
        }
    }

    findTextSectionStart() {
        for (this.line_num = 0; this.line_num < this.token_lines.length; this.line_num++) {
            this.getLine(this.line_num);

            // If you find a .SECTION directive check it
            if (this.line[0].getValue() === '.SECTION' && this.line[0].getType() === 'DIR') {
                
                if (this.line.length !== 2 || this.line[1].getType() !== 'DIR' || !['.DATA', '.TEXT'].includes(this.line[1].getValue())) {
                    this.newError(`Invalid '.section' directive on line ${this.line_in_file}.`);
                }

                // If you find the text section then stop looking
                if (this.line[1].getValue() === '.TEXT') {
                    this.text_section_start = this.line_num;
                    break;
                }
            }
        }

        // If there's no text section, raise an error
        if (this.text_section_start === null) {
            this.newError("File must contain a '.section .text'");
        }
    }

    validateInstructions() {
        let current_tok;
        for (this.line_num = 0; this.line_num < this.token_lines.length; this.line_num++) {
            this.getLine(this.line_num);

            // Go through each token
            for (this.tok_num = 0; this.tok_num < this.line_length; this.tok_num++) {
                current_tok = this.line[this.tok_num];

                // Check INST are valid
                if (current_tok.getType() === 'INST' && !this.inst_set.isInstruction(current_tok.getValue())) { // check if the token is a valid instruction
                    this.newError(`Invalid instruction \'${current_tok.getValue()}\' on line ${this.line_in_file}.`);
                }
            }
        }
    }

    defineVars() {
        this.defineDefs();   // Create pre-existing definitions
        this.defineEqus();   // Create pre-existing equs
    }

    defineDefs() {
        // Create pre-existing definitions
        const existing_defs = {
            'ZH': 31,
            'ZL': 30,
            'YH': 29,
            'YL': 28,
            'XH': 27,
            'XL': 26
        };

        for (let [key, value] of Object.entries(existing_defs)) {
            this.newDef(key, value, 0);
        }
    }

    defineEqus() {
        // Create pre-existing equs
        const existing_equs = {
            'SREG': 0x3f,
            'SPL': 0x3d,
            'SPH': 0x3e,
            'SPMCSR': 0x37,
            'MCUCR': 0x35,
            'MCUSR': 0x34,
            'SMCR': 0x33,
            'ACSR': 0x30,
            'SPDR': 0x2e,
            'SPSR': 0x2d,
            'SPCR': 0x2c,
            'GPIOR2': 0x2b,
            'GPIOR1': 0x2a,
            'OCR0B': 0x28,
            'OCR0A': 0x27,
            'TCNT0': 0x26,
            'TCCR0B': 0x25,
            'TCCR0A': 0x24,
            'GTCCR': 0x23,
            'EEARH': 0x22,
            'EEARL': 0x21,
            'EEDR': 0x20,
            'EECR': 0x1f,
            'GPIOR0': 0x1e,
            'EIMSK': 0x1d,
            'EIFR': 0x1c,
            'PCIFR': 0x1b,
            'TIFR2': 0x17,
            'TIFR1': 0x16,
            'TIFR0': 0x15,
            'PORTD': 0x0b,
            'DDRD': 0x0a,
            'PIND': 0x09,
            'PORTC': 0x08,
            'DDRC': 0x07,
            'PINC': 0x06,
            'PORTB': 0x05,
            'DDRB': 0x04,
            'PINB': 0x03,
            'PORTA': 0x02,
            'DDRA': 0x01,
            'PINA': 0x00,
        };

        //const existing_equs = {};

        for (let [key, value] of Object.entries(existing_equs)) {
            this.newEqu(key, value, 0);
        }
    }

    checkGlobalAtStart() {
        this.getLine(this.text_section_start + 1);
        if (this.line_length !== 2 || this.line[0].getValue() !== '.GLOBAL') {
            this.newError(`Must begin text section with a valid .global directive: line ${this.line_in_file}.`);
        }
        this.global_funct_names = [this.line[1].getValue()];        // the name of the global function for later
    }

    createPMEM() {
        this.line_num = this.text_section_start + 2;
        // CREATE PMEM AND GET THE LABEL LOCATIONS
        while (this.line_num < (this.token_lines.length - 1)) {

            this.getLine(this.line_num);
            this.removeLabels('pmem'); // Check for labels and remove them

            if (this.line_length === 0) {
                this.line_num += 1;
                continue;
            }

            let skip = this.defineGlobalFunctions();    //
            if (skip) continue;

            // If theyre not instructions, it's illegal
            if (this.line[0].getType() !== 'INST') this.newError(`Illegal token \'${this.line[0].getValue()}\' on line ${this.line_in_file}.`);

            // set the break point to be the line equal about to be put in
            if (this.break_point_line !== NaN) this.defineBreakPoint();

            this.addToPMEM();
            
            this.line_num += 1;
        }

        if (this.pmem.length > this.flashend) this.newError(`Too many lines of code to put into the program memory in the .text section.`);
    }

    removeLabels(mem) {
        const len = (mem == 'pmem') ? this.pmem.length : this.dmem.length;
        this.tok_num = 0;
        // Check for labels and remove them
        while (this.tok_num < this.line_length) {

            this.current_tok = this.line[this.tok_num]; // current token

            if (this.current_tok.getType() !== 'LABEL') {
                this.tok_num += 1;
                continue;
            }
            
            this.popLabel(len);
            
        }

        this.tok_num = 0;
    }

    popLabel(len) {
        // Label can only be at the start
        if (this.tok_num !== 0) this.newError(`Illegal label location on line ${this.line_in_file}.`);

        const label = this.current_tok.getValue(); // remove the colon from the end
        this.newLabel(label, len, this.line_in_file);

        // Remove the label
        this.line.shift();
        this.line_length -= 1;                

        // Check the global function label when you get to it
        if (label === this.global_funct_names[0]) this.pc = this.pmem.length;
    }

    defineGlobalFunctions() {
        // Add global functions to the global function list
        if (this.line[0].getType() !== 'DIR' || this.line[0].getValue() !== '.GLOBAL') return false;

        if (this.getPMEM().length > 0) {
            this.newError(`Illegal .global directive on line ${this.line_in_file}.`);
        }

        if (this.line.length !== 2) {
            this.newError(`Incorrect number of arguments for .global directive on line ${this.line_in_file}.`);
        }

        if (this.line[1].getType() !== 'REF') {
            this.newError(`Illegal token type ${this.line[1].getType()} for the argument ${this.line[1].getValue()} on line ${this.line_in_file}.`);
        }

        this.global_funct_names.push(this.line[1].getValue());
        this.line_num += 1;
        return true;
        
    }

    defineBreakPoint() {
        // If the break point should be here set the break point to be the line about to be put in
        if (this.line_in_file >= this.break_point_line && this.break_point === null) this.break_point = this.pmem.length;
    }

    addToPMEM() {
        this.pmem.push(this.line); // set the line to the line without the label
        const inst = this.line[0].getValue();

        // Add null as next line if it's a 32 bit opcode
        if (['CALL', 'JMP', 'LDS', 'STS'].includes(inst)) this.pmem.push(null);
    }

    checkGlobalFunctions() {
        let global_funct_name;
        // Check you've found the global function name
        for (let i = 0; i < this.global_funct_names.length; i++) {
            global_funct_name = this.global_funct_names[i];
            if (this.labels[global_funct_name] === undefined) this.newError(`Cannot find the global label \'${global_funct_name}\' in the program. Check spelling if unsure.`);    
        }
    }

    checkInstructionSyntax() {
        ////////// CHECK INSTRUCTION SYNTAX
        // Skip None lines
        // Go through and check commas in right place (then remove them)
        // Check for real instruction
        // Check number of args given is correct
        // Check if the types for each token are correct and their values are acceptable
        for (this.line_num = 0; this.line_num < this.pmem.length; this.line_num++) {

            this.line = this.pmem[this.line_num];                     // the line up to

            if (this.line === null) continue;

            this.line_length = this.line.length;                                          // calculate number of tokens in the line
            this.line_in_file = this.line[0].getLine();    // the current line if there's an error

            this.evaluateLineExpressions(); // Evaluate all refs, hi8()/lo8(), and expressions

            // CHECK FOR COMMA AND REMOVE THEM IF THEYRE CORRECTLY PLACED
            if (this.line_length > 2) {

                // If the 3rd token is not a comma then its bad syntax
                if (this.line[2].getType() !== 'COMMA') {
                    this.newError(`Illegal token ${this.line[2].getValue()} on line ${this.line_in_file}: expecting comma.`);
                }

                this.line.splice(2, 1);                       // remove the comma
                this.line_length -= 1;                       // line is shorter by 1
            }

            const inst = this.line[0].getValue();            // instruction for that line

            // CHECK IT'S A REAL INSTRUCTION
            
            this.checkInstructionExists(inst);

            // GET GIVEN AND EXPECTED ARGUMENTS
            const expected_args = this.operands.getOperands(inst);   // the arguments we expect
            const given_args = this.line.slice(1);                   // the arguments we have

            if (inst === 'LPM' && given_args.length === 0) {
                // SET THE LINE TO AN INSTRUCTION
                this.pmem[this.line_num] = new Instruction(this.line);
                continue;
            }

            this.checkArguments(inst, given_args);

            // CHECK THE ARGUMENTS
            for (this.tok_num = 1; this.tok_num < this.line_length; this.tok_num++) {

                const given_arg = this.line[this.tok_num];          // given arg
                const exp_arg = expected_args[this.tok_num - 1];    // expected arg

                // CHECK THE TOKEN IS LEGAL
                exp_arg.isLegalToken(given_arg, this.line_in_file);
            }

            // SET THE LINE TO AN INSTRUCTION
            this.pmem[this.line_num] = new Instruction(this.line);
        }
    }

    checkArguments(instruction, given_arguments) {
        // CHECK IF IT'S GOT THE WRONG NUMBER OF ARGUMENTS
        if (this.operands.numArgs(instruction) === given_arguments.length) return;
        this.newError(`Wrong number of arguments given on line ${this.line_in_file} for the ${inst} instruction. Please refer to the instruction manual.`);
    }

    checkInstructionExists(inst) {
        if (this.operands.isDefined(inst)) return;
        this.newError(`Illegal instruction \'${inst}\' on line ${this.line_in_file}.`);
    }

    checkDataSection() {
        this.line_num = 0;
        const data_section_exists = (this.text_section_start !== 0);
        // GO THROUGH LINES IN DATA SECTION
        while (data_section_exists && (this.line_num < this.text_section_start)) {

            if (this.line_num === 0) {                               // skip if it's the .SECTION .data line
                this.line_num += 1;
                continue;
            }

            this.getLine(this.line_num);

            // DEAL WITH LABELS AT THE START OF THE LINE
            this.removeLabels('dmem');
            

            if (this.line_length === 0) {
                this.line_num += 1;
                continue;
            }
            
            // CHECK THE DIRECTIVE
            if (this.line[this.tok_num].getType() !== 'DIR') this.newError(`Illegal syntax \'${this.lines[this.line_in_file - 1]}\' for the data section. Expecting a directive on line ${this.line_in_file}.`);

            this.line_directive = this.line[this.tok_num].getValue();    // get the directive for this line to use below
            this.replaceDirectiveRefs();
            
            this.line_length = this.line.length; 
            this.tok_num += 1;                                       // Move to the next token in the line

            // EXECUTE THE DIRECTIVE
            this.executeDirectives();

            this.line_num += 1;
        }

        // Cannot hold more data than 0x8ff
        if (this.dmem.length > this.ramend) this.newError(`Too much data to put into the data memory in the .data section.`);
    }

    executeDirectives() {
        while (this.tok_num < this.line_length) {
            this.current_tok = this.line[this.tok_num];

            //const parity_of_tokens_left = (this.line_length - 1 - tok_num) & 1; // used for calculating comma placement
            const parity_of_current_tok = this.tok_num & 1;

            ///// EXECUTE THE DIRECTIVES /////

            // Byte directive
            if (parity_of_current_tok === 1 && ['.BYTE','.WORD'].includes(this.line_directive)) {

                if (this.current_tok.getType() !== 'INT') {
                    this.newError(`Bad token \'${this.current_tok.getValue()}\' on line ${this.line_in_file} at position ${this.current_tok.getStart()}.`);
                }
                this.dmem.push(this.lo8(this.current_tok.getValue()));
                if (this.line_directive === '.WORD') this.dmem.push(this.hi8(this.current_tok.getValue()));
            
            }

            // String, Ascii, Asciz directives
            else if (parity_of_current_tok === 1 && ['.STRING', '.ASCII', '.ASCIZ'].includes(this.line_directive)) {

                if (this.current_tok.getType() !== 'STR') {
                    this.newError(`Bad token \'${this.current_tok.getValue()}\' on line ${this.line_in_file}.`);
                }

                let string_text = this.current_tok.getValue();
                string_text = string_text.slice(1, (string_text.length - 1));   // remove quotation marks from either side

                let char_ascii_value;
                let char;

                let escape = false; // if the last char was an escape character 
                const escape_chars = {
                    '\\': 0x5c,
                    'n': 0x0a,
                    't': 0x09,
                    '\"': 0x22,
                    '\'': 0x27,
                    'r': 0x0d,
                    'a': 0x07,
                    'b': 0x08,
                    'f': 0x0c,
                    'v': 0x0b,
                    '0': 0x00
                }; // I have chosen not to add \o and \x for oct and hex numbers

                // Go through each character and add it's ascii code to the data
                for (let i = 0; i < string_text.length; i++) {
                    char = string_text[i];

                    if (!escape) {
                        char_ascii_value = char.charCodeAt(0); // get ascii code
                        
                        if (char === '\\') {
                            escape = true;
                            if (i + 1 === string_text.length) {
                                this.newError(`Invalid escape character \'${char}\' on line ${this.line_in_file}.`);
                            }
                            continue;
                        }
                    }

                    // Make the escape character ascii value
                    else {
                        // Check if it's a valid escape character
                        if (!Object.keys(escape_chars).includes(char)) {
                            this.newError(`Invalid escape character \'\\${char}\' on line ${this.line_in_file}.`);
                        }

                        char_ascii_value = escape_chars[char]; // get ascii code
                        escape = false;
                    }
                    
                    this.dmem.push(this.lo8(char_ascii_value));           // add to data
                }

                if (['.STRING', '.ASCIZ'].includes(this.line_directive)) this.dmem.push(0);                                  // add NULL to data
            }

            // Space directive
            else if (parity_of_current_tok === 1 && this.line_directive === '.SPACE') {

                if (this.current_tok.getType() !== 'INT') { // expecting integer
                    this.newError(`Bad token \'${this.current_tok.getValue()}\' on line ${this.line_in_file}.`);
                }

                // Check if it's the number of spaces or the content of the spaces
                // Check if the previous token is the directive
                // If so, it's the number of spaces

                if (this.line[this.tok_num - 1].getType() === 'DIR') {              // if this integer is the number of values

                    const number_of_spaces = this.current_tok.getValue();        // the number of spaces we're making

                    if ((this.tok_num + 1) === this.line_length) {                // if there is no space value given, make them 0
                        for (let i = 0; i < number_of_spaces; i++) {
                            this.dmem.push(0);                            // add 0's for as many spaces as needed
                        }
                    }
                }

                // Otherwise check it's the final token
                else if ((this.tok_num + 1) !== this.line_length) { // if it's the second argument given it must be the last
                    this.newError(`Too many arguments given for .string on line ${this.line_in_file}.`);
                }

                // If it is the final token
                else {
                    const space_value = this.current_tok.getValue();             // value of the spaces
                    const number_of_spaces = this.line[this.tok_num - 2].getValue();  // the number of spaces we're making
                    for (let i = 0; i < number_of_spaces; i++) {
                        this.dmem.push(this.lo8(space_value));                // add the value for as many spaces as needed
                    }
                }


            }

            else if (['.EQU','.SET'].includes(this.line_directive)) {

                // Check the number of arguments
                if ((this.line_length - this.tok_num) !== 3) { // if there's too many arguments
                    this.newError(`Wrong number of arguments given for .equ on line ${this.line_in_file}.`);
                }

                // if it's the 3rd last argument (expecting REF)
                if (this.current_tok.getType() !== 'REF') {
                    this.newError(`Bad argument \'${current_tok.getValue()}\' on line ${this.line_in_file}.`)
                }

                // Move to next token
                this.tok_num += 1;
                this.current_tok = this.line[this.tok_num];

                // Raise error if 2nd last token is not a comma
                if (this.current_tok.getType() !== 'COMMA') {
                    this.newError(`Bad argument \'${this.current_tok.getValue()}\' on line ${this.line_in_file}.`);
                }

                // Move to next token
                this.tok_num += 1;
                this.current_tok = this.line[this.tok_num];

                if (this.current_tok.getType() !== 'INT') {
                    this.newError(`Bad argument \'${this.current_tok.getValue()}\' on line ${this.line_in_file}.`);
                }

                const equ_word = this.line[this.tok_num - 2].getValue();  // get the equ name for the labels list
                this.newEqu(equ_word, this.current_tok.getValue(), this.line_in_file);
            }

            // Should be comma if there are even number of tokens left. Raise error.
            else if (parity_of_current_tok === 0 && this.current_tok.getType() !== 'COMMA') {
                this.newError(`Missing comma on line ${this.line_in_file} at position ${this.current_tok.getStart()}.`);
            }

            else if ((this.tok_num + 1 === this.line.length) && this.current_tok.getType() === 'COMMA') {
                this.newError(`Illegal comma on line ${this.line_in_file}  at position ${this.current_tok.getStart()}.`);
            }

            this.tok_num += 1;
        }
    }

    evaluateallLines() {
        for (this.line_num = 0; this.line_num < this.pmem.length; this.line_num++) {

            this.line = this.pmem[this.line_num];           // current line

            if (this.line === null) continue;

            this.line_length = this.line.length;            // calculate number of tokens in the line
            this.line_in_file = this.line[0].getLine();     // the current line if there's an error
            
            this.evaluateLineExpressions();
        }
    }

    evaluateLineExpressions() {
        // Replace refs according to the instruction
        for (this.tok_num = 0; this.tok_num < this.line_length; this.tok_num++) {
            this.current_tok = this.line[this.tok_num];

            let isRef = (this.current_tok.getType() === 'REF');
            let isHiLo = (['HI8', 'LO8'].includes(this.current_tok.getType()));

            // Replace hi8/lo8 with its value
            if (isHiLo) this.evaluateHiLo();
            
            // Replace REF with its value
            else if (isRef) this.evaluateRef();
        }

        this.evaluateCurrentLine();
    }

    evaluateHiLo() {
        const fnct = this.current_tok.getType(); // store the function name while you're pointed at it so you can use it later

        // Check there's enough room
        if (this.line.length <= this.tok_num + 3) {
            this.newError(`Bad syntax on line ${this.line_in_file}. Not enough tokens given for a valid ${this.current_tok.getType()} function.`); 
        }

        this.tok_num += 1;

        // Check the token we expect to be the left bracket
        if (this.line[this.tok_num].getType() !== 'LPAR') {
            this.newError(`Illegal ${this.current_tok.getValue()} left bracket on line ${this.line_in_file}.`);
        }

        this.tok_num += 1;

        const expr_start = this.tok_num;

        this.checkBracketsClose();

        this.replaceRefs(this.line.slice(expr_start, this.tok_num - 1));
        
        this.evaluateCurrentLine();

        this.tok_num = expr_start - 1;
        const val = this.line[this.tok_num].getValue();

        if (val > 0x7fffffff || val < -0x80000000) this.newError(`Error: bignum invalid on line ${this.line_in_file}. Cannot have a number outside of [-2^31, 2^31 - 1].`);

        // Convert the value to the hi8/lo8 value
        let int_value = (fnct === 'HI8') ? this.hi8(val) : this.lo8(val);

        this.line.splice(expr_start - 2, 2, new Token('INT', int_value, this.current_tok.getLocation()));
        this.tok_num = expr_start - 2;
        this.line_length = this.line.length;
    }

    evaluateRef() {
        let tok_type = 'INT';
        let tok_val = this.current_tok.getValue();

        const first_tok_val = this.line[0].getValue();  // first token in the line

        // If it's a non relative control flow instruction and it's not a function
        if (this.inst_set.isNonrelativeControlFlowInstruction(first_tok_val) && !this.functions.isFunction(tok_val)) {
            tok_val = this.labels[tok_val];      // Get k for label
        }

        // If it's a relative control flow instruction
        else if (this.inst_set.isRelativeControlFlowInstruction(first_tok_val)) {
            tok_val = this.labels[tok_val] - 1 - this.line_num;
        }

        // If it's in data labels
        else if (this.labels[tok_val] !== undefined) {
            tok_val = this.labels[tok_val];
        }

        // If it's a REG definition
        else if (this.defs[tok_val] !== undefined) {
            tok_type = 'REG';
            tok_val = this.defs[tok_val];
        }

        // If it's a REG definition
        else if (this.equs[tok_val] !== undefined) {
            tok_val = this.equs[tok_val];
        }

        // Check if it's a function call?
        else if (this.functions.isFunction(tok_val)) {
            return;
        }
        
        // If it's none of these and not a function, raise an error
        else if (!this.functions.isFunction(tok_val)) {
            this.newError(`Bad reference ${tok_val} on line ${this.line_in_file}.`);
        }

        this.current_tok.setType(tok_type);
        this.current_tok.setValue(tok_val);
    }

    checkBracketsClose() {
        let bracket_level = 1;
        
        // Find closing right bracket
        while (this.tok_num < this.line.length) {
            if (bracket_level === 0) break;
            
            this.current_tok = this.line[this.tok_num];
            bracket_level += (this.current_tok.getType() === 'LPAR') ? 1 : (this.current_tok.getType() === 'RPAR') ? -1 : 0;
            this.tok_num += 1;
        }

        if (bracket_level !== 0) this.newError(`Missing ')' on line ${this.line_in_file}.`);
    }

    getLineNumber() {
        return this.line_num;
    }

    setLineNumber(n) {
        this.line_num = n;
        this.getLine(this.line_num);
    }

    getPMEM() {
        return this.pmem;
    }

    getDMEM() {
        return this.dmem;
    }

    newError(text) {
        document.getElementById('error').innerHTML = text;
        document.getElementById('output').innerHTML = null;
        document.getElementById('status').innerHTML = null;
        throw new SyntaxError(text);
    }

}

// Also called simulator
class Interpreter {

    constructor() {
        this.emptyData();
        
    }

    emptyData() {
        this.pmem = [];
        this.dmem = [];
        this.sreg = new Token('REG', 0);
        this.pcl = new Token('REG', 0); // PC lo8
        this.pch = new Token('REG', 0); // PC hi8
        this.spl = new Token('REG', 0); // SP lo8
        this.sph = new Token('REG', 0); // SP hi8

        this.operands = new Operands();

        this.step_count = 0;
        this.cycles = 0;
        this.branches_taken = 0;
        this.branches_seen = 0;
        this.finished = false;
        this.error = false;
        this.error_text = '';
        this.break_point = null;
    }

    newData(pmem, dmem, txt, break_point) {
        // DATA & PROGRAM MEMORY
        this.pmem = pmem;
        this.dmem = dmem;
        this.txt = txt;
        this.break_point = break_point;

        this.lines = this.txt.split('\n');
        this.finished = false;
        this.error = false;
        this.error_text = '';
        this.step_count = 0;
        this.cycles = 0;
        this.branches_taken = 0;
        this.branches_seen = 0;

        // DEFINING PC, SP AND SREG
        this.pcl = new Register('PCL', this.dmem[0x5B].getValue(), 0);
        this.pch = new Register('PCH', this.dmem[0x5C].getValue(), 0);
        this.dmem[0x5B].setValue(0); // PC was stored in these two previously to
        this.dmem[0x5C].setValue(0); // easily transfer the information
        this.spl = this.dmem[0x5D]; // SP lo8
        this.sph = this.dmem[0x5E]; // SP hi8
        this.sreg = this.dmem[0x5F]; // SREG

        // SETTING PC = 0 & SREG = RAMEND
        this.flashend = this.pmem.length - 1;
        this.ramend = this.dmem.length - 1;
        this.setPC((this.pch.getValue() << 8) + this.pcl.getValue());
        this.setSP(this.ramend); 
    }

    step() {
        if (this.checkFinished()) return;

        this.line = this.pmem[this.getPC()];
        this.line_in_file = this.line.getInst().getLine();
        this.branch_taken = false;

        const inst = this.line.getInst().getValue();

        let Rd, Rr, Result, K_val, k, b, s, A_val, q, w, low_byte, plusminus;    // declaring all the variable names
        let [T_bit, H_bit, V_bit, N_bit, Z_bit, C_bit] = [null, null, null, null, null, null];

        // Big switch statement
        switch (inst) {
            case 'ADC':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                C_bit = this.getSREG() & 1;
                Result = this.mod256(Rd + Rr + C_bit);

                this.writeResultRd(Result);   // Rd <-- Rd + Rr + C

                H_bit = (this.getBit(Rd, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(Result, 3))) | (this.getBit(Rd, 3) & (1 - this.getBit(Result, 3)));
                V_bit = ((Rd >= 128) & (Rr >= 128) & (Result < 128)) | ((Rd < 128) & (Rr < 128) & (Result >= 128));
                N_bit = (Result >= 128);
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Result === 0, (Rd + Rr + C_bit) > 255);
                break;
            case 'ADD':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                Result = this.mod256(Rd + Rr);

                this.writeResultRd(Result);   // Rd <-- Rd + Rr

                H_bit = (this.getBit(Rd, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(Result, 3))) | (this.getBit(Rd, 3) & (1 - this.getBit(Result, 3)));
                V_bit = ((Rd >= 128) & (Rr >= 128) & (Result < 128)) | ((Rd < 128) & (Rr < 128) & (Result >= 128));
                N_bit = (Result >= 128);
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Result === 0, (Rd + Rr) > 255);
                break;
            case 'ADIW':
                Rd = this.getDMEM()[this.line.getArgs()[0].getValue()].getValue() + (this.getDMEM()[this.line.getArgs()[0].getValue() + 1].getValue() << 8);
                K_val = this.getArgumentValue(1);
                Result = (Rd + K_val) & 0xffff;
                this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(Result & 0xff);
                this.getDMEM()[this.line.getArgs()[0].getValue() + 1].setValue((Result >> 8) & 0xff);
                
                V_bit = ((Result - K_val) < 0x8000) && (Result >= 0x8000);
                N_bit = (Result >= 0x8000);
                C_bit = (Result - K_val) < 0;   // if you carried and went back around to 0 when doing the addition
                this.updateSREG(null, null, null, N_bit ^ V_bit, V_bit, N_bit, Result === 0, C_bit);
                break;
            case 'AND':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                Result = Rd & Rr;

                this.writeResultRd(Result);   // Rd <-- Rd & Rr

                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit, 0, N_bit, Result === 0, null);
                break;
            case 'ANDI':
                Rd = this.getArgumentValue(0);
                K_val = this.getArgumentValue(1);
                Result = Rd & K_val;

                this.writeResultRd(Result);   // Rd <-- Rd & K

                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit, 0, N_bit, Result === 0, null);
                break;
            case 'ASR':
                Rd = this.getArgumentValue(0);
                Result = this.mod256(Rd >> 1);
                if (Rd >= 128) Result += 128;

                this.writeResultRd(Result);

                N_bit = (Result >= 128);
                C_bit = Rd & 1;
                V_bit = N_bit ^ C_bit;
                this.updateSREG(null, null, null, N_bit ^ V_bit, V_bit, N_bit, Result === 0, C_bit);
                break;
            case 'BCLR':
                s = this.getArgumentValue(0);
                this.updateSREGBit(0, s);   // Clear bit s
                break;
            case 'BLD':
                Rd = this.getArgumentValue(0);
                b = this.getArgumentValue(1);
                T_bit = this.getSREGBit(6);
                Result = T_bit ? Rd | ( 1 << b ) : Rd & ( 0xff - ( 1 << b ) );
                this.writeResultRd(Result);   // Rd(b) <-- T 
                break;
            case 'BRBC':
                s = this.getArgumentValue(0);
                this.branch_taken = this.getSREGBit(1 << s) === 0;
                this.branches_seen += 1;
                break;
            case 'BRBS':
                s = this.getArgumentValue(0);
                this.branch_taken = this.getSREGBit(1 << s) === 1;
                this.branches_seen += 1;
                break;
            case 'BRCC':
                this.branch_taken = this.getSREGBit(0) === 0;
                this.branches_seen += 1;
                break;
            case 'BRCS':
                this.branch_taken = this.getSREGBit(0) === 1;
                this.branches_seen += 1;
                break;
            case 'BREQ':
                this.branch_taken = this.getSREGBit(1) === 1;
                this.branches_seen += 1;
                break;
            case 'BRGE':
                this.branch_taken = this.getSREGBit(4) === 0;
                this.branches_seen += 1;
                break;
            case 'BRHC':
                this.branch_taken = this.getSREGBit(5) === 0;
                this.branches_seen += 1;
                break;
            case 'BRHS':
                this.branch_taken = this.getSREGBit(5) === 1;
                this.branches_seen += 1;
                break;
            case 'BRID':
                this.branch_taken = this.getSREGBit(7) === 0;
                this.branches_seen += 1;
                break;
            case 'BRIE':
                this.branch_taken = this.getSREGBit(7) === 1;
                this.branches_seen += 1;
                break;
            case 'BRLO':
                this.branch_taken = this.getSREGBit(0) === 1;
                this.branches_seen += 1;
                break;
            case 'BRLT':
                this.branch_taken = this.getSREGBit(4) === 1;
                this.branches_seen += 1;
                break;
            case 'BRMI':
                this.branch_taken = this.getSREGBit(2) === 1; 
                this.branches_seen += 1;
                break;
            case 'BRNE':
                this.branch_taken = this.getSREGBit(1) === 0;
                this.branches_seen += 1;
                break;
            case 'BRPL':
                this.branch_taken = this.getSREGBit(2) === 0;
                this.branches_seen += 1;
                break;
            case 'BRSH':
                this.branch_taken = this.getSREGBit(0) === 0;
                this.branches_seen += 1;
                break;
            case 'BRTC':
                this.branch_taken = this.getSREGBit(6) === 0;
                this.branches_seen += 1;
                break;
            case 'BRTS':
                this.branch_taken = this.getSREGBit(6) === 1;
                this.branches_seen += 1;
                break;
            case 'BRVC':
                this.branch_taken = this.getSREGBit(3) === 0;
                this.branches_seen += 1;
                break;
            case 'BRVS':
                this.branch_taken = this.getSREGBit(3) === 1;
                this.branches_seen += 1;
                break;
            case 'BSET':
                s = this.getArgumentValue(0);
                this.updateSREGBit(1, s);   // Set bit s
                break;
            case 'BST':
                Rd = this.getArgumentValue(0);
                b = this.getArgumentValue(1);
                T_bit = this.getBit(Rd, b);
                this.updateSREGBit(T_bit, 6);
                break;
            case 'CALL':
                let sp = this.getSP();
                if (this.line.getArgs()[0].getType() === 'INT') {
                    this.incPC();
                    this.incPC();

                    if (sp <= 0x101) {
                        this.newError(`Bad stack pointer for CALL on line ${this.line_in_file}.`)
                        return;
                    }

                    this.getDMEM()[sp] = this.pcl.getValue();               // push pcl in STACK
                    this.decSP();
                    this.getDMEM()[this.getSP()] = this.pch.getValue();     // push pch in STACK
                    this.decSP();

                    k = this.getArgumentValue(0);
                    this.setPC(k - 1);
                    this.cycles += 5;
                    break;
                }

                // OTHERWISE IF IT'S PRINTF
                if (this.line.getArgs()[0].getValue() === 'printf') {
                    
                    // Check you can pop twice
                    if (sp >= (this.ramend - 1)) {
                        this.newError(`Bad stack pointer for CALL on line ${this.line_in_file}.`);
                        return;
                    }
                    
                    let address = this.getDMEM()[sp + 1] + ( this.getDMEM()[sp + 2] << 8);

                    this.getDMEM()[26].setValue(0xff);
                    this.getDMEM()[27].setValue(0x08);
                    this.getDMEM()[30].setValue(0x02);
                    this.getDMEM()[31].setValue(0x01);
                    
                    // Do the printing
                    let K_val, char;
                    let W_val = 0;
                    while (true) {
                        K_val = this.getDMEM()[address];
                        if (K_val === 0) break;
                        address += 1;
                        W_val += 1;
                        char = String.fromCharCode(K_val);
                        document.getElementById('console').innerHTML += char;           // add it to the console
                    }

                    this.getDMEM()[24].setValue(this.mod256(W_val));
                    this.getDMEM()[25].setValue(this.mod256(W_val >> 8));

                    //document.getElementById('console').innerHTML += '\n';               // add a new line after a print

                    // Increment to go past the double instruction
                    this.incPC();    
                    
                    // Move the scroll to the bottom
                    const console_box = document.getElementById('console');
                    console_box.scrollTop = console_box.scrollHeight;
                    
                }
                    // Printf takes the top two values from the stack
                    // Puts them into X low byte then high byte (must push high byte first to call printf)
                    // Assumes that it is pointing at the string you want to print
                    // Prints characters with X+ until it hits a null character
                    // Returns

                    // W, X, and Z are changed
                    // The string is printed
                    // Next instruction is after
                this.cycles += 4;
                break;
            case 'CBI':
                A_val = this.getArgumentValue(0);
                b = this.getArgumentValue(1);
                Result = this.getDMEM()[A_val + 0x20].getValue() & (0xff - (1 << b));
                this.getDMEM()[A_val + 0x20].setValue(Result);
                this.cycles += 1;
                break;
            case 'CBR':
                Rd = this.getArgumentValue(0);
                K_val = this.getArgumentValue(1);
                Result = Rd & (0xff - K_val);

                this.writeResultRd(Result);   // Rd <-- Rd & (0xff - K)

                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit, 0, N_bit, Result === 0, null);
                break;
            case 'CLC':
                this.updateSREGBit(0, 0);
                break;
            case 'CLH':
                this.updateSREGBit(0, 5);
                break;
            case 'CLI':
                this.updateSREGBit(0, 7);
                break;
            case 'CLN':
                this.updateSREGBit(0, 2);
                break;
            case 'CLR':
                this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(0);   // Rd <-- 0
                this.updateSREG(null, null, null, 0, 0, 0, 1, null);
                break;
            case 'CLS':
                this.updateSREGBit(0, 4);
                break;
            case 'CLT':
                this.updateSREGBit(0, 6);
                break;
            case 'CLV':
                this.updateSREGBit(0, 3);
                break;
            case 'CLZ':
                this.updateSREGBit(0, 1);
                break;
            case 'COM':
                Rd = this.getArgumentValue(0);
                Result = 0xff - Rd;

                this.writeResultRd(Result);   // Rd <-- 0xff - Rd

                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit, 0, N_bit, Result === 0, 1);
                break;
            case 'CP':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                Result = this.mod256(Rd - Rr);

                H_bit = (this.getBit(Result, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(Result, 3) & (1 - this.getBit(Rd, 3)));
                V_bit = ((Result >= 128) & (Rr >= 128) & (Rd < 128)) | ((Result < 128) & (Rr < 128) & (Rd >= 128));
                N_bit = (Result >= 128);
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Result === 0, (Rd - Rr) < 0);
                break;
            case 'CPC':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                C_bit = this.getSREG() & 1;
                Result = this.mod256(Rd - Rr - C_bit);

                H_bit = (this.getBit(Result, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(Result, 3) & (1 - this.getBit(Rd, 3)));
                V_bit = ((Result >= 128) & (Rr >= 128) & (Rd < 128)) | ((Result < 128) & (Rr < 128) & (Rd >= 128));
                Z_bit = (Result === 0) & ((this.getSREG() >> 1) & 1);
                N_bit = (Result >= 128);
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Z_bit, (Rd - Rr - C_bit) < 0);
                break;
            case 'CPI':
                Rd = this.getArgumentValue(0);
                K_val = this.getArgumentValue(1);
                Result = this.mod256(Rd - K_val);

                H_bit = (this.getBit(Result, 3) & this.getBit(K_val, 3)) | (this.getBit(K_val, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(Result, 3) & (1 - this.getBit(Rd, 3)));
                V_bit = ((Result >= 128) & (K_val >= 128) & (Rd < 128)) | ((Result < 128) & (K_val < 128) & (Rd >= 128));
                N_bit = (Result >= 128);
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Result === 0, (Rd - K_val) < 0);
                break;
            case 'CPSE':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                this.branches_seen += 1;

                if ( Rd !== Rr ) break;

                this.incPC();
                this.cycles += 1;
                this.branches_taken += 1;

                if ( this.pmem[this.getPC() + 1] !== null ) break;

                this.incPC();
                this.cycles += 1;

                break;
            case 'DEC':
                Rd = this.getArgumentValue(0);
                Result = this.mod256(Rd - 1);

                this.writeResultRd(Result);   // Rd <-- Rd - 1

                V_bit = (Result === 127);
                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit ^ V_bit, V_bit, N_bit, Result === 0, null);
                break;
            case 'EOR':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                Result = Rd ^ Rr;

                this.writeResultRd(Result);   // Rd <-- Rd ^ Rr

                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit, 0, N_bit, Result === 0, null);
                break;
            case 'FMUL':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                Result = Rd * Rr * 2;

                this.getDMEM()[0].setValue(this.mod256(Result));
                this.getDMEM()[1].setValue(this.mod256(Result >> 8));

                this.updateSREG(null, null, null, null, null, null, Result === 0, (Result >> 16) & 1);
                break;
            case 'FMULS':
                Rd = this.getArgumentValue(0);
                Rd = (Rd < 128) ? Rd : Rd - 256;    // convert to signed
                Rr = this.getArgumentValue(1);
                Rr = (Rr < 128) ? Rr : Rr - 256;    // convert to signed
                Result = Rd * Rr;
                Result = (Result < 0) ? 65536 + Result : Result;        // convert to unsigned equivalent
                Result *= 2;
                
                this.getDMEM()[0].setValue(this.mod256(Result));
                this.getDMEM()[1].setValue(this.mod256(Result >> 8));

                this.updateSREG(null, null, null, null, null, null, Result === 0, (Result >> 16) & 1);
                break;
            case 'FMULSU':
                Rd = this.getArgumentValue(0);
                Rd = (Rd < 128) ? Rd : Rd - 256;    // convert to signed
                Rr = this.getArgumentValue(1);
                Result = Rd * Rr;
                Result = (Result < 0) ? 65536 + Result : Result;        // convert to unsigned equivalent
                Result *= 2;
                
                this.getDMEM()[0].setValue(this.mod256(Result));
                this.getDMEM()[1].setValue(this.mod256(Result >> 8));

                this.updateSREG(null, null, null, null, null, null, Result === 0, (Result >> 16) & 1);
                this.cycles += 1;
                break;
            case 'ICALL':
                this.incPC();

                if (this.getSP() <= 0x101) {
                    this.newError(`Bad stack pointer for CALL on line ${this.line_in_file}.`)
                    return;
                }

                this.getDMEM()[this.getSP()] = this.pcl.getValue();              // push pcl in STACK
                this.decSP();
                this.getDMEM()[this.getSP()] = this.pch.getValue();              // push pch in STACK
                this.decSP();

                k = this.getZ();
                this.setPC(k - 1);
                this.cycles += 3;
                break;
            case 'IJMP':
                k = this.getZ();
                this.setPC(k - 1);
                this.cycles += 1;
                break;
            case 'IN':
                Rd = this.getArgumentValue(0);
                A_val = this.getArgumentValue(1);
                Result = this.getDMEM()[A_val + 0x20].getValue();

                this.writeResultRd(Result);   // Rd <-- I/O(A)
                break;
            case 'INC':
                Rd = this.getArgumentValue(0);
                Result = this.mod256(Rd + 1);

                this.writeResultRd(Result);   // Rd <-- Rd + 1

                V_bit = (Result === 128);
                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit ^ V_bit, V_bit, N_bit, Result === 0, null);
                break;
            case 'JMP':
                k = this.getArgumentValue(0);
                this.setPC(k - 1);
                this.cycles += 2;
                break;
            case 'LD':
                w = this.line.getArgs()[1].getValue();
                plusminus = -1 * w.includes('-') + w.includes('+'); // get if it's got a + or -
                w = w.replace('-', '').replace('+', '');            // make it X, Y, or Z only
                low_byte = (['X', 'Y', 'Z'].indexOf(w) * 2) + 26;   // convert it to a number

                if (plusminus === -1) this.decWord(low_byte);
                
                k = this.getWord(low_byte);
                if (k < 0x100 || k > this.ramend) this.newError(`Illegal value \'${k}\' for ${w} on line ${this.line_in_file}.`)
                if (plusminus === 1) this.incWord(low_byte);
                
                this.cycles += ( (3 * plusminus * plusminus) - plusminus) >> 1; // +2 for -1, +1 for 1, +0 for 0
                this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(this.getDMEM()[k]);   // Rd <-- (k)
                break;
            case 'LDD':
                w = this.line.getArgs()[1].getValue()[0];
                q = parseInt(this.line.getArgs()[1].getValue().slice(2));

                if (w === 'Y') k = this.getY() + q;
                else if (w === 'Z') k = this.getZ() + q;
                if (k < 0x100 || k > this.ramend) this.newError(`Illegal value \'${k}\' for ${w}+${q} on line ${this.line_in_file}.`)
                this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(this.getDMEM()[k]);   // Rd <-- (k)
                this.cycles += 1;
                break;
            case 'LDI':
                K_val = this.getArgumentValue(1);
                this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(K_val);   // Rd <-- K
                break;
            case 'LDS':
                k = this.getArgumentValue(1);
                this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(this.getDMEM()[k]);   // Rd <-- (k)
                this.incPC(); // increment once now cause total needs to be + 2
                this.cycles += 1;
                break;
            case 'LPM':
                k = this.getZ();
                Rd = (this.line.getArgs().length === 0) ? 0 : this.line.getArgs()[0].getValue();      // set Rd as either 0 or whatever it's specified as
                if (this.line.getArgs().length !== 0 && this.line.getArgs()[1].getValue().includes('+')) {
                    this.incZ();
                }
                this.getDMEM()[Rd].setValue( parseInt( this.getPMEM()[(k - (k & 1)) >> 1].getOpcode().slice(8 * (1 - k & 1), 8 + 8 * (1 - k & 1)), 2) );
                this.cycles += 2;
                break;
            case 'LSL':
                Rd = this.getArgumentValue(0);
                Result = this.mod256(Rd + Rd);

                this.writeResultRd(Result);   // Rd <-- Rd + Rd

                H_bit = this.getBit(Rd, 3);
                N_bit = (Result >= 128);
                C_bit = (Rd >= 128);
                V_bit = N_bit ^ C_bit;
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Result === 0, C_bit);
                break;
            case 'LSR':
                Rd = this.getArgumentValue(0);
                Result = this.mod256(Rd >> 1);
                this.writeResultRd(Result);

                C_bit = Rd & 1;
                this.updateSREG(null, null, null, C_bit, C_bit, 0, Result === 0, C_bit);
                break;
            case 'MOV':
                Rr = this.getArgumentValue(1);
                this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(Rr);   // Rd <-- Rr
                break;
            case 'MOVW':
                Rr = this.getArgumentValue(1);
                this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(Rr);   // Rd <-- Rr
                Rr = this.getDMEM()[this.line.getArgs()[1].getValue() + 1].getValue();
                this.getDMEM()[this.line.getArgs()[0].getValue() + 1].setValue(Rr);   // Rd <-- Rr
                break;
            case 'MUL':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                Result = Rd * Rr;

                this.getDMEM()[0].setValue(this.mod256(Result));
                this.getDMEM()[1].setValue(this.mod256(Result >> 8));

                this.updateSREG(null, null, null, null, null, null, Result === 0, (Result >> 15) & 1);
                break;
            case 'MULS':
                Rd = this.getArgumentValue(0);
                Rd = (Rd < 128) ? Rd : Rd - 256;    // convert to signed
                Rr = this.getArgumentValue(1);
                Rr = (Rr < 128) ? Rr : Rr - 256;    // convert to signed
                Result = Rd * Rr;
                Result = (Result < 0) ? 65536 + Result : Result;        // convert to unsigned equivalent
                
                this.getDMEM()[0].setValue(this.mod256(Result));
                this.getDMEM()[1].setValue(this.mod256(Result >> 8));

                this.updateSREG(null, null, null, null, null, null, Result === 0, (Result >> 15) & 1);
                break;
            case 'MULSU':
                Rd = this.getArgumentValue(0);
                Rd = (Rd < 128) ? Rd : Rd - 256;    // convert to signed
                Rr = this.getArgumentValue(1);
                Result = Rd * Rr;
                Result = (Result < 0) ? 65536 + Result : Result;        // convert to unsigned equivalent
                
                this.getDMEM()[0].setValue(this.mod256(Result));
                this.getDMEM()[1].setValue(this.mod256(Result >> 8));

                this.updateSREG(null, null, null, null, null, null, Result === 0, (Result >> 15) & 1);
                this.cycles += 1;
                break;
            case 'NEG':
                Rd = this.getArgumentValue(0);
                Result = this.mod256(0 - Rd);

                this.writeResultRd(Result);   // Rd <-- 0 - Rd

                H_bit = this.getBit(Result, 3) | (1 - this.getBit(Rd, 3));
                V_bit = (Result === 128);
                N_bit = (Result >= 128);
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Result === 0, Result !== 0);
                break;
            case 'NOP':
                break;
            case 'OR':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                Result = Rd | Rr;

                this.writeResultRd(Result);   // Rd <-- Rd | Rr

                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit, 0, N_bit, Result === 0, null);
                break;
            case 'ORI':
                Rd = this.getArgumentValue(0);
                K_val = this.getArgumentValue(1);
                Result = Rd | K_val;

                this.writeResultRd(Result);   // Rd <-- Rd | K

                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit, 0, N_bit, Result === 0, null);
                break;
            case 'OUT':
                A_val = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);

                this.getDMEM()[A_val + 0x20].setValue(Rr);   // I/O(A) <-- Rr
                break;
            case 'POP':
                if (this.getSP() >= this.ramend) {
                    this.newError(`Bad stack pointer for POP on line ${this.line_in_file}.`)
                    return;
                }
                this.incSP();                                                       // increment the SP by 1
                Rd = this.line.getArgs()[0].getValue();                                  // register number
                this.getDMEM()[Rd].setValue(this.getDMEM()[this.getSP()]);          // set register value
                this.cycles += 1;
                break;
            case 'PUSH':
                if (this.getSP() <= 0x100) {
                    this.newError(`Stack overflow. Bad stack pointer for PUSH on line ${this.line_in_file}.`)
                    return;
                }
                Rr = this.getArgumentValue(0);            // register held value
                this.getDMEM()[this.getSP()] = Rr;              // set the value in DMEM
                this.decSP();                                   // decrement the SP by 1
                this.cycles += 1;
                break;
            case 'RCALL':
                this.incPC();

                if (this.getSP() <= 0x101) {
                    this.newError(`Bad stack pointer for CALL on line ${this.line_in_file}.`)
                    return;
                }

                this.getDMEM()[this.getSP()] = this.pcl.getValue();              // push pcl in STACK
                this.decSP();
                this.getDMEM()[this.getSP()] = this.pch.getValue();              // push pch in STACK
                this.decSP();

                this.decPC();

                k = this.getArgumentValue(0);
                this.setPC(this.getPC() + k);
                this.cycles += 3;
                break;
            case 'RET':
                if (this.getSP() === this.ramend) {
                    this.finished = true;
                    this.step_count += 1;
                    this.cycles += 5;
                    console.log(`Number of steps taken: ${this.step_count}`);
                    return;
                }

                if ((this.getSP() < 0x100) || (this.getSP() > (this.ramend - 2))) {
                    this.newError(`Bad stack pointer for RET on line ${this.line_in_file}.`);
                    return;
                }

                // Get the return line and move the SP
                this.incSP();
                let ret_line = (this.getDMEM()[this.getSP()] << 8); // get the ret high value
                this.incSP();
                ret_line += this.getDMEM()[this.getSP()]; // add the ret low value to the ret high value
                this.setPC(ret_line - 1);
                this.cycles += 4;
                break;
            case 'RJMP':
                k = this.getArgumentValue(0);
                this.setPC(this.getPC() + k);
                this.cycles += 1;
                break;
            case 'ROL':
                Rd = this.getArgumentValue(0);
                C_bit = this.getSREG() & 1;
                Result = this.mod256(Rd << 1) + C_bit;

                this.writeResultRd(Result);

                H_bit = this.getBit(Rd, 3);
                N_bit = (Result >= 128);
                C_bit = (Rd >= 128);
                V_bit = N_bit ^ C_bit;
                this.updateSREG(null, null, null, N_bit ^ V_bit, V_bit, N_bit, Result === 0, C_bit);
                break;
            case 'ROR':
                Rd = this.getArgumentValue(0);
                C_bit = this.getSREG() & 1;
                Result = this.mod256(Rd >> 1) + (C_bit << 7);

                this.writeResultRd(Result);

                N_bit = (Result >= 128);
                C_bit = Rd & 1;
                V_bit = N_bit ^ C_bit;
                this.updateSREG(null, null, null, N_bit ^ V_bit, V_bit, N_bit, Result === 0, C_bit);
                break;
            case 'SBC':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                C_bit = this.getSREG() & 1;
                Result = this.mod256(Rd - Rr - C_bit);

                this.writeResultRd(Result);   // Rd <-- Rd - Rr - C

                H_bit = (this.getBit(Result, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(Result, 3) & (1 - this.getBit(Rd, 3)));
                V_bit = ((Result >= 128) & (Rr >= 128) & (Rd < 128)) | ((Result < 128) & (Rr < 128) & (Rd >= 128));
                N_bit = (Result >= 128);
                Z_bit = (Result === 0) & ((this.getSREG() >> 1) & 1);
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Z_bit, (Rd - Rr - C_bit) < 0);
                break;
            case 'SBCI':
                Rd = this.getArgumentValue(0);
                K_val = this.getArgumentValue(1);
                C_bit = this.getSREG() & 1;
                Result = this.mod256(Rd - K_val - C_bit);

                this.writeResultRd(Result);   // Rd <-- Rd - K - C

                H_bit = (this.getBit(Result, 3) & this.getBit(K_val, 3)) | (this.getBit(K_val, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(Result, 3) & (1 - this.getBit(Rd, 3)));
                V_bit = ((Result >= 128) & (K_val >= 128) & (Rd < 128)) | ((Result < 128) & (K_val < 128) & (Rd >= 128));
                N_bit = (Result >= 128);
                Z_bit = (Result === 0) & ((this.getSREG() >> 1) & 1);
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Z_bit, (Rd - K_val - C_bit) < 0);
                break;
            case 'SBI':
                A_val = this.getArgumentValue(0);
                b = this.getArgumentValue(1);
                Result = this.getDMEM()[A_val + 0x20].getValue() | (1 << b);
                this.getDMEM()[A_val + 0x20].setValue(Result);
                this.cycles += 1;
                break;
            case 'SBIW':
                Rd = this.getDMEM()[this.line.getArgs()[0].getValue()].getValue() + (this.getDMEM()[this.line.getArgs()[0].getValue() + 1].getValue() << 8);
                K_val = this.getArgumentValue(1);
                Result = (Rd - K_val) & 0xffff;
                this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(Result & 0xff);
                this.getDMEM()[this.line.getArgs()[0].getValue() + 1].setValue((Result >> 8) & 0xff);
                
                V_bit = ((Result + K_val) >= 0x8000) && (Result < 0x8000);
                N_bit = (Result >= 0x8000);
                C_bit = (Result + K_val) > 0xffff;   // if you carried and went back around to 0 when doing the addition
                this.updateSREG(null, null, null, N_bit ^ V_bit, V_bit, N_bit, Result === 0, C_bit);
                break;
            case 'SBR':
                Rd = this.getArgumentValue(0);
                K_val = this.getArgumentValue(1);
                Result = Rd | K_val;

                this.writeResultRd(Result);   // Rd <-- Rd | K

                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit, 0, N_bit, Result === 0, null);
                break;
            case 'SBRC':
                Rd = this.getArgumentValue(0);
                b = this.getArgumentValue(1);

                this.branches_seen += 1;

                if ((Rd >> b) & 1) break;   // break if it's set

                this.incPC();
                this.cycles += 1;
                this.branches_taken += 1;

                if ( this.pmem[this.getPC() + 1] !== null ) break;

                this.incPC();
                this.cycles += 1;
                break;
            case 'SBRS':
                Rd = this.getArgumentValue(0);
                b = this.getArgumentValue(1);
                
                this.branches_seen += 1;

                if (((Rd >> b) & 1) === 0) break;

                this.incPC();
                this.cycles += 1;
                this.branches_taken += 1;

                if ( this.pmem[this.getPC() + 1] !== null ) break;

                this.incPC();
                this.cycles += 1;
                break;
            case 'SEC':
                this.updateSREGBit(1, 0);
                break;
            case 'SEH':
                this.updateSREGBit(1, 5);
                break;
            case 'SEI':
                this.updateSREGBit(1, 7);
                break;
            case 'SEN':
                this.updateSREGBit(1, 2);
                break;
            case 'SER':
                this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(0xff);   // Rd <-- 0xff
                break;
            case 'SES':
                this.updateSREGBit(1, 4);
                break;
            case 'SET':
                this.updateSREGBit(1, 6);
                break;
            case 'SEV':
                this.updateSREGBit(1, 3);
                break;
            case 'SEZ':
                this.updateSREGBit(1, 1);
                break;
            case 'ST':
                w = this.line.getArgs()[0].getValue();
                plusminus = -1 * w.includes('-') + w.includes('+'); // get if it's got a + or -
                w = w.replace('-', '').replace('+', '');            // make it X, Y, or Z only
                low_byte = (['X', 'Y', 'Z'].indexOf(w) * 2) + 26;   // convert it to a number

                // Decrement X/Y/Z
                if (plusminus === -1) this.decWord(low_byte);

                k = this.getWord(low_byte);
                if (k < 0x100 || k > this.ramend) this.newError(`Illegal value \'${k}\' for ${w} on line ${this.line_in_file}.`)
                this.getDMEM()[k] = this.getArgumentValue(1);   // (k) <-- Rr
                
                if (plusminus === 1) this.incWord(low_byte);
                
                this.cycles += ( (3 * plusminus * plusminus) - plusminus) >> 1; // +2 for -1, +1 for 1, +0 for 0
                break;
            case 'STD':
                w = this.line.getArgs()[0].getValue()[0];
                q = parseInt(this.line.getArgs()[0].getValue().slice(2));
                Rd = this.getArgumentValue(1);
                if (w === 'Y') k = this.getY() + q;
                else if (w === 'Z') k = this.getZ() + q;
                if (k < 0x100 || k > this.ramend) this.newError(`Illegal value \'${k}\' for ${w}+${q} on line ${this.line_in_file}.`)
                this.getDMEM()[k] = Rd;   // (k) <-- Rd
                this.cycles += 1;
                break;
            case 'STS':
                k = this.getArgumentValue(0);
                Rd = this.getArgumentValue(1);
                this.getDMEM()[k] = Rd;   // (k) <-- Rd
                this.incPC(); // increment once now cause total needs to be + 2
                this.cycles += 1;
                break;
            case 'SUB':
                Rd = this.getArgumentValue(0);
                Rr = this.getArgumentValue(1);
                Result = this.mod256(Rd - Rr);

                this.writeResultRd(Result);   // Rd <-- Rd - Rr

                H_bit = (this.getBit(Result, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(Result, 3) & (1 - this.getBit(Rd, 3)));
                V_bit = ((Result >= 128) & (Rr >= 128) & (Rd < 128)) | ((Result < 128) & (Rr < 128) & (Rd >= 128));
                N_bit = (Result >= 128);
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Result === 0, (Rd - Rr) < 0);
                break;
            case 'SUBI':
                Rd = this.getArgumentValue(0);
                K_val = this.getArgumentValue(1);
                Result = this.mod256(Rd - K_val);

                this.writeResultRd(Result);   // Rd <-- Rd - K

                H_bit = (this.getBit(Result, 3) & this.getBit(K_val, 3)) | (this.getBit(K_val, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(Result, 3) & (1 - this.getBit(Rd, 3)));
                V_bit = ((Result >= 128) & (K_val >= 128) & (Rd < 128)) | ((Result < 128) & (K_val < 128) & (Rd >= 128));
                N_bit = (Result >= 128);
                this.updateSREG(null, null, H_bit, N_bit ^ V_bit, V_bit, N_bit, Result === 0, (Rd - K_val) < 0);
                break;
            case 'SWAP':
                Rd = this.getArgumentValue(0);
                Result = ((Rd & 0x0F) << 4 | (Rd & 0xF0) >> 4);

                this.writeResultRd(Result);
                break;
            case 'TST':
                Rd = this.getArgumentValue(0);
                Result = Rd;

                N_bit = (Result >= 128);
                this.updateSREG(null, null, null, N_bit, 0, N_bit, Result === 0, null);
                break;
            case 'XCH':
                k = this.getZ();
                Rd = this.getArgumentValue(1);
                if ((k < 0x100) || (k > 0x8ff)) {
                    this.newError(`Illegal value of Z pointer \'${k}\' on line ${this.line_in_file}.`);
                }

                let vals = [Rd, this.getDMEM()[k]];

                this.getDMEM()[k] = vals[0];                                    // (Z) <-- Rd
                this.getDMEM()[this.line.getArgs()[1].getValue()].setValue(vals[1]); // Rd <-- (Z)
                this.cycles += 1;
                break;
            default:
                break;
        }

        if (this.branch_taken) this.branch();  // will branch if branch is required

        // almost every instruction does this, so its easier to counterract it if you don't want to do exactly that
        this.incPC();

        this.incrementStepCount();
    }

    run() {
        while (this.finished === false && this.error == false) {
            this.step();
        }
    }

    checkFinished() {
        // Do nothing if it's finished running
        if (this.finished | this.error) return true;
                
        // If breakpoint is reached
        if (this.getPC() === this.break_point) {
            this.finished = true;
            return true;
        }

        // If it should be finished, set it to finished then return
        if (this.getPC() >= this.flashend) {
            this.finished = true;
            console.log(this.step_count);
            this.setPC(this.flashend);
            return true;
        }

        return false;
    }

    writeResultRd(result) {
        this.getDMEM()[this.line.getArgs()[0].getValue()].setValue(result);
    }

    branch(k) {
        k = this.getArgumentValue(0);
        this.setPC(this.getPC() + k);
        this.cycles += 1;
        this.branches_taken += 1;
    }

    incrementStepCount() {
        this.step_count += 1 // count the number of steps to prevent infinite loops
        this.cycles += 1 // count the number of clock cycles used

        // If the number of steps is too large, terminate running the code
        if (this.step_count > 1000000) {
            this.newError('Number of steps in code too large. Execution terminated.')
            return;
        } 
    }

    getPC() {
        return (this.pch.getValue() << 8) + this.pcl.getValue();
    }

    setPC(new_value) {
        this.pch.setValue(this.mod256(new_value >> 8));
        this.pcl.setValue(this.mod256(new_value));
    }

    getSP() {
        return (this.sph.getValue() << 8) + this.spl.getValue();
    }

    setSP(new_value) {
        this.sph.setValue(this.mod256(new_value >> 8));
        this.spl.setValue(this.mod256(new_value));
    }

    incSP() {
        this.setSP(this.getSP() + 1);
    }

    decSP() {
        this.setSP(this.getSP() - 1);
    }

    incPC() {
        this.setPC(this.getPC() + 1);
    }

    decPC() {
        this.setPC(this.getPC() - 1);
    }

    convertPmemToksToCode(toks) {
        // Takes a line as tokens and converts it to code.

        if (toks === null) return '(two line inst.)';

        const inst = toks[0].getValue();

        // IF THERE'S NO ARGUMENTS
        if (toks.length === 1) return inst;

        const args = toks.slice(1);

        let arg1 = `${args[0].getValue()}`; // value of the argument

        if (args[0].getType() === 'REG') arg1 = 'R' + arg1;
        
        // IF THERE'S 1 ARGUMENT
        if (toks.length === 2) return `${inst} ${arg1}`;
        
        // IF THERE'S 2 ARGUMENTS
        let arg2 = `${args[1].getValue()}`; // value of the argument
        if (args[1].getType() === 'REG') arg2 = 'R' + arg2;

        return `${inst} ${arg1}, ${arg2}`;
    }

    getPMEM() {
        return this.pmem;
    }

    getDMEM() {
        return this.dmem;
    }

    getSREG() {
        return this.sreg.getValue();
    }

    getSREGBit(bit) {
        return (this.sreg.getValue() >> bit) & 1;
    }

    updateSREGBit(value, bit) {
        this.sreg.updateBit(value, bit);
    }

    updateSREG(I_bit = null, T_bit = null, H_bit = null, S_bit = null, V_bit = null, N_bit = null, Z_bit = null, C_bit = null) {
        if (I_bit !== null) this.updateSREGBit(I_bit, 7);
        if (T_bit !== null) this.updateSREGBit(T_bit, 6);
        if (H_bit !== null) this.updateSREGBit(H_bit, 5);
        if (S_bit !== null) this.updateSREGBit(S_bit, 4);
        if (V_bit !== null) this.updateSREGBit(V_bit, 3);
        if (N_bit !== null) this.updateSREGBit(N_bit, 2);
        if (Z_bit !== null) this.updateSREGBit(Z_bit, 1);
        if (C_bit !== null) this.updateSREGBit(C_bit, 0);
    }

    getBit(value, bit) {
        // returns the value of a bit in a number
        return ((value >> bit) & 1);
    }

    incWord(low_reg) {
        const val = (this.getDMEM()[low_reg + 1].getValue() << 8) + this.getDMEM()[low_reg].getValue() + 1;
        this.getDMEM()[low_reg + 1].setValue(this.mod256(val >> 8));
        this.getDMEM()[low_reg].setValue(this.mod256(val));
    }

    decWord(low_reg) {
        const val = (this.getDMEM()[low_reg + 1].getValue() << 8) + this.getDMEM()[low_reg].getValue() - 1;
        this.getDMEM()[low_reg + 1].setValue(this.mod256(val >> 8));
        this.getDMEM()[low_reg].setValue(this.mod256(val));
    }

    getWord(low_reg) {
        return (this.getDMEM()[low_reg + 1].getValue() << 8) + this.getDMEM()[low_reg].getValue();
    }

    getW() {
        return (this.getDMEM()[25].getValue() << 8) + this.getDMEM()[24].getValue();
    }

    incW() {
        this.incWord(24);
    }

    decW() {
        this.decWord(24);
    }

    getX() {
        return (this.getDMEM()[27].getValue() << 8) + this.getDMEM()[26].getValue();
    }

    incX() {
        this.incWord(26);
    }

    decX() {
        this.decWord(26);
    }

    getY() {
        return (this.getDMEM()[29].getValue() << 8) + this.getDMEM()[28].getValue()
    }

    incY() {
        this.incWord(28);
    }

    decY() {
        this.decWord(28);
    }

    getZ() {
        return (this.getDMEM()[31].getValue() << 8) + this.getDMEM()[30].getValue();
    }

    incZ() {
        this.incWord(30);
    }

    decZ() {
        this.decWord(30);
    }

    getArgumentValue(arg_num) {
        // For getting the value of a register or integer
        const arg = this.line.getArgs()[arg_num];
        const inst = this.line.getInst().getValue();
        const reqs = this.operands.getOperands(inst)[arg_num].getTokenType();
        if (reqs.includes('REG')) return this.getDMEM()[arg.getValue()].getValue();   
        if (arg.getType() === 'INT') return arg.getValue();
    }

    mod256(val) {
        return val & 0xff;
    }

    newError(text) {
        this.error = true;
        this.error_text = text;
        document.getElementById('error').innerHTML = text;
        document.getElementById('output').innerHTML = null;
        document.getElementById('status').innerHTML = null;
        throw new SyntaxError(text);
    }

}

class Operands {
    constructor() {
        const reg_0_31 = new Argument(['REG','INT'], 0, 31);
        const reg_16_31 = new Argument(['REG','INT'], 16, 31);
        const reg_word_low = new Argument(['REG','INT'], null, null, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
        const int_0_7 = new Argument('INT', 0, 7);
        const int_0_31 = new Argument('INT', 0, 31);
        const int_0_63 = new Argument('INT', 0, 63);
        const int_0_255 = new Argument('INT', 0, 255);
        const int_n64_63 = new Argument('INT', -64, 63);
        const word_plus_q_0_63 = new Argument('WORDPLUSQ', 0, 63);
        const word_wxyz = new Argument(['REG','INT'], null, null, [24, 26, 28, 30]);

        this.functions = new Functions();

        // Allows ranges for each inst
        this.inst_operands = {
            'ADC': [reg_0_31, reg_0_31],
            'ADD': [reg_0_31, reg_0_31],
            'ADIW': [word_wxyz, int_0_63],
            'AND': [reg_0_31, reg_0_31],
            'ANDI': [reg_16_31, int_0_255],
            'ASR': [reg_0_31],
            'BCLR': [int_0_7],
            'BLD': [reg_0_31, int_0_7],
            'BRBC': [int_0_7, int_n64_63],
            'BRBS': [int_0_7, int_n64_63],
            'BRCC': [int_n64_63],
            'BRCS': [int_n64_63],
            'BREQ': [int_n64_63],
            'BRGE': [int_n64_63],
            'BRHC': [int_n64_63],
            'BRHS': [int_n64_63],
            'BRID': [int_n64_63],
            'BRIE': [int_n64_63],
            'BRLO': [int_n64_63],
            'BRLT': [int_n64_63],
            'BRMI': [int_n64_63],
            'BRNE': [int_n64_63],
            'BRPL': [int_n64_63],
            'BRSH': [int_n64_63],
            'BRTC': [int_n64_63],
            'BRTS': [int_n64_63],
            'BRVC': [int_n64_63],
            'BRVS': [int_n64_63],
            'BSET': [int_0_7],
            'BST': [reg_0_31, int_0_7],
            'CALL': [new Argument(['INT', 'REF'], 0, 16383, this.functions.getFunctions())], // 16383 because flashend = 0x3fff
            'CBI': [int_0_31, int_0_7],
            'CBR': [reg_16_31, int_0_255],
            'CLC': null,
            'CLH': null,
            'CLI': null,
            'CLN': null,
            'CLR': [reg_0_31],
            'CLS': null,
            'CLT': null,
            'CLV': null,
            'CLZ': null,
            'COM': [reg_0_31],
            'CP': [reg_0_31, reg_0_31],
            'CPC': [reg_0_31, reg_0_31],
            'CPI': [reg_16_31, int_0_255],
            'CPSE': [reg_0_31, reg_0_31],
            'DEC': [reg_0_31],
            'EOR': [reg_0_31, reg_0_31],
            'FMUL': [new Argument(['REG','INT'], 16, 23), new Argument(['REG','INT'], 16, 23)],
            'FMULS': [new Argument(['REG','INT'], 16, 23), new Argument(['REG','INT'], 16, 23)],
            'FMULSU': [new Argument(['REG','INT'], 16, 23), new Argument(['REG','INT'], 16, 23)],
            'ICALL': null,
            'IJMP': null,
            'IN': [reg_0_31, int_0_63],
            'INC': [reg_0_31],
            'JMP': [new Argument('INT', 0, 16383)], // 16383 because flashend = 0x3fff
            'LD': [reg_0_31, new Argument(['WORD', 'MINUSWORD', 'WORDPLUS'])],
            'LDD': [reg_0_31, word_plus_q_0_63],
            'LDI': [reg_16_31, int_0_255],
            'LDS': [reg_0_31, new Argument('INT', 256, 2303)],  // 2303 because ramend = 0x8ff
            'LPM': [reg_0_31, new Argument(['WORD', 'WORDPLUS'])],
            'LSL': [reg_0_31],
            'LSR': [reg_0_31],
            'MOV': [reg_0_31, reg_0_31],
            'MOVW': [reg_word_low, reg_word_low],
            'MUL': [reg_0_31, reg_0_31],
            'MULS': [reg_16_31, reg_16_31],
            'MULSU': [new Argument(['REG','INT'], 16, 23), new Argument(['REG','INT'], 16, 23)],
            'NEG': [reg_0_31],
            'NOP': null,
            'OR': [reg_0_31, reg_0_31],
            'ORI': [reg_16_31, int_0_255],
            'OUT': [int_0_63, reg_0_31],
            'POP': [reg_0_31],
            'PUSH': [reg_0_31],
            'RCALL': [new Argument('INT', -2048, 2047)],
            'RET': null,
            'RJMP': [new Argument('INT', -2048, 2047)],
            'ROL': [reg_0_31],
            'ROR': [reg_0_31],
            'SBC': [reg_0_31, reg_0_31],
            'SBCI': [reg_16_31, int_0_255],
            'SBI': [int_0_31, int_0_7],
            'SBIW': [word_wxyz, int_0_63],
            'SBR': [reg_16_31, int_0_255],
            'SBRC': [reg_0_31, int_0_7],
            'SBRS': [reg_0_31, int_0_7],
            'SEC': null,
            'SEH': null,
            'SEI': null,
            'SEN': null,
            'SER': [reg_0_31],
            'SES': null,
            'SET': null,
            'SEV': null,
            'SEZ': null,
            'ST': [new Argument(['WORD', 'MINUSWORD', 'WORDPLUS']), reg_0_31],
            'STD': [word_plus_q_0_63, reg_0_31],
            'STS': [new Argument('INT', 256, 2303), reg_0_31],  // 2303 because ramend = 0x8ff
            'SUB': [reg_0_31, reg_0_31],
            'SUBI': [reg_16_31, int_0_255],
            'SWAP': [reg_0_31],
            'TST': [reg_0_31],
            'XCH': [new Argument('WORD', null, null, null, 'Z'), reg_0_31]
        };
    }

    isDefined(op) {
        return (this.inst_operands[op] !== undefined);
    }

    getOperands(op) {
        return this.inst_operands[op];
    }

    getInstructionArg(op, arg_num) {
        return this.inst_operands[op][arg_num];
    }

    numArgs(op) {
        return this.inst_operands[op] === null ? 0 : this.inst_operands[op].length;
    }
}

class MathTokens {
    constructor() {
        this.types = [
            'INT',
            'PLUS',
            'MINUS',
            'TIMES',
            'DIV',
            'BITAND',
            'BITOR',
            'BITXOR',
            'BITNOT',
            'LSHIFT',
            'RSHIFT',
            'LT',
            'GT',
            'DEQ',
            'LEQ',
            'GEQ',
            'NEQ',
            'LOGAND',
            'LOGOR',
            'LOGNOT',
            'LPAR',
            'RPAR'
        ];
    }

    isValidType(tok_type) {
        return this.types.includes(tok_type);
    }

    isValidSymbol(tok_type) {
        return this.types.slice(1).includes(tok_type);
    }
}

class InstructionSet {
    constructor() {
        this.inst_set = [
            'ADC',
            'ADD',
            'ADIW',
            'AND',
            'ANDI',
            'ASR',
            'BCLR',
            'BLD',
            'BRBC',
            'BRBS',
            'BRCC',
            'BRCS',
            'BREQ',
            'BRGE',
            'BRHC',
            'BRHS',
            'BRID',
            'BRIE',
            'BRLO',
            'BRLT',
            'BRMI',
            'BRNE',
            'BRPL',
            'BRSH',
            'BRTC',
            'BRTS',
            'BRVC',
            'BRVS',
            'BSET',
            'BST',
            'CALL',
            'CBI',
            'CBR',
            'CLC',
            'CLH',
            'CLI',
            'CLN',
            'CLR',
            'CLS',
            'CLT',
            'CLV',
            'CLZ',
            'COM',
            'CP',
            'CPC',
            'CPI',
            'CPSE',
            'DEC',
            'EOR',
            'FMUL',
            'FMULS',
            'FMULSU',
            'ICALL',
            'IJMP',
            'IN',
            'INC',
            'JMP',
            'LD',
            'LDD',
            'LDI',
            'LDS',
            'LPM',
            'LSL',
            'LSR',
            'MOV',
            'MOVW',
            'MUL',
            'MULS',
            'MULSU',
            'NEG',
            'NOP',
            'OR',
            'ORI',
            'OUT',
            'POP',
            'PUSH',
            'RCALL',
            'RET',
            'RJMP',
            'ROL',
            'ROR',
            'SBC',
            'SBCI',
            'SBI',
            'SBIW',
            'SBR',
            'SBRC',
            'SBRS',
            'SEC',
            'SEH',
            'SEI',
            'SEN',
            'SER',
            'SES',
            'SET',
            'SEV',
            'SEZ',
            'ST',
            'STD',
            'STS',
            'SUB',
            'SUBI',
            'SWAP',
            'TST',
            'XCH'
        ];
    }

    isInstruction(inst) {
        return this.inst_set.includes(inst);
    }

    usesTwosComp(inst) {
        return ['RJMP', 'RCALL'].concat(this.inst_set.slice(8, 28)).includes(inst);
    }

    isRelativeControlFlowInstruction(inst) {
        return this.usesTwosComp(inst);
    }

    isNonrelativeControlFlowInstruction(inst) {
        return ['CALL', 'JMP', 'IJMP', 'ICALL'].includes(inst);
    }
}

class Functions {
    constructor() {
        this.functions = ['printf'];
    }

    getFunctions() {
        return this.functions;
    }

    isFunction(f) {
        return this.functions.includes(f);
    }
}

class Directives {
    constructor() {
        this.directives = [
            '.SECTION',
            '.END',
            '.TEXT',
            '.DATA',
            '.GLOBAL',
            '.BYTE',
            '.WORD',
            '.STRING',
            '.ASCII',
            '.ASCIZ',
            '.SPACE',
            '.EQU',
            '.SET'
        ];
    }

    getDirectives() {
        return this.directives;
    }

    isDirective(d) {
        return this.directives.includes(d);
    }
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// # AN EASTER EGG - POEM                                                                                            /
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/*
O that you would know my heart,
Your ways, greater than my own,
To you I give my every hour,
Just to you and you alone.

O that you would see my eyes,
Looking only at your shape,
Spending time in your presence,
Looking at you for escape.

O that you would know my mind,
Long I strive to let you see,
Night and day I work for you,
Just for you, not you for me.

O that you would see my hands,
Patiently they labour strong,
Intro to Computer Systems,
Man, you're tough and very long.
*/


class App {

    constructor() {
        this.pmem_top = 0;
        this.dmem_top = 0x100;

        this.lexer = new Lexer();
        this.parser = new Parser();
        this.interpreter = new Interpreter();
        this.inst_set = new InstructionSet();

        // Displays
        this.base = 16; // value base for display
        this.display_opcode = false;
        this.display_ascii = false;

        this.assembled = false;

        this.current_popup = null; 

        this.ascii_table = this.makeAsciiTable();

        this.theme = 'light';

    }

    assemble() {

        // Getting text from the text window
        let txt = document.getElementById('code_box').value;

        this.hideOpenPopup(this.current_popup); // hide any open popup

        // Stop if no text
        if (txt.length <= 0) this.newError('No code to parse. Please input code in the code box.');

        // Clear the current data for if there's an error
        this.resetAll();

        // Tokenizing
        this.lexer.newData(txt);
        console.log(this.lexer.toString());

        // Parsing
        this.parser.newData(this.lexer.getTokens(), txt);

        // Interpreter Initialisation
        this.interpreter.newData(this.parser.getPMEM(), this.parser.getDMEM(), txt, this.parser.break_point);

        // Success!
        this.success('Success! Your code can be run.');

        // Populating Display with Data
        this.pmem_top = this.interpreter.getPC() - ( this.interpreter.getPC() % 8 );
        this.populateAll();
        

    }

    step() {

        this.hideOpenPopup(this.current_popup); // hide any open popup
        
        for (let i = 0; i < 0xff; i++) {
            this.interpreter.getDMEM()[i].clearChange();    // set changed = 0 for all registers
        }

        const stepsize = this.getStepSize();

        for (let i = 0; i < stepsize; i++) {
            this.interpreter.step();
        }

        this.pmem_top = this.interpreter.getPC() - (this.interpreter.getPC() % 8); // move pmem display to the line

        if (this.interpreter.finished) {
            if (this.interpreter.break_point !== this.interpreter.getPC()) this.success('The code has run and exited successfully!');
            else this.success(`The code has run and exited successfully at the breakpoint on line ${this.parser.break_point_line}!`);
        }

        else if (this.interpreter.error) this.newError(this.interpreter.error_text);

        else this.emptyStatus();

        this.populateAll();
    }

    run() {

        this.hideOpenPopup(this.current_popup); // hide any open popup

        for (let i = 0; i < 32; i++) {
            this.interpreter.getDMEM()[i].clearChange();    // set changed = 0 for all registers
        }

        this.interpreter.run();

        if (this.interpreter.finished) {
            if (this.interpreter.break_point !== this.interpreter.getPC()) this.success('The code has run and exited successfully!');
            else this.success(`The code has run and exited successfully at the breakpoint on line ${this.parser.break_point_line}!`);
        }

        else if (this.interpreter.error) this.newError(this.interpreter.error_text);

        this.pmem_top = this.interpreter.getPC() - (this.interpreter.getPC() % 8); // move pmem display to the line

        this.populateAll();
    }

    stepBackButton() {
        this.hideOpenPopup(this.current_popup); // hide any open popup
        this.stepBack();
    }

    stepBack() {
        
        const steps_back = this.getStepSize();
        const steps = this.interpreter.step_count - steps_back;       // the total number of steps to get to the point you want to go for
        
        if (steps < 0) {
            // New error but doesnt stop code being run if you press enother button.
            document.getElementById('error').innerHTML = (steps_back > 1) ? `Cannot go back ${steps_back} steps.` : `Cannot go back ${steps_back} step.`;
            document.getElementById('output').innerHTML = null;
            document.getElementById('status').innerHTML = null;
            return;
        }

        this.assemble();
        this.emptyStatus();
        this.hideOpenPopup(this.current_popup); // hide any open popup

        for (let i = 0; i < (steps - 1); i++) {
            this.interpreter.step();    // do enough steps to get to the point you expect to be at
        }
        
        // Clear the change for all registers
        for (let i = 0; i < 32; i++) {
            this.interpreter.getDMEM()[i].clearChange();
        }

        if (steps > 0) {
            this.interpreter.step();    // Take the step once the change has been cleared
        }

        this.pmem_top = this.interpreter.getPC() - (this.interpreter.getPC() % 8); // move pmem display to the line

        this.populateAll();
    }

    resetAll() {
        this.interpreter.emptyData();           // remove the data from the interpreter
        this.hideOpenPopup(this.current_popup); // hide any open popup
        this.assembled = false;                 // reset the assembling

        const normal_background_colour = '#ddd';
        const normal_text_colour = '#444';

        // Registers
        for (let reg_num = 0; reg_num < 32; reg_num++) {
            document.getElementById(`reg-${reg_num}`).innerHTML = '?';
            document.getElementById(`reg-${reg_num}`).style.backgroundColor = normal_background_colour;
            document.getElementById(`reg-${reg_num}`).style.color = normal_text_colour;
        }

        // SREG
        const sreg_flags = ['C', 'Z', 'N', 'V', 'S', 'H', 'T', 'I'];
        for (let i = 0; i < 8; i++) {
            document.getElementById(`sreg-${sreg_flags[i]}`).innerHTML = '?'; // set the inner HTML
            document.getElementById(`sreg-${sreg_flags[i]}`).style.backgroundColor = normal_background_colour;
            document.getElementById(`sreg-${sreg_flags[i]}`).style.color = normal_text_colour;
        }

        // Pointers
        document.getElementById('reg-PC').innerHTML = '?';
        document.getElementById('reg-SP').innerHTML = '?';
        document.getElementById('reg-X').innerHTML = '?';
        document.getElementById('reg-Y').innerHTML = '?';
        document.getElementById('reg-Z').innerHTML = '?';

        const pmem_line_num_normal_background_colour = '#bbb';
        const pmem_line_num_normal_text_colour = '#333';

        // PMEM
        for (let line = 0; line < 8; line++) {
            document.getElementById(`pmem-line-${line}`).innerHTML = '?';
            document.getElementById(`pmem-linenum-${line}`).style.backgroundColor = pmem_line_num_normal_background_colour;
            document.getElementById(`pmem-linenum-${line}`).style.color = pmem_line_num_normal_text_colour;
        }
        
        // DMEM
        for (let line = 0; line < 8; line++) {
            for (let row = 0; row < 8; row++) {
                document.getElementById(`dmem-line-${line}${row}`).innerHTML = '?';
                document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = normal_background_colour;
                document.getElementById(`dmem-line-${line}${row}`).style.color = normal_text_colour;

            }
        }
        
    }

    populateAll() {
        this.populateRegisters();
        this.populateSREG();
        this.populatePointers();
        this.populatePMEM(this.pmem_top);
        this.populateDMEM(this.dmem_top);
        this.populateStats();
        this.fillPopup();
    }

    populateRegisters() {
        if (!this.assembled) return;

        const registers = this.interpreter.getDMEM().slice(0, 32);

        const no_change_background_colour = (this.theme === 'light') ? '#ddd' : '#7e7e7e';
        const no_change_text_colour = (this.theme === 'light') ? '#444' : '#fff';

        const change_background_colour = '#fd0002';
        const change_text_colour = '#fff';

        // Go through each reg in the line
        for (let reg_num = 0; reg_num < 32; reg_num++) {
            const reg_value = this.convertValueToBase(registers[reg_num].getValue(), 2);
            document.getElementById(`reg-${reg_num}`).innerHTML = reg_value;

            // If it's changed, make the display different
            if (registers[reg_num].getChange()) {
                document.getElementById(`reg-${reg_num}`).style.backgroundColor = change_background_colour;
                document.getElementById(`reg-${reg_num}`).style.color = change_text_colour;
            } else {
                document.getElementById(`reg-${reg_num}`).style.backgroundColor = no_change_background_colour;
                document.getElementById(`reg-${reg_num}`).style.color = no_change_text_colour;
            }
        }
    }

    populateSREG() {
        // Don't populate before assembling code
        if (!this.assembled) {
            return;
        }

        const no_change_background_colour = (this.theme === 'light') ? '#ddd' : '#7e7e7e';
        const no_change_text_colour = (this.theme === 'light') ? '#444' : '#fff';

        const change_background_colour = '#fd0002';
        const change_text_colour = '#fff';

        let change = this.interpreter.sreg.getBitsChanged();    // the bits that have been changed

        const sreg_flags = ['C', 'Z', 'N', 'V', 'S', 'H', 'T', 'I'];
        for (let i = 0; i < 8; i++) {
            const flag = sreg_flags[i];

            const flag_value = this.interpreter.sreg.getBit(i) ? '1' : '0';
            
            document.getElementById(`sreg-${flag}`).innerHTML = flag_value; // set the inner HTML

            // If it's changed, make the display different
            if (this.interpreter.sreg.getChange() && ((change >> i) & 1)) {
                document.getElementById(`sreg-${flag}`).style.backgroundColor = change_background_colour;
                document.getElementById(`sreg-${flag}`).style.color = change_text_colour;
            } else {
                document.getElementById(`sreg-${flag}`).style.backgroundColor = no_change_background_colour;
                document.getElementById(`sreg-${flag}`).style.color = no_change_text_colour;
            }

        }
    }

    populatePointers() {
        // can't all be done in a loop since theyre all different

        if (!this.assembled) {
            return;
        }

        const pc = this.convertValueToBase(this.interpreter.getPC(), 4);
        const sp = this.convertValueToBase(this.interpreter.getSP(), 4);
        const x = this.convertValueToBase(this.interpreter.getX(), 4);
        const y = this.convertValueToBase(this.interpreter.getY(), 4);
        const z = this.convertValueToBase(this.interpreter.getZ(), 4);

        document.getElementById('reg-PC').innerHTML = pc;
        document.getElementById('reg-SP').innerHTML = sp;
        document.getElementById('reg-X').innerHTML = x;
        document.getElementById('reg-Y').innerHTML = y;
        document.getElementById('reg-Z').innerHTML = z;

    }

    populatePMEM(start_cell) {
        if (!this.assembled) {
            return;
        }

        const num_lines = 8; // number of lines in the table

        const pc = this.interpreter.getPC();

        const normal_background_colour = (this.theme === 'light') ? '#bbb' : '#474747';
        const normal_text_colour = (this.theme === 'light') ? '#333' : '#fff';

        const pc_background_colour = '#4a5cff';
        const pc_text_colour = '#fff';

        for (let line = 0; line < num_lines; line++) {
            let real_line = start_cell + line;
            document.getElementById(`pmem-linenum-${line}`).innerHTML = real_line.toString(this.base);

            let line_value = this.interpreter.getPMEM()[start_cell + line];  // get the line to print

            // If the opcode display = true 
            if (this.display_opcode) {
                if (line_value !== null) {                    // replace null lines with (two line inst.)
                    line_value = line_value.getOpcode().slice(0, 16);
                } else {
                    line_value = this.interpreter.getPMEM()[start_cell + line - 1];
                    line_value = line_value.getOpcode().slice(16);
                }
            }

            // If the instruction is to be display, not the opcode
            else {

                if (line_value !== null) {                    // replace null lines with (two line inst.)
                    line_value = line_value.toString(this.base);
                } else {
                    line_value = '(two line inst.)';
                }
            }

            document.getElementById(`pmem-line-${line}`).innerHTML = line_value;

            // If it's the pc line
            // If it's changed, make the display different
            if ((start_cell + line) === pc) {
                document.getElementById(`pmem-linenum-${line}`).style.backgroundColor = pc_background_colour;
                document.getElementById(`pmem-linenum-${line}`).style.color = pc_text_colour;
            } else {
                document.getElementById(`pmem-linenum-${line}`).style.backgroundColor = normal_background_colour;
                document.getElementById(`pmem-linenum-${line}`).style.color = normal_text_colour;
            }

        }
        
    }

    populateDMEM(start_cell) {
        if (!this.assembled) {
            return;
        }

        const num_lines = 8; // number of lines in the table
        const num_rows = 8; // number of lines in the table

        const sp = this.interpreter.getSP();
        const x = this.interpreter.getX();
        const y = this.interpreter.getY();
        const z = this.interpreter.getZ();

        const normal_background_colour = (this.theme === 'light') ? '#ddd' : '#7e7e7e';
        const normal_text_colour = (this.theme === 'light') ? '#444' : '#fff';

        const sp_background_colour = '#da920d';
        const x_background_colour = '#32bd32';
        const y_background_colour = '#20a3a3';
        const z_background_colour = '#bd0c47';
        const pointer_text_colour = '#fff';

        for (let line = 0; line < num_lines; line++) {

            let line_value = (start_cell + (num_rows * line)).toString(this.base);     // Calculate line start cell number as base 16 string

            // Add 0's to the front until it's 4 digits long
            for (let i = line_value.length; i < 4; i++) {
                line_value = '0' + line_value;
            }

            // Put the line value in the html
            document.getElementById(`dmem-linenum-${line}`).innerHTML = line_value;

            // Put the cell values in the html
            for (let row = 0; row < num_rows; row++) {
                const cell_number = start_cell + row + (num_rows * line);

                let cell_value = this.interpreter.getDMEM()[cell_number];
                cell_value = (this.display_ascii) ? this.getAscii(cell_value) : this.convertValueToBase(cell_value, 2);

                // Assume it's not being pointed to by SP, X, Y, or Z
                document.getElementById(`dmem-line-${line}${row}`).innerHTML = cell_value;
                document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = normal_background_colour;
                document.getElementById(`dmem-line-${line}${row}`).style.color = normal_text_colour;

                
                // Check if it's SP, X, Y, Z
                if (cell_number === sp) {
                    document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = sp_background_colour;
                    document.getElementById(`dmem-line-${line}${row}`).style.color = pointer_text_colour;
                } else if (cell_number === z) {
                    document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = z_background_colour;
                    document.getElementById(`dmem-line-${line}${row}`).style.color = pointer_text_colour;
                } else if (cell_number === y) {
                    document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = y_background_colour;
                    document.getElementById(`dmem-line-${line}${row}`).style.color = pointer_text_colour;
                } else if (cell_number === x) {
                    document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = x_background_colour;
                    document.getElementById(`dmem-line-${line}${row}`).style.color = pointer_text_colour;
                }
            }
        }
    }

    populateStats() {
        if (!this.assembled) {
            return;
        }

        document.getElementById('stats-instructions-executed').innerHTML = this.interpreter.step_count;
        document.getElementById('stats-clock-cycles').innerHTML = this.interpreter.cycles;
        document.getElementById('stats-branches-seen').innerHTML = this.interpreter.branches_seen;
        document.getElementById('stats-branches-taken').innerHTML = this.interpreter.branches_taken;
    }

    success(text) {
        this.assembled = true;
        document.getElementById('output').innerHTML = text;
        document.getElementById('error').innerHTML = null;
        document.getElementById('status').innerHTML = null;
    }

    emptyStatus() {
        document.getElementById('output').innerHTML = null;
        document.getElementById('error').innerHTML = null;
        document.getElementById('status').innerHTML = '---';
    }

    newError(text) {
        this.assembled = false;
        document.getElementById('error').innerHTML = text;
        document.getElementById('output').innerHTML = null;
        document.getElementById('status').innerHTML = null;
        throw new SyntaxError(text);
    }

    displayPMEMUp() {

        this.hideOpenPopup(this.current_popup); // hide any open popup

        if (this.pmem_top >= 8) {
            this.pmem_top -= 8;
            this.populatePMEM(this.pmem_top);
        }
    }

    displayPMEMDown() {
        
        this.hideOpenPopup(this.current_popup); // hide any open popup

        if (this.pmem_top <= (this.parser.flashend - 8)) {
            this.pmem_top += 8;
            this.populatePMEM(this.pmem_top);
        }
    }

    displayDMEMUp() {

        this.hideOpenPopup(this.current_popup); // hide any open popup

        if (this.dmem_top >= 0x140) {
            this.dmem_top -= 0x40;
            this.populateDMEM(this.dmem_top);
        }
    }

    displayDMEMDown() {

        this.hideOpenPopup(this.current_popup); // hide any open popup

        if (this.dmem_top <= (this.parser.ramend - 0x40)) {
            this.dmem_top += 0x40;
            this.populateDMEM(this.dmem_top);
        }
    }

    displayDMEMTop() {
        this.hideOpenPopup(this.current_popup); // hide any open popup
        this.dmem_top = 0x100;
        this.populateDMEM(this.dmem_top);
    }

    displayDMEMBottom() {
        this.hideOpenPopup(this.current_popup); // hide any open popup
        this.dmem_top = (this.parser.ramend - 0x3f);
        this.populateDMEM(this.dmem_top);
    }

    getStepSize() {
        return parseInt(document.getElementById('step_size').value);
    }

    convertValueToBase(value, num_digits) {
        // Returns the value in the this.base base with a given number of digits
        let n = value.toString(this.base);

        if (this.base === 16) {

            for (let i = n.length; i < num_digits; i++) {
                n = '0' + n;
            }
        }

        return n;
    }

    changeBase() {

        this.hideOpenPopup(this.current_popup); // hide any open popup

        if (this.base === 16) {
            this.base = 10;
            document.getElementById('button_base').innerHTML = 'Current Base: 10';
        }

        else {
            this.base = 16;
            document.getElementById('button_base').innerHTML = 'Current Base: 16';
        }

        this.populateAll();
    }

    toggleOpcodeDisplay() {
        this.hideOpenPopup(this.current_popup); // hide any open popup
        this.display_opcode = !(this.display_opcode);
        if (this.display_opcode) {
            document.getElementById('button-opcode').innerHTML = 'Opcode Off';
        } else {
            document.getElementById('button-opcode').innerHTML = 'Opcode On';
        }
        this.populatePMEM(this.pmem_top);
    }

    toggleAsciiDisplay() {
        this.hideOpenPopup(this.current_popup); // hide any open popup
        this.display_ascii = !(this.display_ascii);
        if (this.display_ascii) {
            document.getElementById('button-ascii').innerHTML = 'Ascii Off';
        } else {
            document.getElementById('button-ascii').innerHTML = 'Ascii On';
        }
        this.populateDMEM(this.dmem_top);
    }

    clearConsole() {
        this.hideOpenPopup(this.current_popup); // hide any open popup
        document.getElementById('console').innerHTML = '';
    }

    togglePopup(name) {
        // Remove any open popups 
        if ( (this.current_popup !== null) && (this.current_popup !== name) ) this.hideOpenPopup(this.current_popup);

        const popup = document.getElementById(`popup-${name}`);

        let inst = null;

        if (!['PC', 'SP', 'X', 'Y', 'Z'].includes(name)) inst = document.getElementById(`pmem-line-${name}`).innerHTML;

        if (inst === 'None') return;

        popup.classList.toggle("show");

        // If you're opening a new popup set it as the current popup and fill it
        if ( this.current_popup !== name) {
            this.current_popup = name;
            this.fillPopup();
        }
        // Else set the popup to null since you've closed an already open popup
        else this.current_popup = null;
    }

    hideOpenPopup(name) {
        if (this.current_popup == null) return;
        
        const popup = document.getElementById(`popup-${name}`);
        popup.classList.toggle("show", false);
    }

    fillPopup() {
        // Do nothing for closed popups
        if (this.current_popup === null) return;

        const popup = document.getElementById(`popup-${this.current_popup}`);

        // Make adjustments for PMEM popups
        let inst = null;
        if (!['PC', 'SP', 'X', 'Y', 'Z'].includes(this.current_popup)) {
            inst = document.getElementById(`pmem-line-${this.current_popup}`).innerHTML;
            popup.innerHTML = `${inst}<br><br>`;
        } else {
            popup.innerHTML = '';
        }

        // Get the instruction mnemonic if it's a PMEM popup 
        let inst_mnemonic;
        if (inst !== null) inst_mnemonic = inst.split(' ')[0];   // e.g. LDI, ASR, MOV.
        else inst_mnemonic = this.current_popup;

        let popup_options;                          // the lines for that given popup
        if (inst_mnemonic === 'LD') {
            const word_reg = inst.split(' ')[2];

            if ( word_reg.includes('X') ) popup_options = this.getPopups()['LD_X'].split('\n');
            else if ( word_reg.includes('Y') ) popup_options = this.getPopups()['LD_Y'].split('\n');
            else popup_options = this.getPopups()['LD_Z'].split('\n');

        } else if (inst_mnemonic === 'ST') {
            const word_reg = inst.split(' ')[1];

            if ( word_reg.includes('X') ) popup_options = this.getPopups()['ST_X'].split('\n');
            else if ( word_reg.includes('Y') ) popup_options = this.getPopups()['ST_Y'].split('\n');
            else popup_options = this.getPopups()['ST_Z'].split('\n');
            
        } else {
            
            if ( this.inst_set.isInstruction(inst_mnemonic) ||  ['PC', 'SP', 'X', 'Y', 'Z'].includes(inst_mnemonic)) popup_options = this.getPopups()[inst_mnemonic].split('\n'); // get the text for that instruction
            else popup_options = '';
            
        }


        // Add the text with a break for every \n in the text
        for (let i = 0; i < popup_options.length; i++) {
            popup.innerHTML += `${popup_options[i]}<br>`;
        }

    }

    makeAsciiTable() {
        return [
            'NUL', 'SOH', 'STX', 'ETX', 'EOT', 'ENQ', 'ACK', 'BEL', 'BS', 'HT', 'LF', 'VT', 'FF', 'CR', 'SO', 'SI',
            'DLE', 'DC1', 'DC2', 'DC3', 'DC4', 'NAK', 'SYN', 'ETB', 'CAN', 'EM', 'SUB', 'ESC', 'FS', 'GS', 'RS', 'US',
            'SP', '!', '\"', '#', '$', '%', '&', '\'', '(', ')', '*', '+', ',', '-', '.', '/', '0', '1', '2', '3', '4',
            '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?', '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
            'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', '\\', ']', '^',
            '_', '`', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
            't', 'u', 'v', 'w', 'x', 'y', 'z', '{', '|', '}', '~', 'DEL', '€', 'N/A', '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ',
            '‰', 'Š', '‹', 'Œ', 'N/A', 'Ž', 'N/A', 'N/A', '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ',
            'N/A', 'ž', 'Ÿ', 'NBSP', '¡', '¢', '£', '¤', '¥', '¦', '§', '¨', '©', 'ª', '«', '¬', 'SHY', '®', '¯', '°',
            '±', '²', '³', '´', 'µ', '¶', '·', '¸', '¹', 'º', '»', '¼', '½', '¾', '¿', 'À', 'Á', 'Â', 'Ã', 'Ä', 'Å',
            'Æ', 'Ç', 'È', 'É', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï', 'Ð', 'Ñ', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', '×', 'Ø', 'Ù', 'Ú',
            'Û', 'Ü', 'Ý', 'Þ', 'ß', 'à', 'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï',
            'ð', 'ñ', 'ò', 'ó', 'ô', 'õ', 'ö', '÷', 'ø', 'ù', 'ú', 'û', 'ü', 'ý', 'þ', 'ÿ'
        ];
    }

    // Returns the ASCII equivalent character
    getAscii(n) {
        return this.ascii_table[n];
    }

    // Returns the popups instructions list
    getPopups() {
        const popups = {
            'ADC': `Syntax:   ADC Rd, Rr
                    Family:   Arithmetic Instructions
                    Function: Adds both registers and the value of the C flag together

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    Rd = Rd + Rr + C`,
            'ADD': `Syntax: ADD Rd, Rr
                    Family: Arithmetic Instructions
                    Function: Adds both registers together

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    Rd = Rd + Rr`,
            'ADIW': `Syntax:   ADIW Rd, K
                    Family:   Arithmetic Instructions
                    Function: Adds K to the word register Rd+1:Rd

                    Boundaries:
                    Rd → [R24, R26, R28, R30]
                    K  → [0 - 63]

                    Operation:
                    Rd+1:Rd = Rd+1:Rd + K

                    Example:
                    ADIW R24, 15
                    → R25:R24 = R25:R24 + 15`,
            'AND': `Syntax:   AND Rd, Rr
                    Family:   Logic Instructions
                    Function: Performs the logical AND on the bit values of Rd and Rr

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    Rd = Rd • Rr`,
            'ANDI': `Syntax:   ANDI Rd, K
                    Family:   Logic Instructions
                    Function: Performs the logical AND on the bit values of Rd and K

                    Boundaries:
                    Rd → [R16 - R31]
                    K  → [0 - 255]

                    Operation:
                    Rd = Rd • K`,
            'ASR': `Syntax:   ASR Rd
                    Family:   Bit & Bit Test Instructions
                    Function: Shifts every bit to the right. Bit 7 doesnt change. Bit 0 goes into C flag.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operations:
                    C = Rd(0)
                    Rd(7) → unchanged
                    Rd(6:0) = Rd(7:1)

                    Example:
                    ASR R20 (where R20 = 10010011 = 147)
                    → C = 1
                    → R20 = 11001001 = 201`,
            'BCLR': `Syntax:   BCLR s
                    Family:   Bit & Bit Test Instructions
                    Function: Clears a single flag in the SREG

                    Boundaries:
                    s → [0 - 7]

                    Operation:
                    SREG(s) = 0`,
            'BLD': `Syntax:   BLD Rd, b
                    Family:   Bit & Bit Test Instructions
                    Function: Loads the value of the SREG T flag into bit b of Rd

                    Boundaries:
                    Rd → [R0 - R31]
                    b → [0 - 7]

                    Operation:
                    Rd(b) = T`,
            'BRBC': `Syntax:   BRBC s, k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG bit s is cleared (SREG(s) = 0)

                    Boundaries:
                    s → [0 - 7]
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if SREG(s) = 0 }
                    PC = PC + 1 { else }`,
            'BRBS': `Syntax:   BRBS s, k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG bit s is set (SREG(s) = 1)

                    Boundaries:
                    s → [0 - 7]
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if SREG(s) = 1 }
                    PC = PC + 1 { else }`,
            'BRCC': `Syntax:   BRCC k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG carry flag is cleared (C = 0)
                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if C = 0 }
                    PC = PC + 1 { else }`,
            'BRCS': `Syntax:   BRCS k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG carry flag is set (C = 1)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if C = 1 }
                    PC = PC + 1 { else }`,
            'BREQ': `Syntax:   BREQ k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG zero flag is set (Z = 1)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if Z = 1 }
                    PC = PC + 1 { else }`,
            'BRGE': `Syntax:   BRGE k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG signed flag is cleared (S = 0)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if S = 0 }
                    PC = PC + 1 { else }`,
            'BRHC': `Syntax:   BRHC k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG half carry flag is cleared (H = 0)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if H = 0 }
                    PC = PC + 1 { else }`,
            'BRHS': `Syntax:   BRHS k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG half carry flag is set (H = 1)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if H = 1 }
                    PC = PC + 1 { else }`,
            'BRID': `Syntax:   BRID k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG interrupt flag is cleared (I = 0)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if I = 0 }
                    PC = PC + 1 { else }`,
            'BRIE': `Syntax:   BRHC k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG interrupt flag is set (I = 1)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if I = 1 }
                    PC = PC + 1 { else }`,
            'BRLO': `Syntax:   BRLO k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG carry flag is set (C = 1)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if C = 1 }
                    PC = PC + 1 { else }`,
            'BRLT': `Syntax:   BRLT k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG signed flag is set (S = 1)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if S = 1 }
                    PC = PC + 1 { else }`,
            'BRMI': `Syntax:   BRMI k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG negative flag is set (N = 1)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if N = 1 }
                    PC = PC + 1 { else }`,
            'BRNE': `Syntax:   BRNE k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG zero flag is cleared (Z = 0)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if Z = 0 }
                    PC = PC + 1 { else }`,
            'BRPL': `Syntax:   BRPL k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG negative flag is cleared (N = 0)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if N = 0 }
                    PC = PC + 1 { else }`,
            'BRSH': `Syntax:   BRSH k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG carry flag is cleared (C = 0)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if C = 0 }
                    PC = PC + 1 { else }`,
            'BRTC': `Syntax:   BRTC k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG transfer flag is cleared (T = 0)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if T = 0 }
                    PC = PC + 1 { else }`,
            'BRTS': `Syntax:   BRTS k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG transfer flag is set (T = 1)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if T = 1 }
                    PC = PC + 1 { else }`,
            'BRVC': `Syntax:   BRVC k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG overflow flag is cleared (V = 0)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if V = 0 }
                    PC = PC + 1 { else }`,
            'BRVS': `Syntax:   BRVS k
                    Family:   Branch Instructions
                    Function: Brach k spaces in PMEM if SREG overflow flag is set (V = 1)

                    Boundaries:
                    k → [-64 - 63]

                    Operations:
                    PC = PC + k + 1 { if V = 1 }
                    PC = PC + 1 { else }`,
            'BSET': `Syntax:   BSET s
                    Family:   Bit & Bit Test Instructions
                    Function: Sets a single flag in the SREG

                    Boundaries:
                    s → [0 - 7]

                    Operation:
                    SREG(s) = 1`,
            'BST': `Syntax:   BST Rd, b
                    Family:   Bit & Bit Test Instructions
                    Function: Stores the value of Rd bit b into the SREG T flag

                    Boundaries:
                    Rd → [R0 - R31]
                    b → [0 - 7]

                    Operation:
                    T = Rd(b)`,
            'CALL': `Syntax:   CALL k
                    Family:   Branch Instructions
                    Function: Calls to a subroutine within the entire Program memory. The return address (to the instruction after the CALL) will be stored onto the Stack. The Stack Pointer uses a post-decrement scheme during CALL.

                    Boundaries:
                    k → [0 - 65535]

                    Operations:
                    PC = k
                    SP = SP - 2
                    STACK ← PC + 2`,
            'CBI': `Syntax:   CBI A, b
                    Family:   Bit & Bit Test Instructions
                    Function: Clears a specified bit in an I/O register. This instruction operates on the lower 32 I/O registers with addresses 0-31.

                    Boundaries:
                    A → [0 - 31]
                    b → [0 - 7]

                    Operation:
                    I/O(A, b) = 0`,
            'CBR': `Syntax:   CBR Rd, K
                    Family:   Logic Instructions
                    Function: Clears the bits of Rd that correspond to the 1's in the binary value of K. CBR does this by performing the logical AND between Rd and the complement of K.

                    Boundaries:
                    Rd → [R16 - R31]
                    K  → [0 - 255]

                    Operation:
                    Rd = Rd • (255 - K)`,
            'CLC': `Syntax:   CLC
                    Family:   Bit & Bit Test Instructions
                    Function: Clears the carry flag (C) in the SREG

                    Operation:
                    C = 0`,
            'CLH': `Syntax:   CLH
                    Family:   Bit & Bit Test Instructions
                    Function: Clears the half carry flag (H) in the SREG

                    Operation:
                    H = 0`,
            'CLI': `Syntax:   CLI
                    Family:   Bit & Bit Test Instructions
                    Function: Clears the global interrupt flag (I) in the SREG

                    Operation:
                    I = 0`,
            'CLN': `Syntax:   CLN
                    Family:   Bit & Bit Test Instructions
                    Function: Clears the negative flag (N) in the SREG

                    Operation:
                    N = 0`,
            'CLR': `Syntax:   CLR Rd
                    Family:   Logic Instructions
                    Function: Clears a register. This instruction performs an Exclusive OR between a register and itself. This will clear all bits in the register.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation:
                    Rd = Rd ⊕ Rd`,
            'CLS': `Syntax:   CLS
                    Family:   Bit & Bit Test Instructions
                    Function: Clears the signed flag (S) in the SREG

                    Operation:
                    S = 0`,
            'CLT': `Syntax:   CLT
                    Family:   Bit & Bit Test Instructions
                    Function: Clears the transfer bit flag (T) in the SREG

                    Operation:
                    T = 0`,
            'CLV': `Syntax:   CLV
                    Family:   Bit & Bit Test Instructions
                    Function: Clears the overflow flag (V) in the SREG

                    Operation:
                    V = 0`,
            'CLZ': `Syntax:   CLZ
                    Family:   Bit & Bit Test Instructions
                    Function: Clears the zero flag (Z) in the SREG

                    Operation:
                    Z = 0`,
            'COM': `Syntax:   COM Rd
                    Family:   Logic Instructions
                    Function: Performs a ones complement of register Rd

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation:
                    Rd = 255 - Rd`,
            'CP': `Syntax:   CP Rd, Rr
                    Family:   Branch Instructions
                    Function: Performs a compare between two registers Rd and Rr. None of the registers are changed. All conditional branches can be used after this instruction.

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    Rd - Rr (not stored back into any register)`,
            'CPC': `Syntax:   CPC Rd, Rr
                    Family:   Branch Instructions
                    Function: Performs a compare between two registers Rd and Rr and also takes into account the previous carry. None of the registers are changed. All conditional branches can be used after this instruction.                    

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    Rd - Rr - C (not stored back into any register)`,
            'CPI': `Syntax:   CPI Rd, K
                    Family:   Branch Instructions
                    Function: Performs a compare between register Rd and a constant. The register is not changed. All conditional branches can be used after this instruction.

                    Boundaries:
                    Rd → [R16 - R31]
                    K → [0 - 255]

                    Operation:
                    Rd - K (not stored back into any register)`,
            'CPSE': `Syntax:   CPSE Rd, Rr
                    Family:   Branch Instructions
                    Function: Performs a compare between two registers Rd and Rr, and skips the next instruction if Rd = Rr

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation Options:
                    PC = PC + 1 { if Rd != Rr }
                    PC = PC + 2 { if Rd = Rr and the next instruction is 16 bits }
                    PC = PC + 3 { if Rd = Rr and the next instruction is 32 bits }`,
            'DEC': `Syntax:   DEC Rd
                    Family:   Arithmetic Instructions
                    Function: Subtracts 1 from the contents of register Rd and places the result in the destination register Rd. The C flag in SREG is not affected by the operation.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation:
                    Rd = Rd - 1`,
            'EOR': `Syntax:   EOR Rd, Rr
                    Family:   Logic Instructions
                    Function: Performs the logical EOR between the contents of register Rd and register Rr and places the result in the destination register Rd

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    Rd = Rd ⊕ Rr`,
            'FMUL': `Syntax:   FMUL Rd, Rr
                    Family:   Arithmetic Instructions
                    Function: This instruction performs 1.7-bit x 1.7-bit → 1.15-bit unsigned multiplication. The resulting unsigned value is stored in R1:R0.

                    Boundaries:
                    Rd → [R16 - R23]
                    Rr → [R16 - R23]

                    Operation:
                    R1:R0 ← Rd x Rr (unsigned ← unsigned x unsigned)`,
            'FMULS': `Syntax:   FMULS Rd, Rr
                    Family:   Arithmetic Instructions
                    Function: This instruction performs 1.7-bit x 1.7-bit → 1.15-bit signed multiplication. The resulting signed value is stored in R1:R0.

                    Boundaries:
                    Rd → [R16 - R23]
                    Rr → [R16 - R23]

                    Operation:
                    R1:R0 ← Rd x Rr (signed ← signed x signed)`,
            'FMULSU': `Syntax:   FMULSU Rd, Rr
                    Family:   Arithmetic Instructions
                    Function: This instruction performs 1.7-bit x 1.7-bit → 1.15-bit multiplication of a signed and an unsigned number. The resulting signed value is stored in R1:R0.

                    Boundaries:
                    Rd → [R16 - R23]
                    Rr → [R16 - R23]

                    Operation:
                    R1:R0 ← Rd x Rr (signed ← signed x unsigned)`,
            'ICALL': `Syntax:   ICALL
                    Family:   Branch Instructions
                    Function: Calls to a subroutine within the entire 4M (words) Program memory. The return address (to the instruction after the CALL) will be stored onto the Stack. See also RCALL. The Stack Pointer uses a post-decrement scheme during CALL. This instruction is not available in all devices. Refer to the device specific instruction set summary.

                    Operations:
                    PC = Z(15:0)
                    SP = SP - 2
                    STACK ← PC + 1`,
            'IJMP': `Syntax:   IJMP
                    Family:   Branch Instructions
                    Function: Indirect jump to the address pointed to by the Z (16 bits) Pointer Register in the Register File. The Zpointer Register is 16 bits wide and allows jump within the lowest 64K words (128KB) section of Program memory. This instruction is not available in all devices. Refer to the device specific instruction set summary.

                    Operation:
                    PC = Z(15:0)`,
            'IN': `Syntax:   IN Rd, A
                    Family:   Data Transfer Instructions
                    Function: Loads data from the I/O space (ports, timers, configuration registers, etc.) into register Rd in the register file

                    Boundaries:
                    Rd → [R0 - R31]
                    A → [0 - 63]

                    Operation:
                    Rd = I/O(A)`,
            'INC': `Syntax:   INC Rd
                    Family:   Arithmetic Instructions
                    Function: Adds 1 to the contents of register Rd and places the result in the destination register Rd. The C flag in SREG is not affected by the operation.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation:
                    Rd = Rd + 1`,
            'JMP': `Syntax:   JMP k
                    Family:   Branch Instructions
                    Function: Jump to an address within the entire program memory. See also RJMP. This instruction is not available in all devices. Refer to the device specific instruction set summary.

                    Boundaries:
                    k → [0 - 4194303]

                    Operation:
                    PC = k`,
            'LD_X': `Syntax: (i) LD Rd, X
                    &emsp;&emsp;&emsp;&ensp;(ii) LD Rd, X+
                    &emsp;&emsp;&emsp;&nbsp;(iii) LD Rd, -X
                    Family: Data Transfer Instructions
                    Function: Loads one byte indirect from data memory into register Rd using X as the pointer to the data memory cell. Can post-increment X with the X+ variant or can pre-decrement X with the -X variant.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation Options:
                    (i) &ensp;Rd ← (X)
                    (ii)&ensp;Rd ← (X), X = X + 1
                    (iii) X = X - 1, Rd ← (X)`,
            'LD_Y': `Syntax: (i) LD Rd, Y
                    &emsp;&emsp;&emsp;&ensp;(ii) LD Rd, Y+
                    &emsp;&emsp;&emsp;&nbsp;(iii) LD Rd, -Y
                    Family:   Data Transfer Instructions
                    Function: Loads one byte indirect from data memory into register Rd using Y as the pointer to the data memory cell. Can post-increment Y with the Y+ variant or can pre-decrement Y with the -Y variant.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation Options:
                    (i) &ensp;Rd ← (Y)
                    (ii)&ensp;Rd ← (Y), Y = Y + 1
                    (iii) Y = Y - 1, Rd ← (Y)`,
            'LD_Z': `Syntax: (i) LD Rd, Z
                    &emsp;&emsp;&emsp;&ensp;(ii) LD Rd, Z+
                    &emsp;&emsp;&emsp;&nbsp;(iii) LD Rd, -Z
                    Family:   Data Transfer Instructions
                    Function: Loads one byte indirect from data memory into register Rd using Z as the pointer to the data memory cell. Can post-increment Z with the Z+ variant or can pre-decrement Z with the -Z variant.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation Options:
                    (i) &ensp;Rd ← (Z)
                    (ii)&ensp;Rd ← (Z), Z = Z + 1
                    (iii) Z = Z - 1, Rd ← (Z)`,
            'LDD': `Syntax: (i) LDD Rd, Y+q
                    &emsp;&emsp;&emsp;&ensp;(ii) LDD Rd, Z+q
                    Family: Data Transfer Instructions
                    Function: Uses the Y (or Z) word-register as a pointer to data memory and loads the value at address Y+q (or Z+q) into register Rd, using q as the displacement from Y (or Z). Y (or Z) is left unchanged after the operation.

                    Boundaries:
                    Rd → [R0 - R31]
                    q → [0 - 63]

                    Operation Options:
                    (i)&ensp;Rd ← (Y+q) 
                    (ii) Rd ← (Z+q)`,
            'LDI': `Syntax: LDI Rd, K
                    Family: Data Transfer Instructions
                    Function: Loads an 8-bit constant directly to register 16 to 31

                    Boundaries:
                    Rd → [R16 - R31]
                    K → [0 - 255]

                    Operation:
                    Rd = K`,
            'LDS': `Syntax: LDS Rd, k
                    Family: Data Transfer Instructions
                    Function: Loads one byte indirect from data memory into register Rd using k as a pointer

                    Boundaries:
                    Rd → [R16 - R31]
                    k → [0 - 65535]

                    Operation:
                    Rd ← (k)`,
            'LPM': `Syntax: (i) LPM
                    &emsp;&emsp;&emsp;&ensp;(ii) LPM Rd, Z
                    &emsp;&emsp;&emsp;&nbsp;(iii) LPM Rd, Z+
                    Family:   Data Transfer Instructions
                    Function: Loads one byte pointed to by the Z-register into the destination register Rd. Can post-increment Z with the Z+ variant.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation Options:
                    (i) &ensp;R0 ← (Z)
                    (ii) &ensp;Rd ← (Z)
                    (iii)&ensp;Rd ← (Z), Z = Z + 1`,
            'LSL': `Syntax:   LSL Rd
                    Family:   Bit & Bit Test Instructions
                    Function: Shifts all bits in Rd one place to the left. Bit 0 is cleared. Bit 7 is loaded into the C flag of the SREG. This operation effectively multiplies signed and unsigned values by two.
                    
                    Boundaries:
                    Rd → [R0 - R31]

                    Operations:
                    C = Rd(7)
                    Rd(7:1) = Rd(6:0)
                    Rd(0) = 0

                    Example:
                    LSL R20 (where R20 = 10010011 = 147)
                    → C = 1
                    → R20 = 00100110 = 38`,
            'LSR': `Syntax:   LSR Rd
                    Family:   Bit & Bit Test Instructions
                    Function: Shifts all bits in Rd one place to the right. Bit 7 is cleared. Bit 0 is loaded into the C flag of the SREG. This operation effectively divides an unsigned value by two. The C flag can be used to round the result.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operations:
                    C = Rd(0)
                    Rd(6:0) = Rd(7:1)
                    Rd(7) = 0

                    Example:
                    LSR R20 (where R20 = 10010011 = 147)
                    → C = 1
                    → R20 = 01001001 = 73`,
            'MOV': `Syntax: MOV Rd, Rr
                    Family: Data Transfer Instructions
                    Function: Makes a copy of one register into another. The source register Rr is left unchanged, while the destination register Rd is loaded with a copy of Rr.

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    Rd = Rr`,
            'MOVW': `Syntax: MOVW Rd, Rr
                    Family: Data Transfer Instructions
                    Function: Makes a copy of one register pair into another register pair. The source register pair Rr+1:Rr is left unchanged, while the destination register pair Rd+1:Rd is loaded with a copy of Rr+1:Rr.

                    Boundaries:
                    Rd → [R0, R2, R4, R6, etc] (even registers)
                    Rr → [R0, R2, R4, R6, etc] (even registers)

                    Operation:
                    Rd+1:Rd = Rr+1:Rr`,
            'MUL': `Syntax:   MUL Rd, Rr
                    Family:   Arithmetic Instructions
                    Function: This instruction performs 8-bit x 8-bit → 16-bit unsigned multiplication. The resulting unsigned value is stored in R1:R0.

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    R1:R0 ← Rd x Rr (unsigned ← unsigned x unsigned)`,
            'MULS': `Syntax:   MULS Rd, Rr
                    Family:   Arithmetic Instructions
                    Function: This instruction performs 8-bit x 8-bit → 16-bit signed multiplication. The resulting signed value is stored in R1:R0.

                    Boundaries:
                    Rd → [R16 - R31]
                    Rr → [R16 - R31]

                    Operation:
                    R1:R0 ← Rd x Rr (signed ← signed x signed)`,
            'MULSU': `Syntax:   MULSU Rd, Rr
                    Family:   Arithmetic Instructions
                    Function: This instruction performs 8-bit x 8-bit → 16-bit multiplication of a signed and an unsigned number. The resulting signed value is stored in R1:R0.

                    Boundaries:
                    Rd → [R16 - R23]
                    Rr → [R16 - R23]

                    Operation:
                    R1:R0 ← Rd x Rr (signed ← signed x unsigned)`,
            'NEG': `Syntax:   NEG Rd
                    Family:   Logic Instructions
                    Function: Performs a twos complement of register Rd. The value 128 is left unchanged.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation:
                    Rd = 0 - Rd`,
            'NOP': `Syntax:   NOP
                    Family:   MCU Control Instructions
                    Function: Performs a single cycle no operation

                    Operation:
                    No operation`,
            'OR': `Syntax: OR Rd, Rr
                    Family: Logic Instructions
                    Function: Performs the logical OR on the bit values of Rd and Rr

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    Rd = Rd ∨ Rr`,
            'ORI': `Syntax: ORI Rd, K
                    Family: Logic Instructions
                    Function: Performs the logical OR on the bit values of Rd and K

                    Boundaries:
                    Rd → [R16 - R31]
                    K → [0 - 255]

                    Operation:
                    Rd = Rd ∨ K`,
            'OUT': `Syntax:   OUT A, Rr
                    Family:   Data Transfer Instructions
                    Function: Stores data into the I/O space (ports, timers, configuration registers, etc.) from register Rr in the register file

                    Boundaries:
                    A → [0 - 63]
                    Rr → [R0 - R31]

                    Operation:
                    I/O(A) = Rr`,
            'POP': `Syntax:   POP Rd
                    Family:   Data Transfer Instructions
                    Function: Loads register Rd with a byte from the STACK. The Stack Pointer is pre-incremented by 1 before the POP.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation:
                    SP = SP + 1
                    Rd ← STACK (top value from the stack)`,
            'PUSH': `Syntax:   PUSH Rr
                    Family:   Data Transfer Instructions
                    Function: Stores the contents of register Rr on the STACK. The Stack Pointer is post-decremented by 1 after the PUSH.

                    Boundaries:
                    Rr → [R0 - R31]

                    Operation:
                    STACK ← Rr (Rr onto the top of the stack)
                    SP = SP - 1`,
            'RCALL': `Syntax:   RCALL k
                    Family:   Branch Instructions
                    Function: Relative call to an address within PC - 2047 and PC + 2048 (words)

                    Boundaries:
                    k → [-2048 - 2047]

                    Operation:
                    PC = PC + k + 1
                    SP = SP - 2
                    STACK ← PC + 1`,
            'RET': `Syntax:   RET
                    Family:   Branch Instructions
                    Function: Returns from subroutine. The return address is loaded from the STACK. The Stack Pointer uses a preincrement scheme during RET.

                    Operation:
                    PC(15:0) ← STACK`,
            'RJMP': `Syntax:   RJMP k
                    Family:   Branch Instructions
                    Function: Relative jump to an address within PC - 2047 and PC + 2048 (words)

                    Boundaries:
                    k → [-2048 - 2047]

                    Operation:
                    PC = PC + k + 1`,
            'ROL': `Syntax:   ROL Rd
                    Family:   Bit & Bit Test Instructions
                    Function: Shifts all bits in Rd one place to the left. The C flag is shifted into bit 0 of Rd. Bit 7 is shifted into the C flag. This operation, combined with LSL, effectively multiplies multi-byte signed and unsigned values by two.

                    Boundaries:
                    Rd → [R0 - R31]

                    Diagram:
                    &emsp;&emsp;&emsp;&emsp;&ensp;←
                    C ← [b7---------b0] ← C

                    Operations:
                    C = Rd(7)
                    Rd(7:1) = Rd(6:0)
                    Rd(0) = C

                    Example:
                    ROL R20 (where R20 = 00010011 = 19 and C = 1)
                    → C = 0
                    → R20 = 00100111 = 39`,
            'ROR': `Syntax:   ROR Rd
                    Family:   Bit & Bit Test Instructions
                    Function: Shifts all bits in Rd one place to the right. The C flag is shifted into bit 7 of Rd. Bit 0 is shifted into the C flag. This operation, combined with ASR, effectively divides multi-byte signed values by two. Combined with LSR it effectively divides multi-byte unsigned values by two. The carry flag can be used to round the result.
                    
                    Boundaries:
                    Rd → [R0 - R31]

                    Diagram:
                    &emsp;&emsp;&emsp;&emsp;&ensp;→
                    C → [b7---------b0] → C

                    Operations:
                    C = Rd(0)
                    Rd(6:0) = Rd(7:1)
                    Rd(7) = C

                    Example:
                    ROR R20 (where R20 = 00010010 = 18 and C = 1)
                    → C = 0
                    → R20 = 10001001 = 137`,
            'SBC': `Syntax:   SBC Rd, Rr
                    Family:   Arithmetic Instructions
                    Function: Subtracts two registers and subtracts with the C flag

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    Rd = Rd - Rr - C`,
            'SBCI': `Syntax:   SBC Rd, K
                    Family:   Arithmetic Instructions
                    Function: Subtracts a constant from a register and subtracts with the C flag

                    Boundaries:
                    Rd → [R0 - R31]
                    K → [0 - 255]

                    Operation:
                    Rd = Rd - K - C`,
            'SBI': `Syntax:   SBI A, b
                    Family:   Bit & Bit Test Instructions
                    Function: Sets a specified bit in an I/O register. This instruction operates on the lower 32 I/O registers with addresses 0-31.

                    Boundaries:
                    A → [0 - 31]
                    b → [0 - 7]

                    Operation:
                    I/O(A, b) = 1`,
            'SBIW': `Syntax:   SBIW Rd, K
                    Family:   Arithmetic Instructions
                    Function: Subtracts K from the word register Rd+1:Rd

                    Boundaries:
                    Rd → [R24, R26, R28, R30]
                    K  → [0 - 63]

                    Operation:
                    Rd+1:Rd = Rd+1:Rd - K

                    Example:
                    SBIW R24, 15
                    → R25:R24 = R25:R24 - 15`,
            'SBR': `Syntax: SBR Rd, K
                    Family: Logic Instructions
                    Function: Performs the logical OR on the bit values of Rd and K

                    Boundaries:
                    Rd → [R16 - R31]
                    K → [0 - 255]

                    Operation:
                    Rd = Rd ∨ K`,
            'SBRC': `Syntax:   SBRC Rr, b
                    Family:   Branch Instructions
                    Function: Tests a single bit in a register and skips the next instruction if the bit is cleared

                    Boundaries:
                    Rr → [R0 - R31]
                    b → [0 - 7]

                    Operation Options:
                    PC = PC + 1 { if Rr(b) = 1 }
                    PC = PC + 2 { if Rr(b) = 0 and the next instruction is 16 bits }
                    PC = PC + 3 { if Rr(b) = 0 and the next instruction is 32 bits }`,
            'SBRS': `Syntax:   SBRS Rr, b
                    Family:   Branch Instructions
                    Function: Tests a single bit in a register and skips the next instruction if the bit is set

                    Boundaries:
                    Rr → [R0 - R31]
                    b → [0 - 7]

                    Operation Options:
                    PC = PC + 1 { if Rr(b) = 0 }
                    PC = PC + 2 { if Rr(b) = 1 and the next instruction is 16 bits }
                    PC = PC + 3 { if Rr(b) = 1 and the next instruction is 32 bits }`,
            'SEC': `Syntax:   SEC
                    Family:   Bit & Bit Test Instructions
                    Function: Sets the carry flag (C) in the SREG

                    Operation:
                    C = 1`,
            'SEH': `Syntax:   SEH
                    Family:   Bit & Bit Test Instructions
                    Function: Sets the half carry flag (H) in the SREG

                    Operation:
                    H = 1`,
            'SEI': `Syntax:   SEI
                    Family:   Bit & Bit Test Instructions
                    Function: Sets the global interrupt flag (I) in the SREG

                    Operation:
                    I = 1`,
            'SEN': `Syntax:   SEN
                    Family:   Bit & Bit Test Instructions
                    Function: Sets the negative flag (N) in the SREG

                    Operation:
                    N = 1`,
            'SER': `Syntax:   SER
                    Family:   Logic Instructions
                    Function: Loads 255 directly to register Rd

                    Boundaries:
                    Rd → [R16 - R31]

                    Operation:
                    Rd = 255`,
            'SES': `Syntax:   SES
                    Family:   Bit & Bit Test Instructions
                    Function: Sets the signed flag (S) in the SREG

                    Operation:
                    S = 1`,
            'SET': `Syntax:   SET
                    Family:   Bit & Bit Test Instructions
                    Function: Sets the transfer bit flag (T) in the SREG

                    Operation:
                    T = 1`,
            'SEV': `Syntax:   SEV
                    Family:   Bit & Bit Test Instructions
                    Function: Sets the overflow flag (V) in the SREG

                    Operation:
                    V = 1`,
            'SEZ': `Syntax:   SEZ
                    Family:   Bit & Bit Test Instructions
                    Function: Sets the zero flag (Z) in the SREG

                    Operation:
                    Z = 1`,
            'ST_X': `Syntax: (i) ST X, Rr
                    &emsp;&emsp;&emsp;&ensp;(ii) ST X+, Rr
                    &emsp;&emsp;&emsp;&nbsp;(iii) ST -X, Rr
                    Family: Data Transfer Instructions
                    Function: Stores one byte from register Rr into data memory using indirection with X as the pointer to the data memory cell. Can post-increment X with the X+ variant or can pre-decrement X with the -X variant.

                    Boundaries:
                    Rr → [R0 - R31]

                    Operation Options:
                    (i) &ensp;(X) ← Rr
                    (ii)&ensp;(X) ← Rr, X = X + 1
                    (iii) X = X - 1, (X) ← Rr`,
            'ST_Y': `Syntax: (i) ST Y, Rr
                    &emsp;&emsp;&emsp;&ensp;(ii) ST Y+, Rr
                    &emsp;&emsp;&emsp;&nbsp;(iii) ST -Y, Rr
                    Family: Data Transfer Instructions
                    Function: Stores one byte from register Rr into data memory using indirection with Y as the pointer to the data memory cell. Can post-increment Y with the Y+ variant or can pre-decrement Y with the -Y variant.

                    Boundaries:
                    Rr → [R0 - R31]

                    Operation Options:
                    (i) &ensp;(Y) ← Rr
                    (ii)&ensp;(Y) ← Rr, Y = Y + 1
                    (iii) Y = Y - 1, (Y) ← Rr`,
            'ST_Z': `Syntax: (i) ST Z, Rr
                    &emsp;&emsp;&emsp;&ensp;(ii) ST Z+, Rr
                    &emsp;&emsp;&emsp;&nbsp;(iii) ST -Z, Rr
                    Family: Data Transfer Instructions
                    Function: Stores one byte from register Rr into data memory using indirection with Z as the pointer to the data memory cell. Can post-increment Z with the Z+ variant or can pre-decrement Z with the -Y variant.

                    Boundaries:
                    Rr → [R0 - R31]

                    Operation Options:
                    (i) &ensp;(Z) ← Rr
                    (ii)&ensp;(Z) ← Rr, Z = Z + 1
                    (iii) Z = Z - 1, (Z) ← Rr`,
            'STD': `Syntax: (i) STD Y+q, Rr
                    &emsp;&emsp;&emsp;&ensp;(ii) STD Z+q, Rr
                    Family: Data Transfer Instructions
                    Function: Uses the Y (or Z) word-register as a pointer to data memory and store the value of register Rr into address Y+q (or Z+q), using q as the displacement from Y (or Z). Y (or Z) is left unchanged after the operation.

                    Boundaries:
                    q → [0 - 63]
                    Rr → [R0 - R31]

                    Operation Options:
                    (i)&ensp;(Y+q) ← Rr 
                    (ii) (z+q) ← Rr `,
            'STS': `Syntax: STS k, Rr
                    Family: Data Transfer Instructions
                    Function: Stores the value of register Rr indirectly into data memory using k as a pointer

                    Boundaries:
                    k → [0 - 65535]
                    Rr → [R0 - R31]

                    Operation:
                    (k) ← Rr`,
            'SUB': `Syntax: SUB Rd, Rr
                    Family: Arithmetic Instructions
                    Function: Subtracts one register from another

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    Rd = Rd - Rr`,
            'SUBI': `Syntax:   SUBI Rd, K
                    Family:   Arithmetic Instructions
                    Function: Subtracts the constant K from the register Rd

                    Boundaries:
                    Rd → [R16 - R31]
                    K  → [0 - 255]

                    Operation:
                    Rd = Rd - K`,
            'SWAP': `Syntax:   SWAP Rd
                    Family:   Bit & Bit Test Instructions
                    Function: Swaps the high and low 4 bits in a register

                    Boundaries:
                    Rd → [R0 - R31]

                    Operations:
                    Rd(7:4) = Rd(3:0)
                    Rd(3:0) = Rd(7:4)

                    Example:
                    SWAP R20 (where R20 = 11110000 = 240)
                    → R20 = 00001111 = 15`,
            'TST': `Syntax:   TST Rd
                    Family:   Logic Instructions
                    Function: Tests if a register is zero or negative. Performs a logical AND between a register and itself. The register will remain unchanged.

                    Boundaries:
                    Rd → [R0 - R31]

                    Operation:
                    Rd = Rd • Rd`,
            'XCH': `Syntax:   XCH Z, Rd
                    Family:   Data Transfer Instructions
                    Function: Exchanges one byte indirect between register and data space using Z as a pointer to the data memory cell

                    Boundaries:
                    Rd → [R0 - R31]

                    Operations:
                    (Z) ← Rd
                    Rd ← (Z)`,
            'PC':  `Program Counter

                    The purpose of the program counter is to store what line of the PMEM to execute next. The line number will be highlighted in blue to help show what line.`,
            'SP':  `Stack Pointer

                    The purpose of the stack pointer is to store the location of the top of the stack. In AVR the stack pointer points to the line above the top value on the stack.`,
            'X':   `Definition: X means R27:R26 (two registers read as one 2 byte number)
                    
                    Calculation: Value of X = (R27 * 256) + R26
                    
                    Purpose: X is used to store the 2 byte address of a cell in DMEM. It is used in load and store instructions as a pointer to the relevant cell.`,
            'Y':   `Definition: Y means R29:R28 (two registers read as one 2 byte number)
                    
                    Calculation: Value of Y = (R29 * 256) + R28
                    
                    Purpose: Y is used to store the 2 byte address of a cell in DMEM. It is used in load and store instructions as a pointer to the relevant cell.`,
            'Z':   `Definition: Z means R31:R30 (two registers read as one 2 byte number)
                    
                    Calculation: Value of Z = (R31 * 256) + R30
                    
                    Purpose: Z is used to store the 2 byte address of a cell in DMEM. It is used in load and store instructions as a pointer to the relevant cell.`,
        };

        return popups;

    }

    toggleTheme() {

        let bg, fg, table_heading_bg, table_body_bg, borderColor, borderStyle, borderThickness, status_background_colour, border_radius, muted_text_colour;

        this.theme = (this.theme === 'dark') ? 'light' : 'dark';
        bg = (this.theme === 'dark') ? '#2e2e2e' : '#fff';
        fg = (this.theme === 'dark') ? '#fff' : '#444';
        table_heading_bg = (this.theme === 'dark') ? '#474747' : '#bbb';
        table_body_bg = (this.theme === 'dark') ? '#7e7e7e' : '#ddd';
        borderColor = (this.theme === 'dark') ? '#4e4e4e' : '#e0e0e0';
        status_background_colour = (this.theme === 'dark') ? '#404040' : '#eee';
        muted_text_colour = (this.theme === 'dark') ? '#aaa' : '#777';
        
        borderStyle = 'solid';
        borderThickness = '1px';
        border_radius = '10px';

        document.getElementById('button_theme').innerHTML = (this.theme === 'dark') ? 'Theme: Dark' : 'Theme: Light';

        document.querySelector(':root').style.setProperty('--bg', bg);
        document.querySelector(':root').style.setProperty('--fg', fg);
        document.querySelector(':root').style.setProperty('--color-text-muted', muted_text_colour);

        document.getElementById('status').style.backgroundColor = status_background_colour;
        document.getElementById('status').style.border = borderThickness + ' ' + borderStyle + ' ' + borderColor;


        const panels = document.getElementsByClassName('panel');
        for (let i = 0; i < panels.length; i++) {
            panels[i].style.border = borderThickness + ' ' + borderStyle + ' ' + borderColor;
        }

        // Include the ISA link button and download link button
        const buttons = document.getElementsByClassName('button');
        for (let i = 0; i < buttons.length; i++) {
            //buttons[i].style.color = bg;  // was acting weird before so I kept these two lines just in case. Will reuse them if it acts up again.
            //buttons[i].style.color = fg;
            buttons[i].style.backgroundColor = (this.theme === 'light') ? '#eee' : '#3e3e3e';
            buttons[i].style.borderColor = (this.theme === 'light') ? '#d0d0d0' : '#5e5e5e';
            buttons[i].style.border = borderThickness + ' ' + borderStyle + ' ' + borderColor;
        }

        const text_boxes = document.getElementsByTagName('textarea');
        for (let i = 0; i < text_boxes.length; i++) {
            text_boxes[i].style.borderColor = borderColor;
        }

        const table_headings = document.getElementsByTagName('th');
        for (let i = 0; i < table_headings.length; i++) {
            table_headings[i].style.backgroundColor = table_heading_bg;
        }

        const table_bodies = document.getElementsByTagName('td');
        for (let i = 0; i < table_bodies.length; i++) {
            table_bodies[i].style.backgroundColor = table_body_bg;
        }

        const smalls_body = [...document.getElementsByClassName('table-reg-small'),
        ...document.getElementsByClassName('table-sreg-small'),
        ...document.getElementsByClassName('table-dmem-body-small')];
        for (let i = 0; i < smalls_body.length; i++) {
            smalls_body[i].style.backgroundColor = table_body_bg;
        }

        const smalls_headings = document.getElementsByClassName('table-pmem-heading-small');
        for (let i = 0; i < smalls_headings.length; i++) {
            smalls_headings[i].style.backgroundColor = table_heading_bg;
        }

        this.populateAll();
    }

}

app = new App();



