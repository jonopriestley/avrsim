
import re

class Token:
    def __init__(self, type_, value=None):
        self.type = type_
        self.value = value

    def __repr__(self):
        return f'{self.type}:{self.value}'
    
    def getType(self):
        return self.type

    def getValue(self):
        return self.value
    
    def setType(self, type_):
        self.type = type_

    def setValue(self, value):
        self.value = value


class Register:
    def __init__(self, name, value=0, changed=0):
        self.name = str(name) # eg 3 for R3
        self.value = value
        self.changed = changed # for displaying as red when the value is updated

    def __repr__(self):
        return f'{self.name}: {self.value}'

    def asString(self):
        return f'{self.name}: {self.value}'

    def newInstruct(self):
        self.changed = 0

    def setValue(self, new_value):
        self.value = new_value % 256
        self.changed = 1

    def getValue(self):
        return self.value

    def getBits(self): # returns as string
        """
        Returns as string
        """
        
        val = str(bin(self.value))[2:]
        while len(val) < 8:
            val = '0' + val
        return val

    def clr(self):
        self.set_value(0)

    def ser(self):
        self.set_value(255)

    def setBit(self, bit):
        num = 2**bit
        self.value = self.value | num

    def clearBit(self, bit):
        num = 255 - 2**bit
        self.value = self.value & num

    def com(self):
        self.set_value(255 - self.value)

    def neg(self):
        self.set_value(256 - self.value)

    def inc(self):
        self.set_value(self.value + 1)

    def dec(self):
        self.set_value(self.value - 1)


class Argument:

    def __init__(self, token_type, min_val=None, max_val=None, options_list=None,exact_value=None):
        self.token_type = token_type # the token you're expecting for the argument
        self.min_val = min_val # the min value you're expecting for that token
        self.max_val = max_val
        self.options_list = options_list
        self.exact_value = exact_value

    def isLegalToken(self, tok, line_num):
        """
        Takes a token and checks if it matches with the argument.
        """
        
        legal_token_types = self.getTokenType() # the legal token types for this argument

        # CHECK IF IT'S A LEGAL ARGUMENT
        if ( tok.getType() not in legal_token_types ):
            raise SyntaxError(f'Illegal token \'{tok.getValue()}\' on line {line_num}.')

        # CHECK ITS LEGAL TOKEN TYPE AND WITHIN THE LEGAL BOUNDS
        if ( self.hasValueRange() ):

            val = tok.getValue() # value of the token
            
            if ( tok.getType() == 'WORDPLUSQ' ): val = int( val[2:] ) # get rid of the Z+ or Y+ part

            if not ( self.getMinVal() <= val <= self.getMaxVal() ):
                if ( tok.getType() == 'REG' ): tok.setValue(f'R{tok.getValue()}') # set it to register
                raise SyntaxError(f'Illegal argument \'{tok.getValue()}\' on line {line_num}.')

        # CHECK ITS LEGAL TOKEN TYPE AND in THE LEGAL LIST
        elif ( self.hasOptionsList() ) and ( tok.getValue() not in self.getOptionsList() ):
            raise SyntaxError(f'Illegal argument \'{tok.getValue()}\' on line {line_num}.')

        # CHECK ITS LEGAL TOKEN TYPE AND IN THE LEGAL LIST
        elif ( self.hasExactValue() ) and ( tok.getValue() != self.getExactValue() ):
            raise SyntaxError(f'Illegal argument \'{tok.getValue()}\' on line {line_num}.')

    def getTokenType(self):
        return self.token_type

    def getMinVal(self):
        return self.min_val

    def getMaxVal(self):
        return self.max_val

    def getOptionsList(self):
        return self.options_list
    
    def getExactValue(self):
        return self.exact_value

    def hasValueRange(self):
        return ( self.min_val != None ) and ( self.max_val != None )

    def hasOptionsList(self):
        return (self.options_list != None)
    
    def hasExactValue(self):
        return (self.exact_value != None)
        

