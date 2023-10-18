class Token {
    constructor(type_, value = null) {
        this.type = type_;
        this.value = value;
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
    toString() {
        return `${this.type}:${this.value}`;
    }
}

class Register {
    constructor(name, value = 0, changed = 0) {
        this.name = name;
        this.value = value;
        this.last_value = value;
        this.changed = changed;
    }
    toString() {
        return `${this.name}: ${this.value}`
    }
    clearChange() {
        `To be done at the start of
        every new instruction.`

        this.changed = 0;
    }
    setChange() {
        this.changed = 1;
    }
    getChange() {
        return this.changed;
    }
    setValue(new_value) {
        this.last_value = this.value;
        this.value = ((new_value % 0x100) + 0x100) % 0x100;
        this.setChange();
    }
    getValue() {
        return this.value;
    }
    getLastValue() {
        return this.last_value;
    }
    getBit(bit) {
        // returns the value of a bit in a number
        return ((this.getValue() >> bit) & 1);
    }
    getLastBit(bit) {
        // returns the value of a bit in a number
        return ((this.getLastValue() >> bit) & 1);
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
        this.opcode = this.makeOpcode();
    }
    twosComp(number, digits) {

        if (number >= 0) {
            return this.binLenDigits(number, digits);
        }

        let b = (2 ** (digits - 1)) + number;
        b = b.toString(2);

        // Remove digits from the front if it's too long
        if (b.length >= digits) {
            b = b.slice(b.length - digits);
            return b;
        }
        // Add digits to the front if it's too short
        const zeros = digits - b.length;
        for (let i = 0; i < zeros; i++) {
            b = '1' + b;
        }
        return b;
    }
    binLenDigits(number, digits) {
        let b = number.toString(2);
        // Remove digits from the front if it's too long
        if (b.length >= digits) {
            b = b.slice(b.length - digits);
            return b;
        }
        // Add digits to the front if it's too short
        const zeros = digits - b.length;
        for (let i = 0; i < zeros; i++) {
            b = '0' + b;
        }
        return b;
    }
    countElements(string, symbol) {
        let count = 0;
        for (let i = 0; i < string.length; i++) {
            if (string[i] === symbol) {
                count += 1;
            }
        }
        return count;
    }
    makeOpcode() {
        const inst = this.inst.getValue();
        const opcode_requirements = INST_OPCODES[inst];
        // If it's a simple opcode
        if (opcode_requirements !== null) {
            const arg_len = this.args.length;
            // Return the opcode if it's always the same opcode
            if (opcode_requirements.length === 1) {
                return opcode_requirements[0];
            }
            // Get the opcode for use later
            let opcode = opcode_requirements[opcode_requirements.length - 1];
            // GO THROUGH EACH ARGUMENT AND SYMBOL ASSOCIATED WITH IT AND REPLACE THEM IN THE GIVEN OPCODE
            for (let arg_num = 0; arg_num < arg_len; arg_num++) {
                const symbol = opcode_requirements[arg_num]; //  the symbol for replacing in the opcode e.g. 'd'
                const digit_count = this.countElements(opcode, symbol); // number of digits the argument takes up in the opcode
                if (digit_count === 0) { // skip if it's an argument that doesnt matter (like Z in XCH)
                    continue
                }
                const arg = this.args[arg_num].getValue(); // the argument value
                let var_value;
                // If it's a 2's comp value then make it 2's comp
                if (['RJMP'].concat(INST_LIST.slice(7, 27)).includes(this.inst.getValue())) {
                    var_value = this.twosComp(arg, digit_count);
                }
                else if (FUNCTIONS.includes(arg)) {
                    var_value = '1111111111111111111111';
                }
                // Otherwise just make it regular binary
                else {
                    var_value = this.binLenDigits(arg, digit_count);
                }

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

        if (this.args[0].getType() === 'REG') {
            arg1 = `R${arg1}`;
        }

        else if (this.args[0].getType() === 'INT') {
            arg1 = arg1.toString(base);
        }

        if (argsLen === 1) {

            return `${inst} ${arg1}`;
        }


        let arg2 = this.args[1].getValue();

        if (this.args[1].getType() === 'REG') {
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
    }

    newData(text) {
        this.text = text;

        const toks_info = this.tokenize(this.text);

        this.token_lines = toks_info[0];
        this.line_numbers = toks_info[1]; // text file line number for each token line

    }

    tokenize(code) {
        /**
         * Takes the code as raw text and returns the tokens as a list of
         * lists where each list is a single line as its tokens.
         */

        // Define regular expressions for each token type
        const patterns = [
            [/^;.*/, null],                     // comments
            [/^\s+/, null],                     // whitespace
            [/^[\w_]{1}[^;]*:/, 'LABEL'],       // labels
            [/^lo8(?=[(])|^LO8(?=[(])/, 'LO8'],               // lo8
            [/^hi8(?=[(])|^HI8(?=[(])/, 'HI8'],               // hi8
            [/^[rR]\d+(?=[,;\s])/, 'REG'],                // registers
            [/^-{0,1}0x[\dABCDEFabcdef]+|^-{0,1}\$[\dABCDEFabcdef]+|^-{0,1}0b[01]+/, 'INT'], // numbers
            [/^-{0,1}\d+/, 'INT'],              // numbers
            [/^[a-zA-Z]{2,6}/, 'INST'],         // instructions → CAN TURN LABELS USED IN AN INSTRUCTION INTO INST TYPE
            [/^\".*?\"|^\'.*?\'/, 'STR'],       // string
            [/^\.[^\.\s]+/, 'DIR'],             // directives
            [/^[YZ][ \t]*\+[ \t]*\d{1,2}/, 'WORDPLUSQ'],    // word+q
            [/^[X][ \t]*\+[ \t]*\d{1,2}/, 'XPLUSQ'],    // X+q
            [/^[XYZ]\+/, 'WORDPLUS'],           // word+
            [/^-[XYZ]/, 'MINUSWORD'],           // -word
            [/^[XYZ]/, 'WORD'],                 // word
            [/^,/, 'COMMA'],                    // comma
            [/^[^\w\s;]+/, 'SYMBOL'],            // symbols
            [/^[^\s\d]{1}[\w\d_]*/, 'REF']      // references (like labels used in an instruction)
        ];

        const tokens = [];
        const line_nums = [];

        const codeArr = code.split('\n');

        // Go over every line of code and move through the line making tokens
        for (let line_number = 0; line_number < codeArr.length; line_number++) {
            let pos = 0;
            const line = codeArr[line_number] + ' ';
            const line_toks = [];

            // Iterate over the input code, finding matches for each token type
            while (pos < line.length) {
                let match = null;

                for (let i = 0; i < patterns.length; i++) {
                    const [regex, tag] = patterns[i];
                    match = regex.exec(line.slice(pos));

                    if (match) {
                        if (tag) {
                            const token = new Token(tag, match[0]);
                            line_toks.push(token);
                        }
                        break;
                    }
                }
                
                if (!match) {
                    this.newError(`Invalid syntax on line ${line_number + 1} starting at position ${pos}.`);
                }

                pos += match[0].length;

            }

            // Fixing any bad tokens (like REFs being INST tokens)
            let i = 0;
            while (i < line_toks.length) {
                let current_tok = line_toks[i];

                // Turn REG:Rn into REG:n
                if (current_tok.getType() === 'REG') {
                    const num = current_tok.getValue().substring(1); // the register number
                    current_tok.setValue(parseInt(num));
                }

                // Turn bad 'INST' back into 'REF' (unless it's actually an instruction behind a label)
                else if (i > 0 && current_tok.getType() === 'INST' && !(i === 1 && line_toks[i - 1].getType() === 'LABEL')) {
                    current_tok.setType('REF');
                }

                // If both the current and previous tokens should be 1 REF token combine them
                if (i > 0 && !['COMMA', 'SYMBOL'].includes(current_tok.getType()) && line_toks[i - 1].getType() === 'REF') {
                    line_toks[i - 1].setValue(line_toks[i - 1].getValue() + current_tok.getValue());
                    line_toks.splice(i, 1); // Virtually advancing
                }

                // Actually advancing if you haven't shortened the list length as above
                else {
                    i += 1;
                }
            }

            if (line_toks.length !== 0) {           // Add to the tokens list if the line isnt empty
                tokens.push(line_toks);
                line_nums.push(line_number + 1);    // Add the line numbers of each line for later
            }

        }

        return [tokens, line_nums];

    }

    getText() {
        return this.text;
    }

    getTokenLines() {
        return this.token_lines;
    }

    getLineNumbers() {
        return this.line_numbers;
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
        this.line_numbers = [];
        this.pmem_line_numbers = [];
        this.pmem = [];
        this.dmem = [];

        // DEFINING THE SIZE OF DMEM AND PMEM
        this.ramend = 0x8FF;
        this.flashend = 0x3FFF;

    }

    newData(token_lines, line_numbers, txt) {
        this.token_lines = token_lines;
        this.line_numbers = line_numbers;
        this.pmem_line_numbers = [];
        this.txt = txt;
        this.lines = this.txt.split('\n');

        this.labels = Object.create(null);

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
        /**
        * Parses the tokens given in the initialization of
        * the parser. The parser raises an error if there
        * is invalid syntax, otherwise it prepares the tokens
        * to be read by an interpreter and returns None.
        */

        //////////////////////////////////////////////
        ////////// CHECK SECTION DIRECTIVES //////////
        //////////////////////////////////////////////

        const first_line = this.token_lines[0];

        // Check if first line is a .section directive
        if (first_line[0].getType() !== "DIR" || first_line[0].getValue() !== ".section") {
            this.newError("First line must be a '.section' directive");
        }

        // Check if the first line is correct length and directives
        if (first_line.length !== 2 || first_line[1].getType() !== "DIR" || ![".data", ".text"].includes(first_line[1].getValue())) {
            this.newError("First line must be '.section .data' or '.section .text'");
        }

        // Check if last line is .end
        const final_line = this.token_lines[this.token_lines.length - 1];
        if (final_line.length > 1 || final_line[0].getType() !== "DIR" || final_line[0].getValue() !== ".end") {
            this.newError("Final line must be '.end'");
        }

        // Find .section .text start
        let text_section_start = null;
        for (let line_num = 0; line_num < this.token_lines.length; line_num++) {
            const line = this.token_lines[line_num];
            const line_in_file = this.line_numbers[line_num];

            // If you find a .section directive check it
            if (line[0].getValue() === ".section" && line[0].getType() === "DIR") {
                
                if (line.length !== 2 || line[1].getType() !== "DIR" || ![".data", ".text"].includes(line[1].getValue())) {
                    this.newError(`Invalid '.section' directive on line ${line_in_file}.`);
                }

                // If you find the text section then stop looking
                if (line[1].getValue() === ".text") {
                    text_section_start = line_num;
                    break;
                }
            }
        }

        // If there's no text section, raise an error
        if (text_section_start === null) {
            this.newError("File must contain a '.section .text'");
        }

        //////////////////////////////////////////////
        //////////////// CHECK TOKENS ////////////////
        //////////////////////////////////////////////

        // Go through each line
        for (let line_num = 0; line_num < this.token_lines.length; line_num++) {

            const line = this.token_lines[line_num];             // tokens in the current line
            const line_length = line.length;                     // number of tokens in the line
            const line_in_file = this.line_numbers[line_num];    // the current line if there's an error

            // Go through each token and make them the correct format
            for (let tok_num = 0; tok_num < line_length; tok_num++) {

                const current_tok = line[tok_num];

                // Check INST and make upper case
                if (current_tok.getType() === 'INST') {
                    current_tok.setValue(current_tok.getValue().toUpperCase()); // make all instructions upper case

                    if (!INST_LIST.includes(current_tok.getValue())) { // check if the token is a valid instruction
                        this.newError(`Invalid instruction \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }
                }

                // Check REG are valid numbers
                else if (current_tok.getType() === 'REG') {
                    const reg_number = current_tok.getValue();

                    if (reg_number > 31) {
                        this.newError(`Illegal register \'R${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }
                }

                // Check DIR are valid directives
                else if (current_tok.getType() === 'DIR' && !DIRECTIVES.includes(current_tok.getValue())) {
                    this.newError(`Invalid directive \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                }

                // Convert integers to base 10
                else if (current_tok.getType() === 'INT') {

                    let int_value = 0;

                    // this line is technically irrelevant since parseInt deals with 0x already
                    if (current_tok.getValue().includes('x')) {
                        int_value = parseInt(current_tok.getValue().slice(2), 16);
                    }

                    else if (current_tok.getValue().includes('$')) {
                        int_value = parseInt(current_tok.getValue().slice(1), 16);
                    }

                    else if (current_tok.getValue().includes('b')) {
                        int_value = parseInt(current_tok.getValue().slice(2), 2);
                    }

                    else {
                        int_value = parseInt(current_tok.getValue());
                    }

                    current_tok.setValue(int_value);

                }

            }

        }

        //////////////////////////////////////////////
        //////////////// DATA SECTION ////////////////
        //////////////////////////////////////////////

        // Check data section exists
        const data_section_exists = (text_section_start !== 0);

        let line_num = 0;

        const definitions = Object.create(null);

        // Create pre-existing definitions
        const reg_defs = {
            'ZH': 31,
            'ZL': 30,
            'YH': 29,
            'YL': 28,
            'XH': 27,
            'XL': 26
        };
        for (let [key, value] of Object.entries(reg_defs)) {
            definitions[key] = value;
        }

        // GO THROUGH LINES IN DATA SECTION
        while (data_section_exists && (line_num < text_section_start)) {

            if (line_num === 0) {                               // skip if it's the .section .data line
                line_num += 1;
                continue
            }

            const line = this.token_lines[line_num];
            const line_length = line.length;                    // calculate number of tokens in the line
            const line_in_file = this.line_numbers[line_num];   // the current line if there's an error

            let tok_num = 0;

            // DEAL WITH LABELS AT THE START OF THE LINE
            if (line[tok_num].getType() === 'LABEL') {
                let label = line[0].getValue();                 // get label with the colon at the end
                label = label.slice(0, (label.length - 1)).trim();
                this.labels[label] = this.dmem.length;          // add location of the data label
                tok_num += 1;
                if (tok_num >= line_length) {
                    line_num += 1;
                    continue;
                }
            }

            // CHECK THE DIRECTIVE
            if (line[tok_num].getType() !== 'DIR') {
                this.newError(`Illegal syntax \'${line[tok_num].getValue()}\' on line ${line_in_file}.`);
            }

            const line_directive = line[tok_num].getValue();    // get the directive for this line to use below

            tok_num += 1;                                       // Move to the next token in the line

            // EXECUTE THE DIRECTIVE
            while (tok_num < line_length) {

                const current_tok = line[tok_num];

                const parity_of_tokens_left = (line_length - 1 - tok_num) % 2; // used for calculating comma placement

                ///// EXECUTE THE DIRECTIVES /////

                // Byte directive
                if (parity_of_tokens_left === 0 && line_directive === '.byte') {

                    if (current_tok.getType() !== 'INT') { // expecting integer
                        this.newError(`Bad token \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }
                    if (current_tok.getValue() < 0) {                               // JS has weird behaviour for -n % m so we need to correct for it
                        this.dmem.push(0x100 + (current_tok.getValue() % 0x100));   // fix then add to data
                    } else {
                    this.dmem.push(current_tok.getValue() % 0x100); // add to data
                    }
                }

                // String, Ascii, Asciz directives
                else if (parity_of_tokens_left === 0 && ['.string', '.ascii', '.asciz'].includes(line_directive)) {

                    if (current_tok.getType() !== 'STR') {
                        this.newError(`Bad token \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }

                    let string_text = current_tok.getValue();
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
                                    this.newError(`Bad escape character \'${char}\' on line ${line_in_file}.`);
                                }
                                continue;
                            }
                        }

                        // Make the escape character ascii value
                        else {
                            // Check if it's a valid escape character
                            if (!Object.keys(escape_chars).includes(char)) {
                                this.newError(`Bad escape character \'\\${char}\' on line ${line_in_file}.`);
                            }

                            char_ascii_value = escape_chars[char]; // get ascii code

                            escape = false;
                        }

                        //if (char_ascii_value > 127) { // check it's a valid character
                        //    this.newError(`Bad character \'${char}\' on line ${line_in_file}.`);
                        //}

                        this.dmem.push(char_ascii_value % 0x100);           // add to data
                    }

                    if (['.string', '.asciz'].includes(line_directive)) {   // add NULL if directive requires it
                        this.dmem.push(0);                                  // add NULL to data
                    }

                }

                // Space directive
                else if (parity_of_tokens_left === 0 && line_directive === '.space') {

                    if (current_tok.getType() !== 'INT') { // expecting integer
                        this.newError(`Bad token \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }

                    // Check if it's the number of spaces or the content of the spaces
                    // Check if the previous token is the directive
                    // If so, it's the number of spaces

                    if (line[tok_num - 1].getType() === 'DIR') {              // if this integer is the number of values

                        const number_of_spaces = current_tok.getValue();        // the number of spaces we're making

                        if ((tok_num + 1) === line_length) {                // if there is no space value given, make them 0
                            for (let i = 0; i < number_of_spaces; i++) {
                                this.dmem.push(0);                            // add 0's for as many spaces as needed
                            }
                        }
                    }

                    // Otherwise check it's the final token
                    else if ((tok_num + 1) !== line_length) { // if it's the second argument given it must be the last
                        this.newError(`Too many arguments given for .string on line ${line_in_file}.`);
                    }

                    // If it is the final token
                    else {
                        const space_value = current_tok.getValue();             // value of the spaces
                        const number_of_spaces = line[tok_num - 2].getValue();  // the number of spaces we're making
                        for (let i = 0; i < number_of_spaces; i++) {
                            this.dmem.push(space_value % 0x100);                // add the value for as many spaces as needed
                        }
                    }


                }

                // Def directive
                else if (line_directive === '.def') {

                    // Check the number of arguments
                    if ((line_length - tok_num) > 3) { // if there's too many arguments
                        this.newError(`Too many arguments given for .def on line ${line_in_file}.`);
                    }

                    // if it's the 3rd last argument (expecting REF)
                    if ((tok_num + 3) === line_length && current_tok.getType() !== 'REF') {
                        this.newError(`Bad argument \'${current_tok.getValue()}\' on line ${line_in_file}.`)
                    }

                    // Raise error if 2nd last token is not '='
                    else if ((tok_num + 2) === line_length && current_tok.getType() !== 'SYMBOL' && current_tok.getValue() !== '=') {
                        this.newError(`Bad argument \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }

                    // If it's the last token (expecting REG)
                    else if ((tok_num + 1) === line_length) {

                        if (current_tok.getType() !== 'REG') {
                            this.newError(`Bad argument \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                        }

                        const def_word = line[tok_num - 2].getValue();  // get the definition name for the labels list

                        definitions[def_word] = current_tok.getValue(); // add the def word to the labels list
                    }

                }

                // Should be comma if there are even number of tokens left. Raise error.
                else if (parity_of_tokens_left === 1 && current_tok.getType() !== 'COMMA') {
                    this.newError(`Missing comma on line ${line_in_file}.`);
                }


                tok_num += 1;
            }

            line_num += 1;


        }

        // Should be at .section .text line now

        //////////////////////////////////////////////
        //////////////// TEXT SECTION ////////////////
        //////////////////////////////////////////////

        // Check .global line
        line_num += 1;                                          // move to the .global line
        let line = this.token_lines[line_num];                  // current line

        if (line.length !== 2 || line[0].getValue() !== '.global') {
            const line_in_file = this.line_numbers[line_num];   // the current line used for raising an error
            this.newError(`Must begin text section with a valid \'.global\' directive: line ${line_in_file}.`);
        }

        // Some variables for later
        const global_funct_name = line[1].getValue();           // the name of the global function for later
        line_num += 1;                                          // move to instructions part of text section
        const data_labels = Object.keys(this.labels);           // to be used for replacing data labels in instructions
        const definition_keys = Object.keys(definitions);
        const pmem_file_lines = [];                             // where in the text file each pmem line is 
        const opcode_32_bit = ['CALL', 'JMP', 'LDS', 'STS'];    // instructions with 32 bit opcode

        // CREATE PMEM AND GET THE LABEL LOCATIONS
        while (line_num < (this.token_lines.length - 1)) {

            let line = this.token_lines[line_num]; // current line
            const line_length = line.length; // calculate number of tokens in the line
            const line_in_file = this.line_numbers[line_num]; // the current line if there's an error

            let tok_num = 0;
            let has_label = false; // bool for if the line has a label

            // While loop does:
            // Check for labels and remove them
            // Change HI8 LO8 to integers
            // Change REF type (data labels) to integers 
            while (tok_num < line_length) {

                const current_tok = line[tok_num]; // current token

                // Check for labels and remove them
                if (current_tok.getType() === 'LABEL') {

                    // Label can only be at the start
                    if (tok_num !== 0) {
                        this.newError(`Illegal label location on line ${line_in_file}.`);
                    }

                    const label = current_tok.getValue().slice(0, (current_tok.getValue().length - 1)).trim(); // remove the colon from the end
                    this.labels[label] = this.pmem.length; //  add it to the labels dictionary
                    
                    // Check the global function label when you get to it
                    if (label === global_funct_name) {
                        this.dmem[0x5B].setValue(this.pmem.length % 0x100);
                        this.dmem[0x5C].setValue(parseInt((this.pmem.length - (this.pmem.length % 0x100)) / 0x100)); 
                        }

                    has_label = true;
                }

                // Change HI8 LO8 to integers
                else if (['HI8', 'LO8'].includes(current_tok.getType())) {

                    // Must have 3 left, a bracket, a value, and a bracket
                    if ((line_length - 1 - tok_num) !== 3) {
                        this.newError(`Illegal ${current_tok.getValue()} on line ${line_in_file}.`);
                    }

                    const left_bracket = line[tok_num + 1];
                    const variable = line[tok_num + 2];
                    const right_bracket = line[tok_num + 3];

                    // Check the token we expect to be the left bracket
                    if (left_bracket.getType() !== 'SYMBOL' || left_bracket.getValue() !== '(') {
                        this.newError(`Illegal ${current_tok.getValue()} left bracket on line ${line_in_file}.`);
                    }

                    // Check the token we expect to be the right bracket
                    if (right_bracket.getType() !== 'SYMBOL' || right_bracket.getValue() !== ')') {
                        this.newError(`Illegal ${current_tok.getValue()} right bracket on line ${line_in_file}.`);
                    }

                    // Check the variable is defined or is an int
                    if (( this.labels[variable.getValue()] === undefined && variable.getType() !== 'INT') || !['REF', 'INT'].includes(variable.getType()) ) {
                        this.newError(`Illegal ${current_tok.getValue()} variable on line ${line_in_file}.`);
                    }

                    let int_value = 0;

                    // Convert the value to the hi8/lo8 value
                    if (current_tok.getType() === 'HI8') {
                        if ( variable.getType() !== 'INT' ) {
                        int_value = this.hi8(this.labels[variable.getValue()]);
                        } else {
                            int_value = (variable.getValue() >> 8) & 0xff;
                        }
                    }

                    else {
                        if ( variable.getType() !== 'INT' ) {
                        int_value = this.lo8(this.labels[variable.getValue()]);
                        } else {
                            int_value = variable.getValue() & 0xff;
                        }
                    }

                    line[tok_num] = new Token('INT', int_value);

                    line = line.slice(0, (line.length - 3)); // remove the rest of the line

                    tok_num += 3;
                }

                // Change REF type to correct form from reference
                else if (current_tok.getType() === 'REF') {

                    // If it's in data labels
                    if (data_labels.includes(current_tok.getValue())) {
                        current_tok.setType('INT');
                        current_tok.setValue(this.labels[current_tok.getValue()]);
                    }

                    // If it's a REG definition
                    else if (definition_keys.includes(current_tok.getValue())) {
                        current_tok.setType('REG');
                        current_tok.setValue(definitions[current_tok.getValue()]);
                    }


                    // Check if it's a function call?

                    // It may be a pmem label so don't raise an error yet
                }

                tok_num += 1;
            }

            // If the line has a label AND instruction remove the label
            if (has_label && (line_length > 1)) {
                line = line.slice(1);
            }

            // Add the line to the program memory
            if ((!has_label) || (has_label && (line_length > 1))) {

                // If theyre not instructions, it's illegal
                if (line[0].getType() !== 'INST') {
                    this.newError(`Illegal token \'${line[0].getValue()}\' on line ${line_in_file}.`);
                }

                this.pmem.push(line); // set the line to the line without the label
                this.pmem_line_numbers.push(line_in_file);
                pmem_file_lines.push(line_in_file);
                const inst = line[0].getValue();

                // Add None as next line if it's a 32 bit opcode
                if (opcode_32_bit.includes(inst)) {
                    this.pmem.push(null);
                    this.pmem_line_numbers.push(null);
                    pmem_file_lines.push(line_in_file);
                }
            }

            line_num += 1;

        }

        // Check you've found the global function name
        if (this.labels[global_funct_name] === undefined) {
            this.newError(`Cannot find the global label \'${global_funct_name}\' to begin the program. Check spelling if unsure.`);
        }

        const control_flow_instructions = ['CALL', 'JMP', 'RJMP'].concat(INST_LIST.slice(7, 27)); // all the branching instructions

        // TURN ALL REFS INTO CORRECT FORM
        for (let line_num = 0; line_num < this.pmem.length; line_num++) {

            const line = this.pmem[line_num]; // current line

            if (line === null) {
                continue
            }

            const line_length = line.length;                    // calculate number of tokens in the line
            const line_in_file = pmem_file_lines[line_num];     // the current line if there's an error

            const first_tok = line[0];                          // first token in the line

            // Go through the token lines
            for (let tok_num = 0; tok_num < line_length; tok_num++) {

                const current_tok = line[tok_num];

                // Replace REF with integer for branching
                if (current_tok.getType() !== 'REF') {
                    continue
                }

                // Check the label reference is a real label or function
                if (this.labels[current_tok.getValue()] === undefined && !FUNCTIONS.includes(current_tok.getValue())) {
                    this.newError(`Illegal token \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                }

                // If it's a non relative control flow instruction and it's not a function
                if (control_flow_instructions.slice(0, 2).includes(first_tok.getValue()) && !FUNCTIONS.includes(current_tok.getValue())) {

                    let k = this.labels[current_tok.getValue()];      // Get k for label

                    // Replace it in the line
                    current_tok.setType('INT');
                    current_tok.setValue(k);
                }

                // If it's a relative control flow instruction
                else if (control_flow_instructions.slice(2).includes(first_tok.getValue())) {

                    let k = this.labels[current_tok.getValue()];      // Get k for label
                    let relative_k = k - 1 - line_num;                  // the k for relative jumping instructions

                    // Replace it in the line
                    current_tok.setType('INT');
                    current_tok.setValue(relative_k);
                }
                
            }
        }

        ////////// CHECK INSTRUCTION SYNTAX
        // Skip None lines
        // Go through and check commas in right place (then remove them)
        // Check for real instruction
        // Check number of args given is correct
        // Check if the types for each token are correct and their values are acceptable

        for (let line_num = 0; line_num < this.pmem.length; line_num++) {

            let line = this.pmem[line_num];                     // the line up to

            if (line === null) {                               // skip over none lines
                continue
            }

            let line_length = line.length;                      // calculate number of tokens in the line
            const line_in_file = pmem_file_lines[line_num];     // the current line if there's an error

            // CHECK FOR COMMA AND REMOVE THEM IF THEYRE CORRECTLY PLACED
            if (line_length > 2) {

                // If the 2rd token is not a comma then its bad syntax
                if (line[2].getType() !== 'COMMA') {
                    this.newError(`Illegal token ${line[2].getValue()} on line ${line_in_file}: expecting comma.`);
                }

                line.splice(2, 1);                       // remove the comma
                line_length -= 1;                       // line is shorter by 1
            }

            const inst = line[0].getValue();            // instruction for that line

            // CHECK IT'S A REAL INSTRUCTION
            if (INST_OPERANDS[inst] === undefined) {
                this.newError(`Illegal instruction \'${inst}\' on line ${line_in_file}.`);
            }

            // GET GIVEN AND EXPECTED ARGUMENTS
            const expected_args = INST_OPERANDS[inst];  // the arguments we expect
            const given_args = line.slice(1);           // the arguments we have

            // CHECK IF IT'S GOT THE WRONG NUMBER OF ARGUMENTS
            if ((expected_args === null && given_args.length > 0) || (expected_args !== null && (given_args.length !== expected_args.length))) {
                this.newError(`Wrong number of arguments given on line ${line_in_file} for the ${inst} instruction. Please refer to the instruction manual.`);
            }

            // CHECK THE ARGUMENTS
            for (let tok_num = 1; tok_num < line_length; tok_num++) {

                const given_arg = line[tok_num];                // given arg
                const exp_arg = expected_args[tok_num - 1];   // expected arg

                // CHECK THE TOKEN IS LEGAL
                exp_arg.isLegalToken(given_arg, line_in_file);
            }

            // SET THE LINE TO AN INSTRUCTION
            this.pmem[line_num] = new Instruction(line);
        }

    }

    getTokenLines() {
        return this.token_lines;
    }

    getLineNumbers() {
        return this.line_numbers;
    }

    hi8(val) {
        return (val >> 8) & 0xff;
        // return parseInt((val - (val % 0x100)) / 0x100);
    }

    lo8(val) {
        return val & 0xff;
        // return (val % 0x100);
    }

    getPMEM() {
        return this.pmem;
    }

    getDMEM() {
        return this.dmem;
    }

    getPMEMLineNumbers() {
        return this.pmem_line_numbers;
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
        this.line_numbers = [];
        this.sreg = new Token('REG', 0);
        this.pcl = new Token('REG', 0); // PC lo8
        this.pch = new Token('REG', 0); // PC hi8
        this.spl = new Token('REG', 0); // SP lo8
        this.sph = new Token('REG', 0); // SP hi8

        this.finished = false;
    }

    newData(pmem, dmem, pmem_line_numbers, txt) {
        // DATA & PROGRAM MEMORY
        this.pmem = pmem;
        this.dmem = dmem;
        this.line_numbers = pmem_line_numbers;
        this.txt = txt;

        this.lines = this.txt.split('\n');
        this.finished = false;
        this.step_count = 0;

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

        // Do nothing if it's finished running
        if (this.finished) {
            return;
        }

        // If it should be finished, set it to finished then return
        if (this.getPC() >= this.flashend) {
            this.finished = true;
            console.log(this.step_count);
            this.setPC(this.flashend);
            return;
        }

        const line = this.pmem[this.getPC()];
        const inst = line.getInst().getValue();
        const line_in_file = this.line_numbers[this.getPC()];

        let skip_inc = false;

        let Rd, Rr, R, K, k, b, s, A, q, w, T, H, V, N, Z, C;    // declaring all the variable names

        // Big switch statement

        switch (inst) {
            case 'ADC':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                C = this.getSREG() & 1;
                R = (((Rd + Rr + C) % 0x100) + 0x100) % 0x100;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd + Rr + C

                H = (this.getBit(Rd, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(R, 3))) | (this.getBit(Rd, 3) & (1 - this.getBit(R, 3)));
                V = (this.getBit(Rd, 7) & this.getBit(Rr, 7) & (1 - this.getBit(R, 7))) | ((1 - this.getBit(Rd, 7)) & (1 - this.getBit(Rr, 7)) & this.getBit(R, 7));
                N = this.getBit(R, 7);
                C = (this.getBit(Rd, 7) & this.getBit(Rr, 7)) | (this.getBit(Rr, 7) & (1 - this.getBit(R, 7))) | (this.getBit(Rd, 7) & (1 - this.getBit(R, 7)));
                this.updateSREG(null, null, H, N ^ V, V, N, (R === 0), C);
                break;
            case 'ADD':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                R = (((Rd + Rr) % 0x100) + 0x100) % 0x100;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd + Rr

                H = (this.getBit(Rd, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(R, 3))) | (this.getBit(Rd, 3) & (1 - this.getBit(R, 3)));
                V = (this.getBit(Rd, 7) & this.getBit(Rr, 7) & (1 - this.getBit(R, 7))) | ((1 - this.getBit(Rd, 7)) & (1 - this.getBit(Rr, 7)) & this.getBit(R, 7));
                N = this.getBit(R, 7);
                C = (this.getBit(Rd, 7) & this.getBit(Rr, 7)) | (this.getBit(Rr, 7) & (1 - this.getBit(R, 7))) | (this.getBit(Rd, 7) & (1 - this.getBit(R, 7)));
                this.updateSREG(null, null, H, N ^ V, V, N, (R === 0), C);
                break;
            case 'ADIW':
                Rd = this.getArgumentValue(line, 0);
                K = this.getArgumentValue(line, 1);
                if ((Rd + K) > 0xff) {
                    R = (Rd + K) % 0x100;
                    this.getDMEM()[line.getArgs()[0].getValue() + 1].inc();
                } else {
                    R = Rd + K;
                }
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);

                R = this.getDMEM()[line.getArgs()[0].getValue()] + (this.getDMEM()[line.getArgs()[0].getValue() + 1] << 8);
                
                V = ((R - K) <= 0x7fff) && ((R >> 15) & 1);
                N = (R > 0x7fff);
                C = (R <= 0x7fff) && ((R - K) < 0);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), C);
                break;
            case 'AND':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                R = Rd & Rr;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd & Rr

                V = 0;
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), null);
                break;
            case 'ANDI':
                Rd = this.getArgumentValue(line, 0);
                K = this.getArgumentValue(line, 1);
                R = Rd & K;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd & K

                V = 0;
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), null);
                break;
            case 'ASR':
                Rd = this.getArgumentValue(line, 0);
                R = Rd;
                R = (R >> 1) & 0xff;
                if ((R & 64) !== 0) {
                    R += 128
                }
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);

                N = this.getBit(R, 7);
                C = Rd & 1;
                V = N ^ C;
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), C);
                break;
            case 'BCLR':
                s = this.getArgumentValue(line, 0);
                this.updateSREGBit(0, s);   // Clear bit s
                break;
            case 'BLD':
                Rd = this.getArgumentValue(line, 0);
                b = this.getArgumentValue(line, 1);
                T = this.getBit(this.getSREG(), 6);

                if (T) {
                    R = Rd | ( 2 ** b );
                } else {
                    R = Rd & ( 0xff - ( 2 ** b ) );
                }

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd(b) <-- T 
                break;
            case 'BRBC':
                s = this.getArgumentValue(line, 0);
                if (1 - ((this.getSREG() >> s) & 1)) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRBS':
                s = this.getArgumentValue(line, 0);
                if ((this.getSREG() >> s) & 1) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRCC':
                if (1 - (this.getSREG() & 1)) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRCS':
                if (this.getSREG() & 1) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BREQ':
                if ((this.getSREG() >> 1) & 1) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRGE':
                if (1 - ((this.getSREG() >> 4) & 1)) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRHC':
                if (1 - ((this.getSREG() >> 5) & 1)) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRHS':
                if ((this.getSREG() >> 5) & 1) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRID':
                if (1 - ((this.getSREG() >> 7) & 1)) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRIE':
                if ((this.getSREG() >> 7) & 1) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRLO':
                if (this.getSREG() & 1) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRLT':
                if ((this.getSREG() >> 4) & 1) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRMI':
                if ((this.getSREG() >> 2) & 1) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRNE':
                if (1 - ((this.getSREG() >> 1) & 1)) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRPL':
                if (1 - ((this.getSREG() >> 2) & 1)) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRSH':
                if (1 - (this.getSREG() & 1)) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRTC':
                if (1 - ((this.getSREG() >> 6) & 1)) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRTS':
                if ((this.getSREG() >> 6) & 1) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRVC':
                if (1 - ((this.getSREG() >> 3) & 1)) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BRVS':
                if ((this.getSREG() >> 3) & 1) {
                    k = this.getArgumentValue(line, 0);
                    this.setPC(this.getPC() + k + 1);
                    skip_inc = true;
                }
                break;
            case 'BSET':
                s = this.getArgumentValue(line, 0);
                this.updateSREGBit(1, s);   // Set bit s
                break;
            case 'BST':
                Rd = this.getArgumentValue(line, 0);
                b = this.getArgumentValue(line, 1);
                T = this.getBit(Rd, b);
                this.updateSREGBit(T, 6);
                break;
            case 'CALL':
                if (line.getArgs()[0].getType() === 'INT') {
                    this.incPC();
                    this.incPC();

                    if (this.getSP() <= 0x101) {
                        this.newError(`Bad stack pointer for CALL on line ${line_in_file}.`)
                        return;
                    }

                    this.getDMEM()[this.getSP()] = this.pcl.getValue();              // push pcl in STACK
                    this.decSP();
                    this.getDMEM()[this.getSP()] = this.pch.getValue();              // push pch in STACK
                    this.decSP();

                    k = this.getArgumentValue(line, 0);
                    this.setPC(k);
                    skip_inc = true;
                    break;
                }

                // OTHERWISE IF IT'S PRINTF
                if (line.getArgs()[0].getValue() === 'printf') {
                    
                    // Check you can pop twice
                    if (this.getSP() >= (this.ramend - 1)) {
                        this.newError(`Bad stack pointer for CALL on line ${line_in_file}.`);
                        return;
                    }
                    
                    const sp = this.getSP();
                    let address = this.getDMEM()[this.getSP() + 1] + ( this.getDMEM()[this.getSP() + 2] << 8);

                    this.getDMEM()[26].setValue(0xff);
                    this.getDMEM()[27].setValue(0x08);
                    this.getDMEM()[30].setValue(0x02);
                    this.getDMEM()[31].setValue(0x01);
                    
                    // Do the printing
                    let K, char;
                    let W = 0;
                    while (true) {
                        K = this.getDMEM()[address];
                        address = address + 1;
                        W = W + 1;
                        if (K === 0) {
                            break;
                        }
                        char = String.fromCharCode(K);
                        document.getElementById('console').innerHTML += char;           // add it to the console
                    }

                    this.getDMEM()[24].setValue( W & 0xff );
                    this.getDMEM()[25].setValue( (W >> 8) & 0xff );

                    //document.getElementById('console').innerHTML += '\n';               // add a new line after a print

                    // Increment to go past the double instruction
                    this.incPC();    
                    
                    // Move the scroll to the bottom
                    const console_box = document.getElementById('console');
                    console_box.scrollTop = console_box.scrollHeight;
                    
                }
                    // Printf takes the top two values from the stack
                    // Puts them into X low byte then high byte
                    // Assumes that it is pointing at the string you want to print
                    // Prints characters with X+ until it hits a null character
                    // Pushes the new location of X onto the stack
                    // Returns

                    // X is changed
                    // The string is printed
                    // Next instruction is after
                break;
            case 'CBI':
                A = this.getArgumentValue(line, 0);
                b = this.getArgumentValue(line, 1);
                R = this.getDMEM()[A + 0x20].getValue() & (0xff - (1 << b));
                this.getDMEM()[A + 0x20].setValue(R);
                break;
            case 'CBR':
                Rd = this.getArgumentValue(line, 0);
                K = this.getArgumentValue(line, 1);
                R = Rd & (0xff - K);

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd & (0xff - K)

                V = 0;
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), null);
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
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(0);   // Rd <-- 0
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
                Rd = this.getArgumentValue(line, 0);
                R = 0xff - Rd;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- 0xff - Rd

                V = 0;
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), 1);
                break;
            case 'CP':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                R = (((Rd - Rr) % 0x100) + 0x100) % 0x100;

                H = (this.getBit(R, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(R, 3) & (1 - this.getBit(Rd, 3)));
                V = (this.getBit(R, 7) & this.getBit(Rr, 7) & (1 - this.getBit(Rd, 7))) | ((1 - this.getBit(R, 7)) & (1 - this.getBit(Rr, 7)) & this.getBit(Rd, 7));
                N = this.getBit(R, 7);
                C = (this.getBit(R, 7) & this.getBit(Rr, 7)) | (this.getBit(Rr, 7) & (1 - this.getBit(Rd, 7))) | (this.getBit(R, 7) & (1 - this.getBit(Rd, 7)));
                this.updateSREG(null, null, H, N ^ V, V, N, (R === 0), C);
                break;
            case 'CPC':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                C = this.getSREG() & 1;
                R = (((Rd - Rr - C) % 0x100) + 0x100) % 0x100;

                H = (this.getBit(R, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(R, 3) & (1 - this.getBit(Rd, 3)));
                V = (this.getBit(R, 7) & this.getBit(Rr, 7) & (1 - this.getBit(Rd, 7))) | ((1 - this.getBit(R, 7)) & (1 - this.getBit(Rr, 7)) & this.getBit(Rd, 7));
                Z = (R === 0) & ((this.getSREG() >> 1) & 1);
                N = this.getBit(R, 7);
                C = (this.getBit(R, 7) & this.getBit(Rr, 7)) | (this.getBit(Rr, 7) & (1 - this.getBit(Rd, 7))) | (this.getBit(R, 7) & (1 - this.getBit(Rd, 7)));
                this.updateSREG(null, null, H, N ^ V, V, N, Z, C);
                break;
            case 'CPI':
                Rd = this.getArgumentValue(line, 0);
                K = this.getArgumentValue(line, 1);
                R = (((Rd - K) % 0x100) + 0x100) % 0x100;

                H = (this.getBit(R, 3) & this.getBit(K, 3)) | (this.getBit(K, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(R, 3) & (1 - this.getBit(Rd, 3)));
                V = (this.getBit(R, 7) & this.getBit(K, 7) & (1 - this.getBit(Rd, 7))) | ((1 - this.getBit(R, 7)) & (1 - this.getBit(K, 7)) & this.getBit(Rd, 7));
                N = this.getBit(R, 7);
                C = (this.getBit(R, 7) & this.getBit(K, 7)) | (this.getBit(K, 7) & (1 - this.getBit(Rd, 7))) | (this.getBit(R, 7) & (1 - this.getBit(Rd, 7)));
                this.updateSREG(null, null, H, N ^ V, V, N, (R === 0), C);
                break;
            case 'CPSE':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);

                if ( Rd !== Rr ) {
                    break;
                }

                this.incPC();

                if ( this.pmem[this.getPC() + 1] !== null ) {
                    break;
                }

                this.incPC();

                break;
            case 'DEC':
                Rd = this.getArgumentValue(line, 0);
                R = (((Rd - 1) % 0x100) + 0x100) % 0x100;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd - 1

                V = (R === 127);
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), null);
                break;
            case 'EOR':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                R = Rd ^ Rr;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd ^ Rr

                V = 0;
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), null);
                break;
            case 'IN':
                Rd = this.getArgumentValue(line, 0);
                A = this.getArgumentValue(line, 1);
                R = this.getDMEM()[A + 0x20].getValue();

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- I/O(A)
                break;
            case 'INC':
                Rd = this.getArgumentValue(line, 0);
                R = (((Rd + 1) % 0x100) + 0x100) % 0x100;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd + 1

                V = (R === 128);
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), null);
                break;
            case 'JMP':
                k = this.getArgumentValue(line, 0);
                this.setPC(k);
                skip_inc = true;
                break;
            case 'LD':
                w = line.getArgs()[1].getValue();
                // Decrement X/Y/Z
                if (w[0] === '-') {
                    if (w === '-X') {
                        this.decX();
                        w = 'X';
                    } else if (w === '-Y') {
                        this.decY();
                        w = 'Y';
                    } else if (w === '-Z') {
                        this.decZ();
                        w = 'Z';
                    }
                }

                if (w[0] === 'X') {
                    k = this.getX();
                } else if (w[0] === 'Y') {
                    k = this.getY();
                } else if (w[0] === 'Z') {
                    k = this.getZ();
                }
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(this.getDMEM()[k]);   // Rd <-- (k)
                if (w.includes('+')) {
                    if (w === 'X+') {
                        this.incX();
                    } else if (w === 'Y+') {
                        this.incY();
                    } else if (w === 'Z+') {
                        this.incZ();
                    }
                }
                break;
            case 'LDD':
                w = line.getArgs()[1].getValue()[0];
                q = parseInt(line.getArgs()[1].getValue().slice(2));
                if (w === 'Y') {
                    k = this.getY() + q;
                } else if (w === 'Z') {
                    k = this.getZ() + q;
                }
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(this.getDMEM()[k]);   // Rd <-- (k)
                break;
            case 'LDI':
                K = this.getArgumentValue(line, 1);
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(K);   // Rd <-- K
                break;
            case 'LDS':
                k = this.getArgumentValue(line, 1);
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(this.getDMEM()[k]);   // Rd <-- (k)
                this.incPC(); // increment once now cause total needs to be + 2
                break;
            case 'LSL':
                Rd = this.getArgumentValue(line, 0);
                R = (((Rd + Rd) % 0x100) + 0x100) % 0x100;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd + Rd

                H = this.getBit(Rd, 3);
                N = this.getBit(R, 7);
                C = this.getBit(Rd, 7);
                V = N ^ C;
                this.updateSREG(null, null, H, N ^ V, V, N, (R === 0), C);
                break;
            case 'LSR':
                Rd = this.getArgumentValue(line, 0);
                R = (Rd >> 1) & 0xff;
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);

                N = 0;
                C = Rd & 1;
                V = N ^ C;
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), C);
                break;
            case 'MOV':
                Rr = this.getArgumentValue(line, 1);
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(Rr);   // Rd <-- Rr
                break;
            case 'MOVW':
                Rr = this.getArgumentValue(line, 1);
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(Rr);   // Rd <-- Rr
                Rr = this.getDMEM()[line.getArgs()[1].getValue() + 1].getValue();
                this.getDMEM()[line.getArgs()[0].getValue() + 1].setValue(Rr);   // Rd <-- Rr
                break;
            case 'MUL':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                R = Rd * Rr;

                this.getDMEM()[0].setValue(R % 256);
                this.getDMEM()[1].setValue((R - (R % 256)) / 256);

                this.updateSREG(null, null, null, null, null, null, (R === 0), (R >> 15) & 1);
                break;
            case 'MULS':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                R = Rd * Rr;
                
                this.getDMEM()[0].setValue(R % 256);
                this.getDMEM()[1].setValue((R - (R % 256)) / 256);

                this.updateSREG(null, null, null, null, null, null, (R === 0), (R >> 15) & 1);
                break;
            case 'MULSU':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                R = Rd * Rr;
                
                this.getDMEM()[0].setValue(R % 256);
                this.getDMEM()[1].setValue((R - (R % 256)) / 256);

                this.updateSREG(null, null, null, null, null, null, (R === 0), (R >> 15) & 1);
                break;
            case 'NEG':
                Rd = this.getArgumentValue(line, 0);
                R = (((0 - Rd) % 0x100) + 0x100) % 0x100;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- 0 - Rd

                H = this.getBit(R, 3) | (1 - this.getBit(Rd, 3));
                V = (R === 128);
                N = this.getBit(R, 7);
                this.updateSREG(null, null, H, N ^ V, V, N, (R === 0), (R !== 0));
                break;
            case 'NOP':
                break;
            case 'OR':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                R = Rd | Rr;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd | Rr

                V = 0;
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), null);
                break;
            case 'ORI':
                Rd = this.getArgumentValue(line, 0);
                K = this.getArgumentValue(line, 1);
                R = Rd | K;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd | K

                V = 0;
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), null);
                break;
            case 'OUT':
                A = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);

                this.getDMEM()[A + 0x20].setValue(Rr);   // I/O(A) <-- Rr
                break;
            case 'POP':
                if (this.getSP() >= this.ramend) {
                    this.newError(`Bad stack pointer for POP on line ${line_in_file}.`)
                    return;
                }
                this.incSP();                                                       // increment the SP by 1
                Rd = line.getArgs()[0].getValue();                                  // register number
                this.getDMEM()[Rd].setValue(this.getDMEM()[this.getSP()]);          // set register value
                break;
            case 'PUSH':
                if (this.getSP() <= 0x100) {
                    this.newError(`Stack overflow. Bad stack pointer for PUSH on line ${line_in_file}.`)
                    return;
                }
                Rr = this.getArgumentValue(line, 0);            // register held value
                this.getDMEM()[this.getSP()] = Rr;              // set the value in DMEM
                this.decSP();                                   // decrement the SP by 1
                break;
            case 'RJMP':
                k = this.getArgumentValue(line, 0);
                this.setPC(this.getPC() + k + 1);
                skip_inc = true;
                break;
            case 'RET':
                if (this.getSP() === this.ramend) {
                    this.finished = true;
                    console.log(`Number of steps taken: ${this.step_count + 1}`);
                    return;
                }

                if ((this.getSP() < 0x100) || (this.getSP() > (this.ramend - 2))) {
                    this.newError(`Bad stack pointer for RET on line ${line_in_file}.`);
                    return;
                }

                // Get the return line and move the SP
                this.incSP();
                let ret_line = (this.getDMEM()[this.getSP()] << 8); // get the ret high value
                this.incSP();
                ret_line += this.getDMEM()[this.getSP()]; // add the ret low value to the ret high value
                this.setPC(ret_line);
                skip_inc = true;
                break;
            case 'ROL':
                Rd = this.getArgumentValue(line, 0);
                C = this.getSREG() & 1;
                R = ((Rd << 1) & 0xff) + C;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);

                H = this.getBit(Rd, 3);
                N = this.getBit(R, 7);
                C = (Rd >> 7) & 1;
                V = N ^ C;
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), C);
                break;
            case 'ROR':
                Rd = this.getArgumentValue(line, 0);
                C = this.getSREG() & 1;
                R = ((Rd >> 1) & 0xff) + (128 * C);

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);

                N = this.getBit(R, 7);
                C = Rd & 1;
                V = N ^ C;
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), C);
                break;
            case 'SBC':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                C = this.getSREG() & 1;
                R = (((Rd - Rr - C) % 0x100) + 0x100) % 0x100;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd - Rr - C

                H = (this.getBit(R, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(R, 3) & (1 - this.getBit(Rd, 3)));
                V = (this.getBit(R, 7) & this.getBit(Rr, 7) & (1 - this.getBit(Rd, 7))) | ((1 - this.getBit(R, 7)) & (1 - this.getBit(Rr, 7)) & this.getBit(Rd, 7));
                N = this.getBit(R, 7);
                Z = (R === 0) & ((this.getSREG() >> 1) & 1);
                C = (this.getBit(R, 7) & this.getBit(Rr, 7)) | (this.getBit(Rr, 7) & (1 - this.getBit(Rd, 7))) | (this.getBit(R, 7) & (1 - this.getBit(Rd, 7)));
                this.updateSREG(null, null, H, N ^ V, V, N, Z, C);
                break;
            case 'SBCI':
                Rd = this.getArgumentValue(line, 0);
                K = this.getArgumentValue(line, 1);
                C = this.getSREG() & 1;
                R = (((Rd - K - C) % 0x100) + 0x100) % 0x100;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd - K - C

                H = (this.getBit(R, 3) & this.getBit(K, 3)) | (this.getBit(K, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(R, 3) & (1 - this.getBit(Rd, 3)));
                V = (this.getBit(R, 7) & this.getBit(K, 7) & (1 - this.getBit(Rd, 7))) | ((1 - this.getBit(R, 7)) & (1 - this.getBit(K, 7)) & this.getBit(Rd, 7));
                N = this.getBit(R, 7);
                Z = (R === 0) & ((this.getSREG() >> 1) & 1);
                C = (this.getBit(R, 7) & this.getBit(K, 7)) | (this.getBit(K, 7) & (1 - this.getBit(Rd, 7))) | (this.getBit(R, 7) & (1 - this.getBit(Rd, 7)));
                this.updateSREG(null, null, H, N ^ V, V, N, Z, C);
                break;
            case 'SBI':
                A = this.getArgumentValue(line, 0);
                b = this.getArgumentValue(line, 1);
                R = this.getDMEM()[A + 0x20].getValue() | (1 << b);
                this.getDMEM()[A + 0x20].setValue(R);
                break;
            case 'SBIW':
                Rd = this.getArgumentValue(line, 0);
                K = this.getArgumentValue(line, 1);
                if ((Rd - K) < 0) {
                    R = 0x100 + Rd - K;
                    this.getDMEM()[line.getArgs()[0].getValue() + 1].dec();
                } else {
                    R = Rd - K;
                }
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);

                R = this.getDMEM()[line.getArgs()[0].getValue()] + (this.getDMEM()[line.getArgs()[0].getValue() + 1] << 8);
                
                V = ((R - K) <= 0x7fff) && ((R >> 15) & 1);
                N = (R > 0x7fff);
                C = V;
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), C);
                break;
            case 'SBR':
                Rd = this.getArgumentValue(line, 0);
                K = this.getArgumentValue(line, 1);
                R = Rd | K;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd | K

                V = 0;
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), null);
                break;
            case 'SBRC':
                Rd = this.getArgumentValue(line, 0);
                b = this.getArgumentValue(line, 1);

                const is_set = ((Rd >> b) & 1);

                if (is_set) {
                    break;
                }

                this.incPC();

                if ( this.pmem[this.getPC() + 1] !== null ) {
                    break;
                }

                this.incPC();

                break;
            case 'SBRS':
                Rd = this.getArgumentValue(line, 0);
                b = this.getArgumentValue(line, 1);
                
                const is_cleared = 1 - ((Rd >> b) & 1);

                if (is_cleared) {
                    break;
                }

                this.incPC();

                if ( this.pmem[this.getPC() + 1] !== null ) {
                    break;
                }

                this.incPC();

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
                this.getDMEM()[line.getArgs()[0].getValue()].setValue(0xff);   // Rd <-- 0xff
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
                w = line.getArgs()[0].getValue();
                Rr = this.getArgumentValue(line, 1);
                // Decrement X/Y/Z
                if (w[0] === '-') {
                    if (w === '-X') {
                        this.decX();
                        w = 'X';
                    } else if (w === '-Y') {
                        this.decY();
                        w = 'Y';
                    } else if (w === '-Z') {
                        this.decZ();
                        w = 'Z';
                    }
                }

                if (w[0] === 'X') {
                    k = this.getX();
                } else if (w[0] === 'Y') {
                    k = this.getY();
                } else if (w[0] === 'Z') {
                    k = this.getZ();
                }

                this.getDMEM()[k] = Rr;   // (k) <-- Rr

                if (w.includes('+')) {
                    if (w === 'X+') {
                        this.incX();
                    } else if (w === 'Y+') {
                        this.incY();
                    } else if (w === 'Z+') {
                        this.incZ();
                    }
                }
                break;
            case 'STD':
                w = line.getArgs()[0].getValue()[0];
                q = parseInt(line.getArgs()[0].getValue().slice(2));
                Rd = this.getArgumentValue(line, 1);
                if (w === 'Y') {
                    k = this.getY() + q;
                } else if (w === 'Z') {
                    k = this.getZ() + q;
                }
                this.getDMEM()[k] = Rd;   // (k) <-- Rd
                break;
            case 'STS':
                k = this.getArgumentValue(line, 0);
                Rd = this.getArgumentValue(line, 1);
                this.getDMEM()[k] = Rd;   // (k) <-- Rd
                this.incPC(); // increment once now cause total needs to be + 2
                break;
            case 'SUB':
                Rd = this.getArgumentValue(line, 0);
                Rr = this.getArgumentValue(line, 1);
                R = (((Rd - Rr) % 0x100) + 0x100) % 0x100;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd - Rr

                H = (this.getBit(R, 3) & this.getBit(Rr, 3)) | (this.getBit(Rr, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(R, 3) & (1 - this.getBit(Rd, 3)));
                V = (this.getBit(R, 7) & this.getBit(Rr, 7) & (1 - this.getBit(Rd, 7))) | ((1 - this.getBit(R, 7)) & (1 - this.getBit(Rr, 7)) & this.getBit(Rd, 7));
                N = this.getBit(R, 7);
                C = (this.getBit(R, 7) & this.getBit(Rr, 7)) | (this.getBit(Rr, 7) & (1 - this.getBit(Rd, 7))) | (this.getBit(R, 7) & (1 - this.getBit(Rd, 7)));
                this.updateSREG(null, null, H, N ^ V, V, N, (R === 0), C);
                break;
            case 'SUBI':
                Rd = this.getArgumentValue(line, 0);
                K = this.getArgumentValue(line, 1);
                R = (((Rd - K) % 0x100) + 0x100) % 0x100;

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);   // Rd <-- Rd - K

                H = (this.getBit(R, 3) & this.getBit(K, 3)) | (this.getBit(K, 3) & (1 - this.getBit(Rd, 3))) | (this.getBit(R, 3) & (1 - this.getBit(Rd, 3)));
                V = (this.getBit(R, 7) & this.getBit(K, 7) & (1 - this.getBit(Rd, 7))) | ((1 - this.getBit(R, 7)) & (1 - this.getBit(K, 7)) & this.getBit(Rd, 7));
                N = this.getBit(R, 7);
                C = (this.getBit(R, 7) & this.getBit(K, 7)) | (this.getBit(K, 7) & (1 - this.getBit(Rd, 7))) | (this.getBit(R, 7) & (1 - this.getBit(Rd, 7)));
                this.updateSREG(null, null, H, N ^ V, V, N, (R === 0), C);
                break;
            case 'SWAP':
                Rd = this.getArgumentValue(line, 0);
                R = ((Rd & 0x0F) << 4 | (Rd & 0xF0) >> 4);

                this.getDMEM()[line.getArgs()[0].getValue()].setValue(R);
                break;
            case 'TST':
                Rd = this.getArgumentValue(line, 0);
                R = Rd;

                V = 0;
                N = this.getBit(R, 7);
                this.updateSREG(null, null, null, N ^ V, V, N, (R === 0), null);
                break;
            case 'XCH':
                k = this.getZ();
                Rd = this.getArgumentValue(line, 1);
                if ((k < 0x100) || (k > 0x8ff)) {
                    this.newError(`Illegal value of Z pointer \'${k}\' on line ${line_in_file}.`);
                }

                let vals = [Rd, this.getDMEM()[k]];

                this.getDMEM()[k] = vals[0];                                    // (Z) <-- Rd
                this.getDMEM()[line.getArgs()[1].getValue()].setValue(vals[1]); // Rd <-- (Z)
                break;
            default:
                break;
        }

        if (skip_inc === false) { // almost every instruction does this, so its easier to counterract it if you don't want to do exactly that
            this.incPC(); 
        }

        this.step_count += 1 // count the number of steps to prevent infinite loops

        // If the number of steps is too large, terminate running the code
        if (this.step_count > 1000000) {
            this.newError('Number of steps in code too large. Execution terminated.')
            return;
        } 


    }

    run() {
        while (this.finished === false) {
            this.step();
        }
    }

    getPC() {
        return (this.pch.getValue() << 8) + this.pcl.getValue();
    }

    setPC(new_value) {
        this.pch.setValue((new_value >> 8) & 0xff);
        this.pcl.setValue(new_value & 0xff);
    }

    getSP() {
        return (this.sph.getValue() << 8) + this.spl.getValue();
    }

    setSP(new_value) {
        this.sph.setValue((new_value >> 8) & 0xff);
        this.spl.setValue(new_value & 0xff);
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

        if (toks === null) {
            return '(two line inst.)';
        }

        const inst = toks[0].getValue();

        // IF THERE'S NO ARGUMENTS
        if (toks.length === 1) {
            return inst;
        }

        const args = toks.slice(1);

        let arg1 = `${args[0].getValue()}`; // value of the argument

        if (args[0].getType() === 'REG') {
            arg1 = 'R' + arg1;
        }
        // IF THERE'S 1 ARGUMENT
        if (toks.length === 2) {
            return `${inst} ${arg1}`;
        }

        // IF THERE'S 2 ARGUMENTS
        let arg2 = `${args[1].getValue()}`; // value of the argument
        if (args[1].getType() === 'REG') {
            arg2 = 'R' + arg2;
        }

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

    updateSREGBit(value, bit) {
        // Set the bit to 0 then OR it with the new value bit shifted
        let sreg_val = this.sreg.getValue();
        this.sreg.setValue( (sreg_val & (0xff - (1 << bit))) | (value * (1 << bit)) );

        //if (value) {
        //    this.sreg.setValue(this.sreg.getValue() | (2 ** bit));
        //} else {
        //    this.sreg.setValue(this.sreg.getValue() & ( 0xff - ( 2 ** bit ) ) );
        //}
    }

    updateSREG(I = null, T = null, H = null, S = null, V = null, N = null, Z = null, C = null) {
        let val = this.sreg.getValue();

        if (I !== null) {
            val = (val & 127) | (128 * I);
        }
        if (T !== null) {
            val = (val & 191) | (64 * T);
        }
        if (H !== null) {
            val = (val & 223) | (32 * H);
        }
        if (S !== null) {
            val = (val & 239) | (16 * S);
        }
        if (V !== null) {
            val = (val & 247) | (8 * V);
        }
        if (N !== null) {
            val = (val & 251) | (4 * N);
        }
        if (Z !== null) {
            val = (val & 253) | (2 * Z);
        }
        if (C !== null) {
            val = (val & 254) |  C;
        }

        this.sreg.setValue(val);    // set the value of the SREG
    }

    getBit(value, bit) {
        // returns the value of a bit in a number
        return ((value >> bit) & 1);

        /*

        if (((value >> bit) & 1) !== 0) {
            return 1;
        }
        return 0;

        */
    }

    getW() {
        return (this.getDMEM()[25].getValue() << 8) + this.getDMEM()[24].getValue()
    }

    incW() {
        const W = this.getW() + 1;
        this.getDMEM()[25].setValue((W>>8) & 0xff);
        this.getDMEM()[24].setValue(W & 0xff);
    }

    decW() {
        const WL = this.getDMEM()[24].getValue();
        const WH = this.getDMEM()[25].getValue();
        if (WL === 0) {
            this.getDMEM()[25].setValue(WH - 1);
        }
        this.getDMEM()[24].setValue(WL - 1);
    }

    getX() {
        return (this.getDMEM()[27].getValue() << 8) + this.getDMEM()[26].getValue();
    }

    incX() {
        const XL = this.getDMEM()[26].getValue();
        const XH = this.getDMEM()[27].getValue();
        if (XL === 255) {
            this.getDMEM()[27].setValue(XH + 1);
        }
        this.getDMEM()[26].setValue(XL + 1);
    }

    decX() {
        const XL = this.getDMEM()[26].getValue();
        const XH = this.getDMEM()[27].getValue();
        if (XL === 0) {
            this.getDMEM()[27].setValue(XH - 1);
        }
        this.getDMEM()[26].setValue(XL - 1);
    }

    getY() {
        return (this.getDMEM()[29].getValue() << 8) + this.getDMEM()[28].getValue()
    }

    incY() {
        const YL = this.getDMEM()[28].getValue();
        const YH = this.getDMEM()[29].getValue();
        if (YL === 255) {
            this.getDMEM()[29].setValue(YH + 1);
        }
        this.getDMEM()[28].setValue(YL + 1);
    }

    decY() {
        const YL = this.getDMEM()[28].getValue();
        const YH = this.getDMEM()[29].getValue();
        if (YL === 0) {
            this.getDMEM()[29].setValue(YH - 1);
        }
        this.getDMEM()[28].setValue(YL - 1);
    }

    getZ() {
        return (this.getDMEM()[31].getValue() << 8) + this.getDMEM()[30].getValue();
    }

    incZ() {
        const ZL = this.getDMEM()[30].getValue();
        const ZH = this.getDMEM()[31].getValue();
        if (ZL === 255) {
            this.getDMEM()[31].setValue(ZH + 1);
        }
        this.getDMEM()[30].setValue(ZL + 1);
    }

    decZ() {
        const ZL = this.getDMEM()[30].getValue();
        const ZH = this.getDMEM()[31].getValue();
        if (ZL === 0) {
            this.getDMEM()[31].setValue(ZH - 1);
        }
        this.getDMEM()[30].setValue(ZL - 1);
    }

    getArgumentValue(line, arg_num) {
        // For getting the value of a register of integer
        const arg = line.getArgs()[arg_num];
        if (arg.getType() === 'INT') {
            return arg.getValue();
        }
        else if (arg.getType() === 'REG') {
            return this.getDMEM()[arg.getValue()].getValue();
        }
    }

    newError(text) {
        this.finished = true;
        document.getElementById('error').innerHTML = text;
        document.getElementById('output').innerHTML = null;
        document.getElementById('status').innerHTML = null;
        throw new SyntaxError(text);
    }

}

