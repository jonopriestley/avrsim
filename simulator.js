

class Token{
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
    constructor(name, value=0, changed=0) {
        this.name = name;
        this.value = value;
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

    setValue(new_value) {
        this.value = new_value % 256;
        this.changed = 1;
    }

    getValue() {
        return this.value;
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
        /*
         * Takes a token and checks if it matches with the argument.
         */

        const legal_token_types = this.getTokenType(); // the legal token types for this argument

        // CHECK IF IT'S A LEGAL ARGUMENT
        if ( !legal_token_types.includes(tok.getType()) ) {
            this.newError(`Illegal token '${tok.getValue()}' on line ${line_num}.`);
        }

        // CHECK ITS LEGAL TOKEN TYPE AND WITHIN THE LEGAL BOUNDS
        if (this.hasValueRange()) {

            let val = tok.getValue(); // value of the token

            if (tok.getType() === 'WORDPLUSQ') {
                val = parseInt(val.substring(2)); // get rid of the Z+ or Y+ part
            }

            if (!(this.getMinVal() <= val && val <= this.getMaxVal())) {
                if (tok.getType() === 'REG') {
                    tok.setValue(`R${tok.getValue()}`); // set it to register
                }
                this.newError(`Illegal argument '${tok.getValue()}' on line ${line_num}.`);
            }
        }

        // CHECK ITS LEGAL TOKEN TYPE AND in THE LEGAL LIST
        else if (this.hasOptionsList() && !this.getOptionsList().includes(tok.getValue())) {
            this.newError(`Illegal argument '${tok.getValue()}' on line ${line_num}.`);
        }

        // CHECK ITS LEGAL TOKEN TYPE AND IN THE LEGAL LIST
        else if (this.hasExactValue() && tok.getValue() !== this.getExactValue()) {
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
            b = '1' +  b;
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
            b = '0' +  b;
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

        const opcode_requirements = INST_OPCODES[ this.inst.getValue() ];

        if ( opcode_requirements !== null ) {

            const arg_len = this.args.length;
            
            // Return the opcode if it's always the same opcode
            if ( opcode_requirements.length === 1 ) {
                return opcode_requirements[0];
            }

            // Get the opcode for use later
            let opcode = opcode_requirements[ opcode_requirements.length - 1 ];

            // GO THROUGH EACH ARGUMENT AND SYMBOL ASSOCIATED WITH IT AND REPLACE THEM IN THE GIVEN OPCODE
            for (let arg_num = 0; arg_num < arg_len; arg_num++) {

                const symbol = opcode_requirements[ arg_num ]; //  the symbol for replacing in the opcode e.g. 'd'

                const digit_count = this.countElements(opcode, symbol); // number of digits the argument takes up in the opcode

                if (digit_count === 0 ) { // skip if it's an argument that doesnt matter (like Z in XCH)
                    continue
                }

                const arg = this.args[ arg_num ].getValue(); // the argument value

                let var_value;

                // If it's a 2's comp value then make it 2's comp
                if ( ['RJMP'].concat(INST_LIST.slice(7, 27)).includes(this.inst.getValue()) ) {
                    var_value = this.twosComp(arg, digit_count);
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
        
        else {
            return 'xxxxxxxxxxxxxxxx'; // Replace later
        }
    }

    toString() {
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
            arg1 = arg1.toString(16);
        }

        if (argsLen === 1) {
            
            return `${inst} ${arg1}`;
        }
            
            
        let arg2 = this.args[1].getValue();

        if (this.args[1].getType() === 'REG') {
            arg2 = `R${arg2}`;
        }

        else if (this.args[1].getType() === 'INT') {
            arg2 = arg2.toString(16);
        }
        
        return `${inst} ${arg1}, ${arg2}`;
    }

    getCode() {
        return this.toString();
    }
    
    getOpcode() {
        return this.opcode;
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
            [/^;.*/, null],                      // comments
            [/^\s+/, null],                      // whitespace
            [/^[\w_]{1}.*:/, 'LABEL'],           // labels
            [/^lo8|^LO8/, 'LO8'],                // lo8
            [/^hi8|^HI8/, 'HI8'],                // hi8
            [/^[rR]\d+/, 'REG'],                 // registers
            [/^-{0,1}0x[\dABCDEFabcdef]+|^-{0,1}\$[\dABCDEFabcdef]+|^-{0,1}0b[01]+/, 'INT'], // numbers
            [/^-{0,1}\d+/, 'INT'],              // numbers
            [/^[a-zA-Z]{2,6}/, 'INST'],         // instructions --> CAN TURN LABELS USED IN AN INSTRUCTION INTO INST TYPE
            [/^\".*?\"|^\'.*?\'/, 'STR'],       // string
            [/^\.[^\.\s]+/, 'DIR'],             // directives
            [/^[YZ]\+\d{1,2}/, 'WORDPLUSQ'],    // word+q
            [/^[XYZ]\+/, 'WORDPLUS'],           // word+
            [/^-[XYZ]/, 'MINUSWORD'],           // -word
            [/^[XYZ]/, 'WORD'],                 // word
            [/^,/, 'COMMA'],                    // comma
            [/^[^\w\s]+/, 'SYMBOL'],            // symbols
            [/^[^\s\d]{1}[\w\d_]*/, 'REF'] // references (like labels used in an instruction) --> Called STRING in sim.py
        ];

        const tokens = [];
        const line_nums = [];

        const codeArr = code.split('\n');

        // Go over every line of code and move through the line making tokens
        for (let line_number = 0; line_number < codeArr.length; line_number++) {
            let pos = 0;
            const line = codeArr[line_number];
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

}



class Parser {
    constructor() {
        this.token_lines = [];
        this.line_numbers = [];
        this.pmem = [];
        this.dmem = [];

        // DEFINING THE SIZE OF DMEM AND PMEM
        this.ramend = 0x8FF;
        this.flashend = 0x3FFF;
        
    }
    
    newData(token_lines, line_numbers) {
        this.token_lines = token_lines;
        this.line_numbers = line_numbers;
    
        this.labels = Object.create(null);
    
        this.dmem = [];
        // Add registers to dmem
        for (let i = 0; i < 256; i++) {
            let reg = new Register(`R${i}`);
            this.dmem.push(reg);
        }
    
        this.pmem = [];
        
        this.parse();
        
        // FILLING IN DMEM AND PMEM WITH 0/NOP
        for (let i = this.dmem.length; i < (this.ramend + 1); i++) {
            this.dmem.push(0);
        }
        
        for (let i = this.pmem.length; i < (this.flashend + 1); i++) {
            this.pmem.push(new Instruction( [ new Token('INST', 'NOP') ] ));
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
        if (first_line.length !== 2 || first_line[1].getType() !== "DIR" ||
            ![".data", ".text"].includes(first_line[1].getValue())) {
            
            this.newError("First line must be '.section .data' or '.section .text'");
        }

        
        // Check if last line is .end
        const final_line = this.token_lines[this.token_lines.length - 1];
        if (final_line.length > 1 || final_line[0].getType() !== "DIR" || final_line[0].getValue() !== ".end") {
            this.newError("Final line must be '.end'");
        }

        // Find .section .text start
        let text_section_start = null;
        let data_section_start = null;
        for (let line_num = 0; line_num < this.token_lines.length; line_num++) {
            const line = this.token_lines[line_num];

            // If you find a .section directive check it
            if (line[0].getValue() === ".section" && line[0].getType() === "DIR") {
                if (
                line.length !== 2 ||
                line[1].getType() !== "DIR" ||
                ![".data", ".text"].includes(line[1].getValue())) {
                    this.newError("Invalid '.section' directive");
                }

                // If you find the text section then stop looking
                if (line[1].getValue() === ".data") {
                    if (text_section_start !== null) {
                        this.newError("Data section must come before the text section");
                    }
                    data_section_start = line_num;
                }

                // If you find the text section then stop looking
                else if (line[1].getValue() === ".text") {
                    text_section_start = line_num;
                    if (data_section_start !== null) break;
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
                if ( current_tok.getType() === 'INST' ) {
                    current_tok.setValue( current_tok.getValue().toUpperCase() ); // make all instructions upper case
                    
                    if ( !INST_LIST.includes( current_tok.getValue() ) ) { // check if the token is a valid instruction
                        this.newError(`Invalid instruction \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }
                }

                // Check REG are valid numbers
                else if ( current_tok.getType() === 'REG' ) {
                    const reg_number = current_tok.getValue();

                    if (reg_number > 31) {
                        this.newError(`Illegal register \'R${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }
                }

                // Check DIR are valid directives
                else if ( current_tok.getType() === 'DIR' && !DIRECTIVES.includes( current_tok.getValue() ) ) {
                    this.newError(`Invalid directive \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                }

                // Convert integers to base 10
                else if ( current_tok.getType() === 'INT' ) {

                    let int_value = 0;
                    
                    // this line is technically irrelevant since parseInt deals with 0x already
                    if ( current_tok.getValue().includes('x') ) {
                        int_value = parseInt(current_tok.getValue().slice(2), 16);
                    }

                    else if ( current_tok.getValue().includes('$') ) {
                        int_value = parseInt(current_tok.getValue().slice(1), 16);
                    }

                    else if ( current_tok.getValue().includes('b') ) {
                        int_value = parseInt(current_tok.getValue().slice(2), 2);
                    }

                    else {
                        int_value = parseInt(current_tok.getValue());
                    }

                    current_tok.setValue( int_value );

                }

            }





        }

        //////////////////////////////////////////////
        //////////////// DATA SECTION ////////////////
        //////////////////////////////////////////////

        // Check data section exists
        const data_section_exists = ( text_section_start !== 0 );

        let line_num = 0;

        // GO THROUGH LINES IN DATA SECTION
        while ( data_section_exists && ( line_num < text_section_start ) ) {

            if (line_num === 0) {                               // skip if it's the .section .data line
                line_num += 1;
                continue
            }

            const line = this.token_lines[line_num];
            const line_length = line.length;                    // calculate number of tokens in the line
            const line_in_file = this.line_numbers[line_num];   // the current line if there's an error

            let tok_num = 0;

            // DEAL WITH LABELS AT THE START OF THE LINE
            if ( line[tok_num].getType() === 'LABEL' ) {
                let label = line[0].getValue();                 // get label with the colon at the end
                label = label.slice(0, (label.length - 1));
                this.labels[label] = this.dmem.length;          // add location of the data label
                tok_num += 1;
            }

            // CHECK THE DIRECTIVE
            if ( line[tok_num].getType() !== 'DIR' ) {
                this.newError(`Illegal syntax \'${line[tok_num].getValue()}\' on line ${line_in_file}.`);
            }
            
            const line_directive = line[tok_num].getValue();    // get the directive for this line to use below

            tok_num += 1;                                       // Move to the next token in the line

            // EXECUTE THE DIRECTIVE
            while ( tok_num < line_length ) {

                const current_tok = line[tok_num];
                
                const parity_of_tokens_left = (line_length - 1 - tok_num) % 2; // used for calculating comma placement

                ///// EXECUTE THE DIRECTIVES /////

                // Byte directive
                if ( parity_of_tokens_left === 0 && line_directive === '.byte' ) {

                    if ( current_tok.getType() !== 'INT' ) { // expecting integer
                        this.newError(`Bad token \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }

                    this.dmem.push( current_tok.getValue() ); // add to data
                }
                
                // String, Ascii, Asciz directives
                else if ( parity_of_tokens_left === 0 && ['.string', '.ascii', '.asciz'].includes(line_directive) ) {
                    
                    if ( current_tok.getType() !== 'STR' ) {
                        this.newError(`Bad token \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }

                    let string_text = current_tok.getValue();
                    string_text = string_text.slice(1, (string_text.length - 1));   // remove quotation marks from either side
                    
                    // Go through each character and add it's ascii code to the data
                    for (let i = 0; i < string_text.length; i++) {
                        const char = string_text[i];

                        const char_ascii_value = char.charCodeAt(0); // get ascii code
                        
                        if (char_ascii_value > 127) { // check it's a valid character
                            this.newError(`Bad character \'${char}\' on line ${line_in_file}.`);
                        }

                        this.dmem.push( char_ascii_value );                 // add to data
                    }

                    if ( ['.string', '.asciz'].includes(line_directive) ) {  // add NULL if directive requires it
                        this.dmem.push( 0 );                                // add NULL to data
                    }
                
                }

                // Space directive
                else if ( parity_of_tokens_left === 0 && line_directive === '.space' ) {
                    
                    if ( current_tok.getType() !== 'INT' ) { // expecting integer
                        this.newError(`Bad token \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }

                    // Check if it's the number of spaces or the content of the spaces
                        // Check if the previous token is the directive
                        // If so, it's the number of spaces

                    if ( line[tok_num - 1].getType() === 'DIR' ) {              // if this integer is the number of values
                        
                        const number_of_spaces = current_tok.getValue();        // the number of spaces we're making

                        if ( ( tok_num + 1 ) === line_length ) {                // if there is no space value given, make them 0
                            for (let i = 0; i < number_of_spaces; i++) {
                                this.dmem.push( 0 );                            // add 0's for as many spaces as needed
                            }
                        }
                    }
                    
                    // Otherwise check it's the final token
                    else if ( ( tok_num + 1 ) !== line_length ) { // if it's the second argument given it must be the last
                        this.newError(`Too many arguments given for .string on line ${line_in_file}.`);
                    }

                    // If it is the final token
                    else {
                        const space_value = current_tok.getValue();             // value of the spaces
                        const number_of_spaces = line[tok_num - 2].getValue();  // the number of spaces we're making
                        for (let i = 0; i < number_of_spaces; i++) {
                            this.dmem.push( space_value );                      // add the value for as many spaces as needed
                        }
                    }


                }

                // Def directive
                else if ( line_directive === '.def' ) {
                    
                    // Check the number of arguments
                    if ( (line_length - tok_num) > 3) { // if there's too many arguments
                        this.newError(`Too many arguments given for .def on line ${line_in_file}.`);
                    }

                    // if it's the 3rd last argument (expecting REF)
                    if ( ( tok_num + 3 ) == line_length ) {
                        if ( current_tok.getType() !== 'REF' ) {
                            this.newError(`Bad argument \'${current_tok.getValue()}\' on line ${line_in_file}.`)
                        } 
                    }

                    // Raise error if 2nd last token is not '='
                    else if ( ( tok_num + 2 ) === line_length && current_tok.getType() !== 'SYMBOL' && current_tok.getValue() !== '=' ) {
                        this.newError(`Bad argument \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                    }

                    // If it's the last token (expecting REG)
                    else if ( ( tok_num + 1 ) == line_length ) {
                        
                        if ( current_tok.getType() !== 'REG' ) {
                            this.newError(`Bad argument \'${current_tok.getValue()}\' on line ${line_in_file}.`);
                        }

                        const def_word = line[tok_num - 2].getValue();
                        
                        this.labels[def_word] = current_tok.getValue(); // add the def word to the labels list
                    }

                }

                // Should be comma if there are even number of tokens left. Raise error.
                else if ( parity_of_tokens_left === 1 && current_tok.getType() !== 'COMMA' ) {
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

        /// CHECK .global LINE
        line_num += 1;                                          // move to the .global line
        let line = this.token_lines[line_num];                  // current line

        if ( line.length !== 2 || line[0].getValue() !== '.global' ) {
            this.newError(`Must begin text section with a valid \'.global\' directive: line ${this.line_numbers[line_num]}.`);
        }

        /// Some variables for later
        const global_funct_name = line[1].getValue();           // the name of the glibal function for later
        line_num += 1;                                          // move to instructions part of text section
        const data_labels = Object.keys(this.labels);           // to be used for replacing data labels in instructions
        const pmem_file_lines = [];                             // where in the text file each pmem line is 
        const opcode_32_bit = ['CALL', 'JMP', 'LDS', 'STS'];    // instructions with 32 bit opcode

        //////// CREATE PMEM AND GET THE LABEL LOCATIONS
        while ( line_num < (this.token_lines.length - 1) ) {

            let line = this.token_lines[line_num]; // current line
            const line_length = line.length; // calculate number of tokens in the line
            const line_in_file = this.line_numbers[line_num]; // the current line if there's an error

            let tok_num = 0;
            let has_label = false; // bool for if the line has a label

            // While loop does:
                // Check for labels and remove them
                // Change HI8 LO8 to integers
                // Change REF type (data labels) to integers 
            while ( tok_num < line_length ) {

                const current_tok = line[tok_num]; // current token

                // Check for labels and remove them
                if ( current_tok.getType() === 'LABEL' ) {

                    // Label can only be at the start
                    if ( tok_num !== 0 ) {
                        this.newError(`Illegal label location on line ${line_in_file}.`);
                    }

                    const label = current_tok.getValue().slice(0, (current_tok.getValue().length - 1)); // remove the colon from the end
                    this.labels[label] = this.pmem.length; //  add it to the labels dictionary

                    if ( this.pmem.length === 0 && label !== global_funct_name ) {
                        this.newError(`Incorrect global function name on line ${line_in_file}.`);
                    }

                    has_label = true;
                }

                // Change HI8 LO8 to integers
                else if ( ['HI8', 'LO8'].includes(current_tok.getType()) ) {
                    
                    // Must have 3 left, a bracket, a value, and a bracket
                    if ( ( line_length - 1 - tok_num ) !== 3 ) {
                        this.newError(`Illegal ${current_tok.getValue()} on line ${line_in_file}.`);
                    }

                    const left_bracket = line[tok_num + 1];
                    const variable = line[tok_num + 2];
                    const right_bracket = line[tok_num + 3];

                    // Check the token we expect to be the left bracket
                    if ( left_bracket.getType() !== 'SYMBOL' || left_bracket.getValue() !== '(' ) {
                        this.newError(`Illegal ${current_tok.getValue()} left bracket on line ${line_in_file}.`);
                    }

                    // Check the token we expect to be the right bracket
                    if ( right_bracket.getType() !== 'SYMBOL' || right_bracket.getValue() !== ')' ) {
                        this.newError(`Illegal ${current_tok.getValue()} right bracket on line ${line_in_file}.`);
                    }

                    // Check the variable is defined
                    if ( this.labels[variable.getValue()] === undefined || variable.getType() !== 'REF' ) {
                        this.newError(`Illegal ${current_tok.getValue()} variable on line ${line_in_file}.`);
                    }

                    let int_value = 0;

                    // Convert the value to the hi8/lo8 value
                    if ( current_tok.getType() === 'HI8' ) {
                        int_value = this.hi8(this.labels[variable.getValue()]);
                    }
                    
                    else {
                        int_value = this.lo8(this.labels[variable.getValue()]);
                    }

                    line[tok_num] = new Token('INT', int_value);

                    line = line.slice(0, (line.length - 3)); // remove the rest of the line
                    
                    tok_num += 3;
                }

                // Change REF type (data labels) to integers
                else if ( current_tok.getType() === 'REF' && data_labels.includes(current_tok.getValue()) ) {
                    current_tok.setType('INT');
                    current_tok.setValue( this.labels[current_tok.getValue()] );
                }

                tok_num += 1;
            }

            // If the line has a label AND instruction remove the label
            if ( has_label && ( line_length > 1 ) ) {
                line = line.slice(1);
            }
            
            // Add the line to the program memory
            if ( (!has_label) || ( has_label && ( line_length > 1 ) ) ) {
                
                // If theyre not instructions, it's illegal
                if ( line[0].getType() !== 'INST' ) {
                    this.newError(`Illegal token \'${line[0]}\' on line ${line_in_file}.`);
                }
                
                this.pmem.push(line);                   // set the line to the line without the label
                pmem_file_lines.push(line_in_file);
                const inst = line[0].getValue();
                
                // Add None as next line if it's a 32 bit opcode
                if ( opcode_32_bit.includes(inst) ) {
                    this.pmem.push(null);
                    pmem_file_lines.push(line_in_file);
                }
            }

            line_num += 1;

        }

        const control_flow_instructions = ['CALL', 'JMP', 'RJMP'].concat( INST_LIST.slice(7,27) ); // all the branching instructions

        ////////// TURN ALL REFS INTO INT FOR BRANCHING INSTRUCTIONS
        for (let line_num = 0; line_num < this.pmem.length; line_num++) {

            const line = this.pmem[line_num]; // current line

            if ( line === null ) {
                continue
            }

            const line_length = line.length;                    // calculate number of tokens in the line
            const line_in_file = pmem_file_lines[line_num];     // the current line if there's an error

            const first_tok = line[0];                          // first token in the line

            // Go through the token lines
            for (let tok_num = 0; tok_num < line_length; tok_num++) {

                const current_tok = line[tok_num];

                // Replace REF with integer for branching
                if ( current_tok.getType() === 'REF' ) {
                    
                    // Check the label reference is a real label
                    if ( this.labels[current_tok.getValue()] === undefined ) { 
                        this.newError(`Illegal token \'${current_tok}\' on line ${line_in_file}.`);
                    }
                    
                    // If it's a non relative control flow instruction 
                    if ( control_flow_instructions.slice(0,2).includes(first_tok.getValue()) ) {
                        
                        let k = this.labels[ current_tok.getValue() ];      // Get k for label
                        
                        // Replace it in the line
                        current_tok.setType('INT');
                        current_tok.setValue(k);
                    }

                    // If it's a relative control flow instruction
                    else if ( control_flow_instructions.slice(2).includes(first_tok.getValue()) ) {

                        let k = this.labels[ current_tok.getValue() ];      // Get k for label
                        let relative_k = k - 1 - line_num;                  // the k for relative jumping instructions

                        // Replace it in the line
                        current_tok.setType('INT');
                        current_tok.setValue(relative_k);
                    }
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

            if ( line == null ) {                               // skip over none lines
                continue
            }

            let line_length = line.length;                      // calculate number of tokens in the line
            const line_in_file = pmem_file_lines[line_num];     // the current line if there's an error

            // CHECK FOR COMMA AND REMOVE THEM IF THEYRE CORRECTLY PLACED
            if ( line_length > 2 ) {
                
                // If the 2rd token is not a comma then its bad syntax
                if ( line[2].getType() !== 'COMMA' ) {
                    this.newError(`Illegal token ${line[2]} on line ${line_in_file}: expecting comma.`);
                }

                line.splice(2,1);                       // remove the comma
                line_length -= 1;                       // line is shorter by 1
            }

            const inst = line[0].getValue();            // instruction for that line

            // CHECK IT'S A REAL INSTRUCTION
            if ( INST_OPERANDS[inst] === undefined ) {
                this.newError(`Illegal instruction \'${inst}\' on line ${line_in_file}.`);
            }

            // GET GIVEN AND EXPECTED ARGUMENTS
            const expected_args = INST_OPERANDS[inst];  // the arguments we expect
            const given_args = line.slice(1);           // the arguments we have

            // CHECK IF IT'S GOT THE WRONG NUMBER OF ARGUMENTS
            if ( ( expected_args === null && given_args.length > 0 ) || ( expected_args !== null  && ( given_args.length !== expected_args.length  ) ) ) {
                this.newError(`Wrong number of arguments given on line ${line_in_file}.`);
            }

            // CHECK THE ARGUMENTS
            for (let tok_num = 1; tok_num < line_length; tok_num++) {

                const given_arg = line[tok_num];                // given arg
                const exp_arg = expected_args[ tok_num - 1 ];   // expected arg

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
        return parseInt ( ( val - ( val % 0x100) ) / 0x100 );
    }

    lo8(val) {
        return ( val % 0x100 );
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

    constructor(dmem, pmem) {

        // DATA & PROGRAM MEMORY
        this.dmem = dmem;
        this.pmem = pmem;

        

        // DEFINING PC, SP AND SREG
        this.pcl = this.dmem[0x5B]; // PC lo8
        this.pch = this.dmem[0x5C]; // PC hi8
        this.spl = this.dmem[0x5D]; // SP lo8
        this.sph = this.dmem[0x5E]; // SP hi8
        this.sreg = this.dmem[0x5F]; // SREG

        // SETTING PC = 0 & SREG = RAMEND
        this.setPC(0);
        this.setSP(this.ramend);

    }

    step() {
        // pass
    }

    getPC() {
        return ( 0x100 * this.pch.getValue() ) + this.pcl.getValue();
    }

    setPC(new_value) {

        const hi8 = ( new_value - ( new_value % 0x100 ) ); // 0x100
        const lo8 = ( new_value % 0x100 );

        this.pch.setValue(hi8);
        this.pcl.setValue(lo8);
    }

    getSP() {
        return ( 0x100 * this.sph.getValue() ) + this.spl.getValue();
    }

    setSP(new_value) {

        const hi8 = ( new_value - ( new_value % 0x100 ) ); // 0x100
        const lo8 = ( new_value % 0x100 );

        this.sph.setValue(hi8);
        this.spl.setValue(lo8);
    }

    incSP(self) {
        this.setSP( this.getSP() + 1 );
    }

    decSP(self) {
        this.setSP( this.getSP() - 1 );
    }

    convertPmemToksToCode(toks) {
        // Takes a line as tokens and converts it to code.

        if (toks === null) {
            return '(two line inst.)';
        }

        const inst = toks[0].getValue();

        // IF THERE'S NO ARGUMENTS
        if ( toks.length === 1 ) {
            return inst;
        }

        const args = toks.slice(1);

        let arg1 = `${args[0].getValue()}`; // value of the argument

        if ( args[0].getType() === 'REG' ) {
            arg1 = 'R' + arg1;
        }
        // IF THERE'S 1 ARGUMENT
        if ( toks.length === 2 ) {
            return `${inst} ${arg1}`;
        }

        // IF THERE'S 2 ARGUMENTS
        let arg2 = `${args[1].getValue()}`; // value of the argument
        if ( args[1].getType() === 'REG' ) {
            arg2 = 'R' + arg2;
        }

        return `${inst} ${arg1}, ${arg2}`;
    }
}




INST_LIST = [
    'ADC',
    'ADD',
    'ADIW',
    'AND',
    'ANDI',
    'ASR',
    'BCLR',
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
const reg_word_low = new Argument('REG', options_list=[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
const int_0_7 = new Argument('INT', 0, 7);
const int_0_31 = new Argument('INT', 0, 31);
const int_0_63 = new Argument('INT', 0, 63);
const int_0_255 = new Argument('INT', 0, 255);
const int_n64_63 = new Argument('INT', -64, 63);
const word_plus_q_0_63 = new Argument('WORDPLUSQ', 0, 63);
const word_wxyz = new Argument('REG', options_list=[24, 26, 28, 30]);

// Allows ranges for each inst
INST_OPERANDS = {
    'ADC': [reg_0_31, reg_0_31],
    'ADD': [reg_0_31, reg_0_31],
    'ADIW': [word_wxyz, int_0_63],
    'AND': [reg_0_31, reg_0_31],
    'ANDI': [reg_16_31, int_0_255],
    'ASR': [reg_0_31],
    'BCLR': [int_0_7],
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
    'CALL': [new Argument('INT', 0, 4194303)],
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
    'XCH': [new Argument('WORD', exact_value='Z'), reg_0_31]
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
    'LSR': null,
    'MOV': ['d', 'r', '001011rdddddrrrr'],
    'MOVW': null,
    'MUL': ['d', 'r', '100111rdddddrrrr'],
    'MULS': ['d', 'r', '00000010ddddrrrr'],
    'MULSU': null,
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
    'ROR': null,
    'SBC': ['d', 'r', '000010rdddddrrrr'],
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
    'STS': ['k', 'r', '1001001ddddd0000kkkkkkkkkkkkkkkk'],
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




class App {
    constructor() {
        this.pmem_top = 0;
        this.dmem_top = 0x100;
        this.lexer = new Lexer();
        this.parser = new Parser();
    }

    assemble() {

        // Getting text from the text window
        let txt = document.getElementById('code_box').value;

        if (txt.length > 0) {

            // Tokenizing
            this.lexer.newData(txt);

            console.log(this.lexer.getTokenLines());

            // Parsing
            this.parser.newData(this.lexer.getTokenLines(), this.lexer.getLineNumbers());

            console.log(this.parser.getPMEM());

            // Populating Display with Data
            this.populateAll();
            

            // Interpreter
            

            // Success!
            this.successfulConstruction();

        }

        else {
            this.newError('No code to parse. Please input code in the code box.')
        }

    }

    populateAll() {
        this.populateRegisters();
        this.populatePMEM(this.pmem_top);
        this.populateDMEM(this.dmem_top);
    }

    populateRegisters() {
        const num_lines = 4; // number of lines in the table
        const regs_per_line = 8;
        const registers = this.parser.dmem.slice(0,32);
    
        // Go through the lines
        for (let line = 0; line < num_lines; line++) {
    
            // Don't need to populate the table headings since they never change
    
            // Go through each reg in the line
            for (let reg = 0; reg < regs_per_line; reg++) {
                const reg_num = reg + (line * regs_per_line);
                let reg_value = registers[reg_num].getValue().toString(16);
    
                // Add 0's to the front until it's 2 digits long
                for (let i = reg_value.length; i < 2; i++) {
                    reg_value = '0' + reg_value;
                }
    
                document.getElementById(`reg-${reg_num}`).innerHTML = reg_value;
            }
        }
    }
    
    populatePMEM(start_cell) {
        const num_lines = 8; // number of lines in the table
        for (let line = 0; line < num_lines; line++) {
            document.getElementById(`pmem-linenum-${line}`).innerHTML = `${start_cell + line}`;
            
            let line_value =  this.parser.pmem[ start_cell + line ];  // get the line to print
    
            if (line_value === null) {                    // replace null lines with (two line inst.)
                line_value = '(two line inst.)';
            }
    
            document.getElementById(`pmem-line-${line}`).innerHTML = line_value;
        }
    }
    
    populateDMEM(start_cell) {
        const num_lines = 8; // number of lines in the table
        const num_rows = 8; // number of lines in the table
        for (let line = 0; line < num_lines; line++) {
    
            let line_value = (start_cell + (num_rows * line)).toString(16);     // Calculate line start cell number as base 16 string
    
            // Add 0's to the front until it's 4 digits long
            for (let i = line_value.length; i < 4; i++) {
                line_value = '0' + line_value;
            }
    
            // Put the line value in the html
            document.getElementById(`dmem-linenum-${line}`).innerHTML = line_value;
    
            // Put the cell values in the html
            for (let row = 0; row < num_rows; row++) {
                let cell_value = this.parser.dmem[ start_cell + row + (num_rows * line) ].toString(16);

                // 0x8bf
    
                // Add 0's to the front until it's 4 digits long
                for (let i = cell_value.length; i < 2; i++) {
                    cell_value = '0' + cell_value;
                }
                
                document.getElementById(`dmem-line-${line}${row}`).innerHTML = cell_value;
            }
        }
    }

    successfulConstruction() {
        document.getElementById('output').innerHTML = 'Success! Your code can be run.';
        document.getElementById('error').innerHTML = null;
        document.getElementById('status').innerHTML = null;
    }

    newError(text) {
        document.getElementById('error').innerHTML = text;
        document.getElementById('output').innerHTML = null;
        document.getElementById('status').innerHTML = null;
        throw new SyntaxError(text);
    }

    displayPMEMUp() {
        if ( this.pmem_top >= 8 ) {
            this.pmem_top -= 8;
            this.populatePMEM(this.pmem_top);
        }
    }

    displayPMEMDown() {
        if (this.pmem_top <= (this.parser.flashend - 8) ) {
            this.pmem_top += 8;
            this.populatePMEM(this.pmem_top);
        }
    }

    displayDMEMUp() {
        if ( this.dmem_top >= 0x140 ) {
            this.dmem_top -= 0x40;
            this.populateDMEM(this.dmem_top);
        }
    }

    displayDMEMDown() {
        if (this.dmem_top <= (this.parser.ramend - 0x40) ) {
            this.dmem_top += 0x40;
            this.populateDMEM(this.dmem_top);
        }
    }

    displayDMEMTop() {
        this.dmem_top = 0x100;
        this.populateDMEM(this.dmem_top);
    }

    displayDMEMBottom() {
        this.dmem_top = (this.parser.ramend - 0x3f);
        this.populateDMEM(this.dmem_top);
    }



}

 

app = new App();