class Instruction:

    def __init__(self, tokens):
        self.inst = tokens[0]
        self.args = tokens[1:]
        self.opcode = self.makeOpcode()

    def __repr__(self):

        inst = self.inst.getValue()

        args_len = len(self.args)

        # IF THERE'S NO ARGUMENTS
        if ( args_len == 0 ): return inst

        # IF THERE'S 1 ARGUMENT
        if ( args_len == 1 ):

            arg1 = str( self.args[0].getValue() ) # value of the argument

            if ( self.args[0].getType() == 'REG' ): arg1 = 'R' + arg1

            return f'{inst} {arg1}'

        # IF THERE'S 2 ARGUMENTS
        arg1 = str( self.args[0].getValue() ) # value of the argument
        if ( self.args[0].getType() == 'REG' ): arg1 = 'R' + arg1

        arg2 = str( self.args[1].getValue() ) # value of the argument
        if ( self.args[1].getType() == 'REG' ): arg2 = 'R' + arg2

        return f'{inst} {arg1}, {arg2}'

    def twosComp(self, number, digits):
        """
        Returns a number in 2's comp with a given
        number of digits.
        """


        if number >= 0:
            b = bin(number)[2:]
            b = ( (digits - len(b)) * '0' ) + b # make it the correct length
            return b
    
        b = 2**(digits - 1) + number
        b = bin(b)[2:]
        b = ( (digits - len(b)) * '1' ) + b # make it the correct length
        return b

    def binLenDigits(self, number, digits):

        b = bin(number)[2:]
        b = ( (digits - len(b)) * '0' ) + b # make it the correct length
        return b

    def makeOpcode(self):
        """
        Returns the opcode for the instruction
        """
        
        opcode_requirements = INST_OPCODES[ self.inst.getValue() ]

        if ( opcode_requirements != None ):

            arg_len = len(self.args)
            
            # Return the opcode if it's always the same opcode
            if ( len(opcode_requirements) == 1 ): return opcode_requirements[0]

            # Get the opcode for use later
            opcode = opcode_requirements[-1]

            # GO THROUGH EACH ARGUMENT AND SYMBOL ASSOCIATED WITH IT AND REPLACE THEM IN THE GIVEN OPCODE
            for arg_num in range(arg_len):
                
                symbol = opcode_requirements[ arg_num ] # the symbol for replacing in the opcode e.g. 'd'

                digits = opcode.count( symbol ) # number of digits the argument takes up in the opcode

                if (digits == 0 ): continue # skip if it's an argument that doesnt matter (like Z in XCH)

                arg = self.args[ arg_num ].getValue() # the argument value

                # If it's a 2's comp value then make it 2's comp
                if ( self.inst.getValue() in ( INST_LIST[7:27] + ['RJMP'] ) ): var_value = self.twosComp(arg, digits)

                # Otherwise just make it regular binary
                else: var_value = self.binLenDigits(arg, digits)

                for i in range(digits):
                    opcode = opcode.replace(symbol, var_value[i], 1)

            return opcode    

        else:
            return 'xxxxxxxxxxxxxxxx'

    def getCode(self):
        return self.__repr__()

    def getOpcode(self):
        return self.opcode
    

class Lexer:

    def __init__(self, text):
        self.text = text

        toks_info = self.tokenize(self.text)

        self.token_lines = toks_info[0]
        self.line_numbers = toks_info[1] # text file line number for each token line

    def tokenize(self, code):
        """
        Takes the code as raw text and returns the tokens as a list of
        lists where each list is a single line as its tokens.
        """

        # Define regular expressions for each token type
        patterns = [
            (r';.*', None),  # comments
            (r'\s+', None),  # whitespace
            (r'[\w_]{1}.*:', 'LABEL'),  # labels
            (r'lo8|LO8', 'LO8'),  # lo8
            (r'hi8|HI8', 'HI8'),  # hi8
            (r'[rR]\d+', 'REG'),  # registers
            (r'-{0,1}0x[\dABCDEFabcdef]+|-{0,1}\$[\dABCDEFabcdef]+', 'INT'),  # numbers
            (r'-{0,1}\d+|-{0,1}0b[01]+', 'INT'),  # numbers
            (r'[a-zA-Z]{2,6}', 'INST'),  # instructions --> CAN TURN LABELS USED IN AN INSTRUCTION INTO INST TYPE
            (r'\".*?\"|\'.*?\'', 'STR'),  # string
            (r'\.[^\.\s]+', 'DIR'),  # directives
            (r'[YZ]\+\d{1,2}', 'WORDPLUSQ'),  # word+q
            (r'[XYZ]\+', 'WORDPLUS'),  # word+
            (r'\-[XYZ]', 'MINUSWORD'),  # -word
            (r'[XYZ]', 'WORD'),  # word
            (r',', 'COMMA'),  # comma
            (r'[^\w\s]+', 'SYMBOL'),  # symbols
            (r'[^\s\d]{1}[\w\d_]*', 'REF')  # references (like labels used in an instruction) --> Called STRING in sim.py
        ]

        tokens = []
        line_nums = []

        code = code.split('\n')
        
        # Go over every line of code and move through the line making tokens
        for line_number, line in enumerate(code):

            pos = 0
            line_toks = []
            
            # Iterate over the input code, finding matches for each token type
            while pos < len(line):
                match = None
                
                for pattern, tag in patterns:
                    regex = re.compile(pattern)
                    match = regex.match(line, pos)
                    if match:
                        if tag:
                            token = Token(tag, match.group())
                            line_toks.append(token)
                        break
                
                if not match:
                    raise ValueError(f'Invalid syntax on line {line_number + 1} starting at position {pos}')
                
                pos = match.end()

            # Fixing any bad tokens (like REFs being INST tokens)
            i = 0
            while i < len(line_toks):

                current_tok = line_toks[i] 

                # Turn REG:Rn into REG:n
                if ( current_tok.getType() == 'REG' ):
                    num = current_tok.getValue()[1:] # the register number
                    current_tok.setValue( int( num ) )
                
                # Turn bad 'INST' back into 'REF' (unless it's actually an instruction behind a label)
                elif ( i > 0 ) and ( current_tok.getType() == 'INST' ) and not ( ( i == 1 ) and ( line_toks[i - 1].getType() == 'LABEL' ) ):
                    current_tok.setType('REF')

                # If both the current and previous tokens should be 1 REF token combine them
                if ( i > 0 ) and (line_toks[i - 1].getType() == 'REF') and (current_tok.getType() == 'REF'):
                    line_toks[i - 1].setValue( line_toks[i - 1].getValue() + current_tok.getValue() )
                    line_toks.pop(i) # Virtually advancing

                # Actually advancing if you haven't shortened the list length as above
                else: i += 1

            if ( line_toks != [] ): # Add to the tokens list if the line isnt empty
                tokens.append(line_toks)
                line_nums.append(line_number + 1) # Add the line numbers of each line for later

        return tokens, line_nums

    def getText(self):
        return self.text

    def getTokenLines(self):
        return self.token_lines

    def getLineNumbers(self):
        return self.line_numbers