FUNCTIONS = [
    'printf'
];

INST_LIST = [
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
    'IN',
    'INC',
    'JMP',
    'LD',
    'LDD',
    'LDI',
    'LDS',
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
    'RJMP',
    'RET',
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

const reg_0_31 = new Argument('REG', 0, 31);
const reg_16_31 = new Argument('REG', 16, 31);
const reg_word_low = new Argument('REG', null, null, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
const int_0_7 = new Argument('INT', 0, 7);
const int_0_31 = new Argument('INT', 0, 31);
const int_0_63 = new Argument('INT', 0, 63);
const int_0_255 = new Argument('INT', 0, 255);
const int_n64_63 = new Argument('INT', -64, 63);
const word_plus_q_0_63 = new Argument('WORDPLUSQ', 0, 63);
const word_wxyz = new Argument('REG', null, null, [24, 26, 28, 30]);

// Allows ranges for each inst
INST_OPERANDS = {
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
    'CALL': [new Argument(['INT', 'REF'], 0, 4194303, FUNCTIONS)],
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
    'IN': [reg_0_31, int_0_63],
    'INC': [reg_0_31],
    'JMP': [new Argument('INT', 0, 4194303)],
    'LD': [reg_0_31, new Argument(['WORD', 'MINUSWORD', 'WORDPLUS'])],
    'LDD': [reg_0_31, word_plus_q_0_63],
    'LDI': [reg_16_31, int_0_255],
    'LDS': [reg_0_31, new Argument('INT', 256, 65535)],
    'LSL': [reg_0_31],
    'LSR': [reg_0_31],
    'MOV': [reg_0_31, reg_0_31],
    'MOVW': [reg_word_low, reg_word_low],
    'MUL': [reg_0_31, reg_0_31],
    'MULS': [reg_16_31, reg_16_31],
    'MULSU': [new Argument('REG', 16, 23), new Argument('REG', 16, 23)],
    'NEG': [reg_0_31],
    'NOP': null,
    'OR': [reg_0_31, reg_0_31],
    'ORI': [reg_16_31, int_0_255],
    'OUT': [int_0_63, reg_0_31],
    'POP': [reg_0_31],
    'PUSH': [reg_0_31],
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
    'STS': [new Argument('INT', 256, 65535), reg_0_31],
    'SUB': [reg_0_31, reg_0_31],
    'SUBI': [reg_16_31, int_0_255],
    'SWAP': [reg_0_31],
    'TST': [reg_0_31],
    'XCH': [new Argument('WORD', null, null, null, 'Z'), reg_0_31]
}

// Most op codes can be easily obtained from this
INST_OPCODES = {
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
    'IN': ['d', 'A', '10110AAdddddAAAA'],
    'INC': ['d', '1001010ddddd0011'],
    'JMP': ['k', '1001010kkkkk110kkkkkkkkkkkkkkkkk'],
    'LD': null,
    'LDD': null,
    'LDI': ['d', 'K', '1110KKKKddddKKKK'],
    'LDS': ['d', 'k', '1001000ddddd0000kkkkkkkkkkkkkkkk'],
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
    'OUT': ['A', 'r', '10111AArrrrrAAA'],
    'POP': ['d', '1001000ddddd1111'],
    'PUSH': ['r', '1001001rrrrr1111'],
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
}

DIRECTIVES = [
    '.section',
    '.end',
    '.text',
    '.data',
    '.global',
    '.byte',
    '.string',
    '.ascii',
    '.asciz',
    '.space',
    '.def'
];


// ###################################################################################################################
// # AN EASTER EGG - POEM                                                                                            #
// ###################################################################################################################

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
        if (txt.length <= 0) {
            this.newError('No code to parse. Please input code in the code box.');
        }

        // Clear the current data for if there's an error
        this.resetAll();

        // Tokenizing
        this.lexer.newData(txt);
        console.log(this.lexer.getTokenLines());

        // Parsing
        this.parser.newData(this.lexer.getTokenLines(), this.lexer.getLineNumbers(), txt);

        // Interpreter Initialisation
        this.interpreter.newData(this.parser.getPMEM(), this.parser.getDMEM(), this.parser.getPMEMLineNumbers(), txt);

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

        if (stepsize > 0) {
            for (let i = 0; i < stepsize; i++) {
                this.interpreter.step();
            }
        }

        else {
            this.stepBack(stepsize);
        }

        this.pmem_top = this.interpreter.getPC() - (this.interpreter.getPC() % 8); // move pmem display to the line

        if (this.interpreter.finished) {
            this.success('The code has run and exited successfully!');
        }

        this.populateAll();
    }

    run() {

        this.hideOpenPopup(this.current_popup); // hide any open popup

        for (let i = 0; i < 32; i++) {
            this.interpreter.getDMEM()[i].clearChange();    // set changed = 0 for all registers
        }

        this.interpreter.run();

        if (this.interpreter.finished) {
            this.success('The code has run and exited successfully!');
        }

        this.pmem_top = this.interpreter.getPC() - (this.interpreter.getPC() % 8); // move pmem display to the line

        this.populateAll();
    }

    stepBackOne() {
        this.stepBack(-1);
        this.populateAll();
    }

    stepBack(steps_back) {
        /* Expecting the argument steps_back < 0
        */
        const steps = this.interpreter.step_count + steps_back;       // the total number of steps to get to the point you want to go for
        
        let txt = document.getElementById('code_box').value;
        this.lexer.newData(txt);
        this.parser.newData(this.lexer.getTokenLines(), this.lexer.getLineNumbers(), txt);
        this.interpreter.newData(this.parser.getPMEM(), this.parser.getDMEM(), this.parser.getPMEMLineNumbers(), txt);

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
        this.fillPopup();
    }

    populateRegisters() {
        if (!this.assembled) {
            return;
        }

        const registers = this.interpreter.getDMEM().slice(0, 32);

        let no_change_background_colour, no_change_text_colour;

        if (this.theme === 'light') {
            no_change_background_colour = '#ddd';
            no_change_text_colour = '#444';
        } else {
            no_change_background_colour = '#7e7e7e';
            no_change_text_colour = '#fff';
        }
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

        let no_change_background_colour, no_change_text_colour;

        if (this.theme === 'light') {
            no_change_background_colour = '#ddd';
            no_change_text_colour = '#444';
        } else {
            no_change_background_colour = '#7e7e7e';
            no_change_text_colour = '#fff';
        }
        const change_background_colour = '#fd0002';
        const change_text_colour = '#fff';

        const change = this.interpreter.sreg.getValue() ^ this.interpreter.sreg.getLastValue();


        const sreg_flags = ['C', 'Z', 'N', 'V', 'S', 'H', 'T', 'I'];
        for (let i = 0; i < 8; i++) {
            const flag = sreg_flags[i];

            let flag_value = this.interpreter.sreg.getBit(i); // get the sreg bit value

            if (flag_value) {   // flag_value = 'TRUE';
                flag_value = '1';
            } else {            // flag_value = 'FALSE';
                flag_value = '0';
            }
            
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

        let normal_background_colour, normal_text_colour;

        if (this.theme === 'light') {
            normal_background_colour = '#bbb';
            normal_text_colour = '#333';
        } else {
            normal_background_colour = '#474747';
            normal_text_colour = '#fff';
        }

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

        let normal_background_colour, normal_text_colour;

        if (this.theme === 'light') {
            normal_background_colour = '#ddd';
            normal_text_colour = '#444';
        } else {
            normal_background_colour = '#7e7e7e';
            normal_text_colour = '#fff';
        }

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

                if (this.display_ascii) {
                    cell_value = this.getAscii(cell_value);
                } else {
                    cell_value = this.convertValueToBase(cell_value, 2);
                }

                document.getElementById(`dmem-line-${line}${row}`).innerHTML = cell_value;
                document.getElementById(`dmem-line-${line}${row}`).style.color = pointer_text_colour;

                // Check if it's SP, X, Y, Z
                if (cell_number === sp) {
                    document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = sp_background_colour;
                } else if (cell_number === z) {
                    document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = z_background_colour;
                } else if (cell_number === y) {
                    document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = y_background_colour;
                } else if (cell_number === x) {
                    document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = x_background_colour;
                } else {
                    document.getElementById(`dmem-line-${line}${row}`).style.backgroundColor = normal_background_colour;
                    document.getElementById(`dmem-line-${line}${row}`).style.color = normal_text_colour;
                }
            }
        }
        
    }

    success(text) {
        this.assembled = true;
        document.getElementById('output').innerHTML = text;
        document.getElementById('error').innerHTML = null;
        document.getElementById('status').innerHTML = null;
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
            document.getElementById('button_base').innerHTML = 'Currently: Base 10';
        }

        else {
            this.base = 16;
            document.getElementById('button_base').innerHTML = 'Currently: Base 16';
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
        if ( (this.current_popup !== null) && (this.current_popup !== name) ) {
            this.hideOpenPopup(this.current_popup);
        }

        const popup = document.getElementById(`popup-${name}`);

        let inst = null;

        if (!['PC', 'SP', 'X', 'Y', 'Z'].includes(name)) {
            inst = document.getElementById(`pmem-line-${name}`).innerHTML;
        }

        if (inst === 'None') {
            return
        }

        popup.classList.toggle("show");

        // If you're opening a new popup set it as the current popup and fill it
        if ( this.current_popup !== name) {
            this.current_popup = name;
            this.fillPopup();
        }
        // Else set the popup to null since you've closed an already open popup
        else {
            this.current_popup = null;
        }
    }

    hideOpenPopup(name) {
        if (this.current_popup !== null) {
            const popup = document.getElementById(`popup-${name}`);
            popup.classList.toggle("show", false);
        }
    }

    fillPopup() {
        // Do nothing for closed popups
        if (this.current_popup === null) {
            return;
        }

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
        if (inst !== null) {
            inst_mnemonic = inst.split(' ')[0];   // e.g. LDI, ASR, MOV.
        } else {
            inst_mnemonic = this.current_popup;
        }

        let popup_options;                          // the lines for that given popup

        if (inst_mnemonic === 'LD') {
            const word_reg = inst.split(' ')[2];

            if ( word_reg.includes('X') ) {
                popup_options = this.getPopups()['LD_X'].split('\n');
            }
            else if ( word_reg.includes('Y') ) {
                popup_options = this.getPopups()['LD_Y'].split('\n');
            } else {
                popup_options = this.getPopups()['LD_Z'].split('\n');
            }
        } else if (inst_mnemonic === 'ST') {
            const word_reg = inst.split(' ')[1];

            if ( word_reg.includes('X') ) {
                popup_options = this.getPopups()['ST_X'].split('\n');
            }
            else if ( word_reg.includes('Y') ) {
                popup_options = this.getPopups()['ST_Y'].split('\n');
            } else {
                popup_options = this.getPopups()['ST_Z'].split('\n');
            }
        } else {
            if ( INST_LIST.includes(inst_mnemonic) ||  ['PC', 'SP', 'X', 'Y', 'Z'].includes(inst_mnemonic)) {
                popup_options = this.getPopups()[inst_mnemonic].split('\n'); // get the text for that instruction
            } else {
                popup_options = '';
            }
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
                    Function: This instruction performs 8-bit x 8-bit → 16-bit unsigned multiplication. The resulting value is stored in R1:R0.

                    Boundaries:
                    Rd → [R0 - R31]
                    Rr → [R0 - R31]

                    Operation:
                    R1:R0 ← Rd x Rr (unsigned ← unsigned x unsigned)`,
            'MULS': `Syntax:   MULS Rd, Rr
                    Family:   Arithmetic Instructions
                    Function: This instruction performs 8-bit x 8-bit → 16-bit signed multiplication. The resulting value is stored in R1:R0.

                    Boundaries:
                    Rd → [R16 - R31]
                    Rr → [R16 - R31]

                    Operation:
                    R1:R0 ← Rd x Rr (signed ← signed x signed)`,
            'MULSU': `Syntax:   MULS Rd, Rr
                    Family:   Arithmetic Instructions
                    Function: This instruction performs 8-bit x 8-bit → 16-bit multiplication of a signed and an unsigned number. The resulting value is stored in R1:R0.

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

        if (this.theme === 'light') {
            this.theme = 'dark';
            bg = '#2e2e2e';
            fg = "#fff";
            table_heading_bg = '#474747';
            table_body_bg = '#7e7e7e';
            borderColor = '#4e4e4e';
            borderStyle = 'solid';
            borderThickness = '1px';
            status_background_colour = '#404040';
            border_radius = '10px';
            muted_text_colour = '#aaa';

            document.getElementById('button_theme').innerHTML = 'Theme: Dark';
        } else {
            this.theme = 'light';
            bg = '#fff';
            fg = "#444";
            table_heading_bg = '#bbb';
            table_body_bg = '#ddd';
            borderColor = '#e0e0e0';
            borderStyle = 'solid';
            borderThickness = '1px';
            status_background_colour = '#eee';
            border_radius = '10px';
            muted_text_colour = '#777';

            document.getElementById('button_theme').innerHTML = 'Theme: Light';
        }

        document.body.style.backgroundColor = bg;
        document.body.style.color = fg;

        document.getElementById('status').style.backgroundColor = status_background_colour;
        document.getElementById('status').style.color = fg;
        document.getElementById('status').style.border = borderThickness + ' ' + borderStyle + ' ' + borderColor;


        const panels = document.getElementsByClassName('panel-default');
        for (let i = 0; i < panels.length; i++) {
            panels[i].style.backgroundColor = bg;
            panels[i].style.color = fg;
            panels[i].style.borderRadius = border_radius;
            panels[i].style.border = borderThickness + ' ' + borderStyle + ' ' + borderColor;
        }

        const muted_text = document.getElementsByClassName('text-muted');
        for (let i = 0; i < muted_text.length; i++) {
            muted_text[i].style.color = muted_text_colour;
        }

        // Include the ISA link button and download link button
        const buttons = document.getElementsByClassName('button');
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].style.backgroundColor = bg;
            buttons[i].style.color = fg;
            buttons[i].style.border = borderThickness + ' ' + borderStyle + ' ' + borderColor;
        }

        const text_boxes = document.getElementsByTagName('textarea');
        for (let i = 0; i < text_boxes.length; i++) {
            text_boxes[i].style.backgroundColor = bg;
            text_boxes[i].style.color = fg;
            text_boxes[i].style.borderColor = borderColor;
        }

        const table_headings = document.getElementsByTagName('th');
        for (let i = 0; i < table_headings.length; i++) {
            table_headings[i].style.backgroundColor = table_heading_bg;
            table_headings[i].style.color = fg;
        }

        const table_bodies = document.getElementsByTagName('td');
        for (let i = 0; i < table_bodies.length; i++) {
            table_bodies[i].style.backgroundColor = table_body_bg;
            table_bodies[i].style.color = fg;
        }

        const smalls_body = [...document.getElementsByClassName('table-reg-small'),
        ...document.getElementsByClassName('table-sreg-small'),
        ...document.getElementsByClassName('table-dmem-body-small')];
        for (let i = 0; i < smalls_body.length; i++) {
            smalls_body[i].style.backgroundColor = table_body_bg;
            smalls_body[i].style.color = fg;
        }

        const smalls_headings = document.getElementsByClassName('table-pmem-heading-small');
        for (let i = 0; i < smalls_headings.length; i++) {
            smalls_headings[i].style.backgroundColor = table_heading_bg;
            smalls_headings[i].style.color = fg;
        }

        this.populateAll();
    }

}

app = new App();