reg_0_31 = Argument('REG', 0, 31)
reg_16_31 = Argument('REG', 16, 31)
reg_word_low = Argument('REG', options_list=[(2 * i) for i in range(0,16)])
int_0_7 = Argument('INT', 0, 7)
int_0_31 = Argument('INT', 0, 31)
int_0_63 = Argument('INT', 0, 63)
int_0_255 = Argument('INT', 0, 255)
int_n64_63 = Argument('INT', -64, 63)
word_plus_q_0_63 = Argument('WORDPLUSQ', 0, 63)
word_wxyz = Argument('REG', options_list=[24, 26, 28, 30])


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
]   


# Allows ranges for each inst
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
    'CALL': [Argument('INT', 0, 4194303)],
    'CBI': [int_0_31, int_0_7],
    'CBR': [reg_16_31, int_0_255],
    'CLC': None,
    'CLH': None,
    'CLI': None,
    'CLN': None,
    'CLR': [reg_0_31],
    'CLS': None,
    'CLT': None,
    'CLV': None,
    'CLZ': None,
    'COM': [reg_0_31],
    'CP': [reg_0_31, reg_0_31],
    'CPC': [reg_0_31, reg_0_31],
    'CPI': [reg_16_31, int_0_255],
    'DEC': [reg_0_31],
    'EOR': [reg_0_31, reg_0_31],
    'IN': [reg_0_31, int_0_63],
    'INC': [reg_0_31],
    'JMP': [Argument('INT', 0, 4194303)],
    'LD': [reg_0_31, Argument(['WORD', 'MINUSWORD', 'WORDPLUS'])],
    'LDD': [reg_0_31, word_plus_q_0_63],
    'LDI': [reg_16_31, int_0_255],
    'LDS': [reg_0_31, Argument('INT', 256, 65535)],
    'LSL': [reg_0_31],
    'LSR': [reg_0_31],
    'MOV': [reg_0_31, reg_0_31],
    'MOVW': [reg_word_low, reg_word_low],
    'MUL': [reg_0_31, reg_0_31],
    'MULS': [reg_16_31, reg_16_31],
    'MULSU': [Argument('REG', 16, 23), Argument('REG', 16, 23)],
    'NEG': [reg_0_31],
    'NOP': None,
    'OR': [reg_0_31, reg_0_31],
    'ORI': [reg_16_31, int_0_255],
    'OUT': [int_0_63, reg_0_31],
    'POP': [reg_0_31],
    'PUSH': [reg_0_31],
    'RET': None,
    'RJMP': [Argument('INT', -2048, 2047)],
    'ROL': [reg_0_31],
    'ROR': [reg_0_31],
    'SBC': [reg_0_31, reg_0_31],
    'SBI': [int_0_31, int_0_7],
    'SBIW': [word_wxyz, int_0_63],
    'SBR': [reg_16_31, int_0_255],
    'SBRC': [reg_0_31, int_0_7],
    'SBRS': [reg_0_31, int_0_7],
    'SEC': None,
    'SEH': None,
    'SEI': None,
    'SEN': None,
    'SER': [reg_0_31],
    'SES': None,
    'SET': None,
    'SEV': None,
    'SEZ': None,
    'ST': [Argument(['WORD', 'MINUSWORD', 'WORDPLUS']), reg_0_31],
    'STD': [word_plus_q_0_63, reg_0_31],
    'STS': [Argument('INT', 256, 65535), reg_0_31],
    'SUB': [reg_0_31, reg_0_31],
    'SUBI': [reg_16_31, int_0_255],
    'SWAP': [reg_0_31],
    'TST': [reg_0_31],
    'XCH': [Argument('WORD', exact_value='Z'), reg_0_31]
}


# Most op codes can be easily obtained from this
INST_OPCODES = {
    'ADC': ['d', 'r', '000111rdddddrrrr'],
    'ADD': ['d', 'r', '000011rdddddrrrr'],
    'ADIW': None,
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
    'CBR': None,
    'CLC': ['1001010010001000'],
    'CLH': ['1001010011011000'],
    'CLI': ['1001010011111000'],
    'CLN': ['1001010010101000'],
    'CLR': None,
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
    'LD': None,
    'LDD': None,
    'LDI': ['d', 'K', '1110KKKKddddKKKK'],
    'LDS': ['d', 'k', '1001000ddddd0000kkkkkkkkkkkkkkkk'],
    'LSL': None,
    'LSR': None,
    'MOV': ['d', 'r', '001011rdddddrrrr'],
    'MOVW': None,
    'MUL': ['d', 'r', '100111rdddddrrrr'],
    'MULS': ['d', 'r', '00000010ddddrrrr'],
    'MULSU': None,
    'NEG': ['d', '1001010ddddd0001'],
    'NOP': ['0000000000000000'],
    'OR': ['d', 'r', '001010rdddddrrrr'],
    'ORI': ['d', 'K', '0110KKKKddddKKKK'],
    'OUT': ['A', 'r', '10111AArrrrrAAA'],
    'POP': ['d', '1001000ddddd1111'],
    'PUSH': ['r', '1001001rrrrr1111'],
    'RET': ['1001010100001000'],
    'RJMP': ['k', '1100kkkkkkkkkkkk'], # this one needs 2's comp too
    'ROL': None,
    'ROR': None,
    'SBC': ['d', 'r', '000010rdddddrrrr'],
    'SBI': ['A', 'b', '10011010AAAAAbbb'],
    'SBIW': None,
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
    'ST': None,
    'STD': None,
    'STS': ['k', 'r', '1001001ddddd0000kkkkkkkkkkkkkkkk'],
    'SUB': ['d', 'r', '000110rdddddrrrr'],
    'SUBI': ['d', 'K', '0101KKKKddddKKKK'],
    'SWAP': ['d', '1001010ddddd0010'],
    'TST': None,
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
]



class Parser:

    def __init__(self, token_lines, line_numbers):
        self.token_lines = token_lines
        self.line_numbers = line_numbers

        self.labels = {} # the locations of the labels in the program
        
        self.dmem = [Register(f'R{i}') for i in range(0x100)] # the data in order

        self.pmem = [] # program memory

        self.parse()

    def parse(self):
        """
        Parses the tokens given in the initialisation of
        the parser. The parser raises an error if there
        is invalid syntax, otherwise it prepares the tokens
        to be read by an interpreter and returns None.
        """
        
        ############################################
        ######### CHECK SECTION DIRECTIVES #########
        ############################################

        ##### Check if first line is a .section directive
        first_line = self.token_lines[0]
        if ( ( first_line[0].getType() != 'DIR' ) or ( first_line[0].getValue() != '.section' ) ):
            raise SyntaxError(f'First line must be a \'.section\' directive')

        ##### Check if the first line is correct length and directives
        if ( (len(first_line) != 2) or ( first_line[1].getType() != 'DIR' ) or ( first_line[1].getValue() not in ['.data', '.text'] ) ):
            raise SyntaxError(f'First line must be \'.section .data\' or \'.section .text\'')

        ##### Check if last line is .end
        final_line = self.token_lines[-1]
        if ( ( len(final_line) > 1 ) or ( final_line[0].getType() != 'DIR' ) or ( final_line[0].getValue() != '.end' ) ):
            raise SyntaxError(f'Final line must be \'.end\'')

        ##### Find .section .text start #####
        text_section_start = None
        data_section_start = None
        for line_num, line in enumerate(self.token_lines):
            
            # If you find a .section directive check it
            if ( line[0].getValue() == '.section' ) and ( line[0].getType() == 'DIR' ):
                
                if (len(line) != 2) or ( line[1].getType() != 'DIR' ) or ( line[1].getValue() not in ['.data', '.text'] ):
                    raise SyntaxError(f'Invalid \'.section\' directive')
                
                # If you find the text section then stop looking
                if ( line[1].getValue() == '.data' ):
                    
                    if ( text_section_start != None ): raise SyntaxError(f'Data section must come before the text section')
                    
                    data_section_start = line_num

                # If you find the text section then stop looking
                elif ( line[1].getValue() == '.text' ):

                    text_section_start = line_num

                    if ( data_section_start != None):
                        break

        # If there's no text section, raise an error        
        if ( text_section_start == None ): raise SyntaxError(f'File must contain a \'.section .text\'')

        ############################################
        ############### CHECK TOKENS ###############
        ############################################

        number_of_lines = len(self.token_lines)

        # Check INST are valid and make them upper case
        # Check REG are valid
        for line_num in range(number_of_lines): # go through each line

            line = self.token_lines[line_num] # tokens in the current line
            line_length = len(line) # calculate number of tokens in the line
            line_in_file = self.line_numbers[line_num] # the current line if there's an error
            
            for tok_num in range(line_length): # go through each token and make them the correct format

                current_tok = line[tok_num]

                # Check INST and make upper case
                if ( current_tok.getType() == 'INST' ):

                    current_tok.setValue( current_tok.getValue().upper() ) # make all instructions upper case

                    if ( current_tok.getValue() not in INST_LIST ): # check if the token is a valid instruction
                        raise SyntaxError(f'Invalid instruction \'{current_tok.getValue()}\' on line {line_in_file}.')

                # Check REG are valid numbers and make them upper case
                elif ( current_tok.getType() == 'REG' ):

                    reg_number = current_tok.getValue() # number of the register

                    if ( reg_number > 31 ): raise SyntaxError(f'Illegal register \'R{current_tok.getValue()}\' on line {line_in_file}.')


                # Check DIR are valid directives
                elif ( current_tok.getType() == 'DIR' ) and  ( current_tok.getValue() not in DIRECTIVES ):
                    raise SyntaxError(f'Invalid directive \'{current_tok.getValue()}\' on line {line_in_file}.')

                # Convert integers to base 10
                elif ( current_tok.getType() == 'INT' ):

                    if ( 'x' in current_tok.getValue() ): # convert base 16 to base 10
                        int_value = int(current_tok.getValue(), 16) # make int

                    elif ( current_tok.getValue()[0] == '$' ) :
                        int_value = int(current_tok.getValue()[1:], 16)

                    elif ( 'b' in current_tok.getValue() ): # convert binary to base 10
                        int_value = int(current_tok.getValue(), 2) # make int

                    else: 
                        int_value = int(current_tok.getValue()) # make int
                    
                    current_tok.setValue( int_value ) # values can be above 255

        ############################################
        ############### DATA SECTION ###############
        ############################################

        # Check data section exists
        data_section_exists = ( text_section_start != 0 )
        
        line_num = 0 # will start at 0 for if there's no .data section

        # GO THROUGH LINES IN DATA SECTION
        while ( data_section_exists and ( line_num < text_section_start ) ):

            if (line_num == 0): # skip if it's the .section .data line
                line_num += 1
                continue

            line = self.token_lines[line_num]
            line_length = len(line) # calculate number of tokens in the line
            line_in_file = self.line_numbers[line_num] # the current line if there's an error

            tok_num = 0
            
            # DEAL WITH LABELS AT THE START OF THE LINE
            if ( line[tok_num].getType() == 'LABEL' ):
                label = line[0].getValue().rstrip(':') # get label without the colon at the end
                self.labels[label] = len(self.dmem) # add location of the data label
                tok_num += 1
            
            # CHECK THE DIRECTIVE
            if ( line[tok_num].getType() != 'DIR' ): raise SyntaxError(f'Illegal syntax \'{line[tok_num].getValue()}\' on line {line_in_file}.')
            
            line_directive = line[tok_num].getValue() # get the directive for this line to use below

            tok_num += 1 # Move to the next token in the line

            # EXECUTE THE DIRECTIVE
            while ( tok_num < line_length ):
                
                current_tok = line[tok_num]
                
                parity_of_tokens_left = (line_length - 1 - tok_num) % 2 # used for calculating comma placement

                ### EXECUTE THE DIRECTIVES ###

                if ( line_directive == '.byte' ) and ( parity_of_tokens_left == 0 ):

                    if ( current_tok.getType() != 'INT' ): # expecting integer
                        raise SyntaxError(f'Bad token \'{current_tok.getValue()}\' on line {line_in_file}.')
                    
                    self.dmem.append( current_tok.getValue() ) # add to data

                elif ( line_directive in ['.string', '.ascii', '.asciz'] ) and ( parity_of_tokens_left == 0 ):
                    
                    if ( current_tok.getType() != 'STR' ):
                        raise SyntaxError(f'Bad token \'{current_tok.getValue()}\' on line {line_in_file}.')
                    
                    string_text = current_tok.getValue()[1:-1] # remove quotation marks from either side
                    
                    # Go through each character and add it's ascii code to the data
                    for char in string_text:
                        
                        char_ascii_value = self.convertStringToAsciiValues( char ) # get ascii code
                        
                        if char_ascii_value > 127: # check it's a valid character
                            raise SyntaxError(f'Bad character \'{char}\' on line {line_in_file}.')
                        
                        self.dmem.append( char_ascii_value ) # add to data

                    if ( line_directive in ['.string', '.asciz'] ): # add NULL if directive requires it
                        self.dmem.append( 0 ) # add NULL to data

                elif ( line_directive == '.space' ) and ( parity_of_tokens_left == 0 ):
                    
                    if ( current_tok.getType() != 'INT' ): # expecting integer
                        raise SyntaxError(f'Bad token \'{current_tok.getValue()}\' on line {line_in_file}.')

                    # Check if it's the number of spaces or the content of the spaces
                        # Check if the previous token is the directive
                        # If so, it's the number of spaces
                    
                    if ( line[tok_num - 1].getType() == 'DIR' ): # if this integer is the number of values
                        
                        number_of_spaces = current_tok.getValue()

                        if ( ( tok_num + 1 ) == line_length ): # if there is no space value given, make them 0
                            for i in range(number_of_spaces):
                                self.dmem.append( 0 ) # add 0's for as many spaces as needed

                    elif ( ( tok_num + 1 ) != line_length ): # if it's the second argument given it must be the last
                        raise SyntaxError(f'Too many arguments given for .string on line {line_in_file}.')

                    else:
                        space_value = current_tok.getValue() # value of the spaces
                        for i in range(number_of_spaces):
                            self.dmem.append( space_value ) # add the value for as many spaces as needed

                elif ( line_directive == '.def' ):
                    
                    # Check the number of arguments
                    if ( line_length - tok_num > 3): # if there's too many arguments
                        raise SyntaxError(f'Too many arguments given for .def on line {line_in_file}.')

                    # if it's the 3rd last argument (expecting REF)
                    if ( ( tok_num + 3 ) == line_length ): 

                        if ( current_tok.getType() != 'REF' ): raise SyntaxError(f'Bad argument \'{current_tok.getValue()}\' on line {line_in_file}.')

                        def_word = current_tok.getValue()

                    # Raise error if 2nd last token is not '='
                    elif ( ( tok_num + 2 ) == line_length ) and ( current_tok.getType() != 'SYMBOL' ) and ( current_tok.getValue() != '=' ):
                        raise SyntaxError(f'Bad argument \'{current_tok.getValue()}\' on line {line_in_file}.')

                    # If it's the last token (expecting REG)
                    elif ( ( tok_num + 1 ) == line_length ):
                        
                        if ( current_tok.getType() != 'REG' ): raise SyntaxError(f'Bad argument \'{current_tok.getValue()}\' on line {line_in_file}.')

                        self.labels[def_word] = current_tok.getValue()
                
                # Should be comma if there are even number of tokens left. Raise error.
                elif ( parity_of_tokens_left == 1 ) and ( current_tok.getType() != 'COMMA' ):
                    raise SyntaxError(f'Missing comma on line {line_in_file}.')

                tok_num += 1

            line_num += 1

        # Should be at .section .text line now
        
        ############################################
        ############### TEXT SECTION ###############
        ############################################

        
        ### CHECK .global LINE
        line_num += 1 # move to the .global line
        line = self.token_lines[line_num]
        if ( len(line) != 2 ) or ( line[0].getValue() != '.global' ):
            raise SyntaxError(f'Must begin text section with a valid \'.global\' directive: line {self.line_numbers[line_num]}.')
        
        ### Some variables for later
        global_funct_name = line[1].getValue() # the name of the glibal function for later
        
        line_num += 1 # move to instructions part of text section

        data_labels = [i for i in self.labels] # to be used for replacing data labels in instructions

        pmem_file_lines = [] # where in the text file each pmem line is 

        opcode_32_bit = ['CALL', 'JMP', 'LDS', 'STS'] # instructions with 32 bit opcode

        ######### CREATE PMEM AND GET THE LABEL LOCATIONS
        while ( line_num < (number_of_lines - 1) ):
            
            line = self.token_lines[line_num] # current line
            line_length = len(line) # calculate number of tokens in the line
            line_in_file = self.line_numbers[line_num] # the current line if there's an error

            tok_num = 0
            has_label = False # bool for if the line has a label
            while ( tok_num < line_length ):

                current_tok = line[tok_num] # current token
                
                # Check for labels and remove them
                if ( current_tok.getType() == 'LABEL' ):

                    # Label can only be at the start
                    if ( tok_num != 0 ): raise SyntaxError(f'Illegal label location on line {line_in_file}.')

                    label = current_tok.getValue().rstrip(':') # remove the colon from the end
                    pmem_len = len(self.pmem)
                    self.labels[label] = pmem_len # add it to the labels dictionary

                    if ( pmem_len == 0 ) and ( label != global_funct_name ):
                        raise SyntaxError(f'Incorrect global function name on line {line_in_file}.')

                    has_label = True

                # Change HI8 LO8 to integers
                elif ( current_tok.getType() in ['HI8', 'LO8'] ):
                    
                    # Must have 3 left, a bracket, a value, and a bracket
                    if ( ( line_length - 1 - tok_num ) != 3 ): raise SyntaxError(f'Illegal {current_tok.getValue()} on line {line_in_file}.')

                    left_bracket = line[tok_num + 1]
                    var = line[tok_num + 2]
                    right_bracket = line[tok_num + 3]

                    # Check the token we expect to be the left bracket
                    if ( left_bracket.getType() != 'SYMBOL' ) or ( left_bracket.getValue() != '(' ):
                        raise SyntaxError(f'Illegal {current_tok.getValue()} left bracket on line {line_in_file}.')
                    
                    # Check the token we expect to be the right bracket
                    if ( right_bracket.getType() != 'SYMBOL' ) or ( right_bracket.getValue() != ')' ):
                        raise SyntaxError(f'Illegal {current_tok.getValue()} right bracket on line {line_in_file}.')
                    
                    # Check the variable is defined
                    if ( var.getValue() not in self.labels ) or ( var.getType() != 'REF' ):
                        raise SyntaxError(f'Illegal {current_tok.getValue()} variable on line {line_in_file}.')
                    
                    # Convert the value to the hi8/lo8 value
                    if ( current_tok.getType() == 'HI8' ): int_value = self.hi8(self.labels[var.getValue()])
                    else: int_value = self.lo8(self.labels[var.getValue()])

                    line[tok_num] = Token('INT', int_value)

                    line = line[:-3] # remove the rest of the line
                    
                    tok_num += 3

                # Change REF type (data labels) to integers
                elif ( current_tok.getType() == 'REF' ) and ( current_tok.getValue() in data_labels ):
                    current_tok.setType('INT')
                    current_tok.setValue( self.labels[current_tok.getValue()] )

                tok_num += 1
                
            # If the line has a label AND instruction add the instruction
            if has_label and ( line_length > 1 ):
                line = line[1:]

            
            # Add the line to the program memory
            if (not has_label) or ( has_label and ( line_length > 1 ) ):
                
                # If theyre not instructions, it's illegal
                if ( line[0].getType() != 'INST' ): raise SyntaxError(f'Illegal token \'{line[0]}\' on line {line_in_file}.')
                
                self.pmem.append( line ) # set the line to the line without the label
                pmem_file_lines.append(line_in_file)
                inst = line[0].getValue()
                
                # Add None as next line if it's a 32 bit opcode
                if ( inst in opcode_32_bit ):
                    self.pmem.append(None)
                    pmem_file_lines.append(line_in_file)
            
            line_num += 1

        control_flow_instructions = ['CALL', 'JMP', 'RJMP'] + INST_LIST[7:27] # all the branching instructions

        ######### TURN ALL REFS INTO INT FOR BRANCHING INSTRUCTIONS
        for line_num in range(len(self.pmem)):

            line = self.pmem[line_num] # current line

            if ( line == None ): continue

            line_length = len(line) # calculate number of tokens in the line
            line_in_file = pmem_file_lines[line_num] # the current line if there's an error

            first_tok = line[0] # first token in the line

            for tok_num in range( line_length ):

                current_tok = line[tok_num]

                # Replace REF with integer for branching
                if ( current_tok.getType() == 'REF' ):

                    if ( current_tok.getValue() not in self.labels ): # check the label reference is a real label
                        raise ValueError(f'Illegal token \'{current_tok}\' on line {line_in_file}.')
                    
                    # If it's a non relative control flow instruction 
                    if ( first_tok.getValue() in control_flow_instructions[0:2] ):
                        
                        k = self.labels[ current_tok.getValue() ] # Get k for label
                        
                        # Replace it in the line
                        current_tok.setType('INT')
                        current_tok.setValue(k)

                    # If it's a relative control flow instruction
                    elif ( first_tok.getValue() in control_flow_instructions[2:] ):

                        k = self.labels[ current_tok.getValue() ] # Get k for label
                        relative_k = k - 1 - line_num # the k for relative jumping instructions

                        # Replace it in the line
                        current_tok.setType('INT')
                        current_tok.setValue(relative_k)

        ######### CHECK INSTRUCTION SYNTAX
            # Skip None lines
            # Go through and check commas in right place (then remove them)
            # Check for real instruction
            # Check number of args given is correct
            # Check if the types for each token are correct and their values are acceptable

        for line_num in range(len(self.pmem)):
            
            line = self.pmem[line_num] # the line up to

            if ( line == None ): continue # skip over none lines

            line_length = len(line) # calculate number of tokens in the line
            line_in_file = pmem_file_lines[line_num] # the current line if there's an error

            # CHECK FOR COMMA AND REMOVE THEM IF THEYRE CORRECTLY PLACED
            if ( line_length > 2 ):
                # If the 2rd token is not a comma then its bad syntax
                if ( line[2].getType() != 'COMMA' ):
                    raise SyntaxError(f'Illegal token {line[2]} on line {line_in_file}: expecting comma.')

                line.pop(2) # remove the comma
                line_length -= 1 # line is shorter by 1

            inst = line[0].getValue() # instruction for that line

            # CHECK IT'S A REAL INSTRUCTION
            if ( inst not in INST_OPERANDS ): raise SyntaxError(f'Illegal instruction \'{inst}\' on line {line_in_file}.')

            # GET GIVEN AND EXPECTED ARGUMENTS
            expected_args = INST_OPERANDS[ inst ] # the arguments we expect
            given_args = line[1:] # the arguments we have

            # CHECK IF IT'S GOT THE WRONG NUMBER OF ARGUMENTS
            if ( ( expected_args == None ) and ( len(given_args) > 0 ) ) or ( ( expected_args != None)  and ( ( len(given_args) != len(expected_args)  ) ) ):
                raise SyntaxError(f'Wrong number of arguments given on line {line_in_file}.')

            # CHECK THE ARGUMENTS
            for tok_num in range( 1, line_length ):

                given_arg = line[tok_num] # given arg
                exp_arg = expected_args[ tok_num - 1 ] # expected arg

                # CHECK THE TOKEN IS LEGAL
                exp_arg.isLegalToken(given_arg, line_in_file)

            # SET THE LINE TO AN INSTRUCTION
            self.pmem[line_num] = Instruction(line)




    def getTokenLines(self):
        return self.token_lines

    def getLineNumbers(self):
        return self.line_numbers

    def convertStringToAsciiValues(self, string):
        return ord(string)

    def hi8(self, val):
        return ( val - ( val % 0x100) ) // 0x100

    def lo8(self, val):
        return ( val % 0x100)


# Also called simulator
class Interpreter:

    def __init__(self, dmem, pmem):

        # DATA & PROGRAM MEMORY
        self.dmem = dmem
        self.pmem = pmem

        for line in self.pmem:
            print(line)
            if ( line != None ): print(line.getOpcode())
            print('')

        # DEFINING THE SIZE OF DMEM AND PMEM
        self.ramend = 0x8FF
        self.flashend = 0x3FFF

        # FILLING IN DMEM AND PMEM WITH 0/NOP
        self.dmem = self.dmem + [0 for _ in range( len(self.dmem), (self.ramend + 1) )]
        self.pmem = self.pmem + [[Token('INST', 'NOP')] for _ in range( len(self.pmem), (self.flashend + 1) )]

        # DEFINING PC, SP AND SREG
        self.pcl = self.dmem[0x5B] # PC lo8
        self.pch = self.dmem[0x5C] # PC hi8
        self.spl = self.dmem[0x5D] # SP lo8
        self.sph = self.dmem[0x5E] # SP hi8
        self.sreg = self.dmem[0x5F] # SREG

        # SETTING PC = 0 & SREG = RAMEND
        self.setPC(0)
        self.setSP(self.ramend)

    def step(self):
        """
        Step through 1 line of code.
        """

    def getPC(self):
        return ( 0x100 * self.pch.getValue() ) + self.pcl.getValue()

    def setPC(self, new_value):

        hi8 = ( new_value - ( new_value % 0x100 ) ) // 0x100
        lo8 = ( new_value % 0x100 )

        self.pch.setValue(hi8)
        self.pcl.setValue(lo8)

    def getSP(self):
        return ( 0x100 * self.sph.getValue() ) + self.spl.getValue()

    def setSP(self, new_value):

        hi8 = ( new_value - ( new_value % 0x100 ) ) // 0x100
        lo8 = ( new_value % 0x100 )

        self.sph.setValue(hi8)
        self.spl.setValue(lo8)

    def incSP(self):
        self.setSP( self.getSP() + 1 )

    def decSP(self):
        self.setSP( self.getSP() - 1 )

    def convertPmemToksToCode(self, toks):
        """
        Takes a line as tokens and converts it to code.
        """

        if (toks == None) : return '(two line inst.)'

        inst = toks[0].getValue()

        toks_len = len(toks)

        # IF THERE'S NO ARGUMENTS
        if ( toks_len == 1 ): return inst

        args = toks[1:]

        # IF THERE'S 1 ARGUMENT
        if ( toks_len == 2 ):

            arg1 = str( args[0].getValue() ) # value of the argument

            if ( args[0].getType() == 'REG' ): arg1 = 'R' + arg1

            return f'{inst} {arg1}'

        # IF THERE'S 2 ARGUMENTS
        arg1 = str( args[0].getValue() ) # value of the argument
        if ( args[0].getType() == 'REG' ): arg1 = 'R' + arg1

        arg2 = str( args[1].getValue() ) # value of the argument
        if ( args[1].getType() == 'REG' ): arg2 = 'R' + arg2

        return f'{inst} {arg1}, {arg2}'




def run():

    ##### GETTING FILE #####
    # Get filename another way later
    filename = "a1q6.asm"

    with open(filename) as f:
        txt = f.read()

    ##### Tokenizing #####   
    lexer = Lexer(txt)

    ##### Parsing ##### 
    parser = Parser(lexer.getTokenLines(), lexer.getLineNumbers())

    ##### Interpreting #####
    interpreter = Interpreter(parser.dmem, parser.pmem)

if __name__ == "__main__":
    run()




